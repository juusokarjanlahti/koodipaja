import { Queue } from "bullmq";
import { and, eq, isNotNull, sql } from "drizzle-orm";
import type { PgUpdateSetSource } from "drizzle-orm/pg-core";
import { getDb, schema } from "../db";
import { redisConnection } from "../queue";
import { accessToken, bestSubmission, postScore, scorePayload } from "./ags";
import { toolPrivateKey } from "./keys";

export const GRADE_QUEUE = "grades";
export type GradeJob = { userId: string; exerciseId: string };
export const GRADE_JOB_ATTEMPTS = 5;

const globalForQueue = globalThis as unknown as { koodipajaGradeQueue?: Queue<GradeJob> };

export function getGradeQueue(): Queue<GradeJob> {
  globalForQueue.koodipajaGradeQueue ??= new Queue<GradeJob>(GRADE_QUEUE, {
    connection: redisConnection(),
    defaultJobOptions: {
      attempts: GRADE_JOB_ATTEMPTS,
      // 2 + 4 + 8 + 16 seconds between attempts.
      backoff: { type: "exponential", delay: 2_000 },
      removeOnComplete: 1_000,
      removeOnFail: 5_000,
    },
  });
  return globalForQueue.koodipajaGradeQueue;
}

/** Grade targets (activities the user launched from that open this exercise and take grades). */
async function targets(userId: string, exerciseId: string) {
  return getDb()
    .select({
      resourceLinkId: schema.ltiGradeSyncs.resourceLinkId,
      platformUserId: schema.ltiGradeSyncs.platformUserId,
      lineItemUrl: schema.ltiResourceLinks.lineItemUrl,
      clientId: schema.ltiPlatforms.clientId,
      authTokenUrl: schema.ltiPlatforms.authTokenUrl,
    })
    .from(schema.ltiGradeSyncs)
    .innerJoin(schema.ltiResourceLinks, eq(schema.ltiResourceLinks.id, schema.ltiGradeSyncs.resourceLinkId))
    .innerJoin(schema.ltiPlatforms, eq(schema.ltiPlatforms.id, schema.ltiResourceLinks.platformId))
    .where(
      and(
        eq(schema.ltiGradeSyncs.userId, userId),
        eq(schema.ltiResourceLinks.exerciseId, exerciseId),
        isNotNull(schema.ltiResourceLinks.lineItemUrl),
      ),
    );
}

/** After grading: queue a grade sync if the submission belongs to an LTI activity that takes grades. */
export async function enqueueGradeSyncForSubmission(submissionId: string): Promise<boolean> {
  const [submission] = await getDb()
    .select({ userId: schema.submissions.userId, exerciseId: schema.submissions.exerciseId })
    .from(schema.submissions)
    .where(eq(schema.submissions.id, submissionId));
  if (!submission || (await targets(submission.userId, submission.exerciseId)).length === 0) return false;
  // One job per submission: each sends the current best score, so sending twice is harmless.
  await getGradeQueue().add("sync", submission);
  return true;
}

function setSync(resourceLinkId: number, userId: string, values: PgUpdateSetSource<typeof schema.ltiGradeSyncs>) {
  return getDb()
    .update(schema.ltiGradeSyncs)
    .set({ ...values, updatedAt: sql`now()` })
    .where(and(eq(schema.ltiGradeSyncs.resourceLinkId, resourceLinkId), eq(schema.ltiGradeSyncs.userId, userId)));
}

/**
 * Sends the user's best score for an exercise to every activity it is graded in. Throws
 * when any send failed so the queue retries; the last attempt marks the row failed.
 */
export async function syncGrades(job: GradeJob, isLastAttempt: boolean, fetchImpl: typeof fetch = fetch): Promise<number> {
  const rows = await targets(job.userId, job.exerciseId);
  if (rows.length === 0) return 0;

  const submissions = await getDb()
    .select({
      passedCount: schema.submissions.passedCount,
      totalCount: schema.submissions.totalCount,
      createdAt: schema.submissions.createdAt,
    })
    .from(schema.submissions)
    .where(
      and(
        eq(schema.submissions.userId, job.userId),
        eq(schema.submissions.exerciseId, job.exerciseId),
        eq(schema.submissions.status, "done"),
      ),
    );
  const best = bestSubmission(submissions);
  if (!best) return 0;

  const key = toolPrivateKey();
  const errors: string[] = [];
  let sent = 0;
  for (const row of rows) {
    try {
      if (!key) throw new Error("LTI_PRIVATE_KEY is not configured");
      await setSync(row.resourceLinkId, job.userId, { status: "pending", attempts: sql`${schema.ltiGradeSyncs.attempts} + 1` });
      const token = await accessToken(row, key, undefined, fetchImpl);
      await postScore(row.lineItemUrl!, token, scorePayload(row.platformUserId, best.passedCount, best.totalCount), fetchImpl);
      await setSync(row.resourceLinkId, job.userId, {
        status: "sent",
        scoreGiven: best.passedCount,
        scoreMaximum: best.totalCount,
        attempts: 0,
        lastError: null,
        sentAt: new Date(),
      });
      sent++;
    } catch (error) {
      const message = (error as Error).message.slice(0, 500);
      errors.push(message);
      await setSync(row.resourceLinkId, job.userId, { status: isLastAttempt || !key ? "failed" : "pending", lastError: message });
    }
  }
  if (errors.length > 0 && key) throw new Error(`grade sync failed for ${errors.length} activity(ies): ${errors[0]}`);
  return sent;
}

/** Queues every failed grade transfer of one course again; returns how many were queued. */
export async function retryFailedGrades(courseId: number): Promise<number> {
  const failed = await getDb()
    .select({ userId: schema.ltiGradeSyncs.userId, exerciseId: schema.ltiResourceLinks.exerciseId })
    .from(schema.ltiGradeSyncs)
    .innerJoin(schema.ltiResourceLinks, eq(schema.ltiResourceLinks.id, schema.ltiGradeSyncs.resourceLinkId))
    .where(
      and(
        eq(schema.ltiResourceLinks.courseId, courseId),
        eq(schema.ltiGradeSyncs.status, "failed"),
        isNotNull(schema.ltiResourceLinks.exerciseId),
      ),
    );
  // One job per student and exercise: a job sends to every activity of that exercise.
  const unique = new Map(failed.map((f) => [`${f.userId}/${f.exerciseId}`, { userId: f.userId, exerciseId: f.exerciseId! }]));
  for (const job of unique.values()) await getGradeQueue().add("sync", job);
  return unique.size;
}
