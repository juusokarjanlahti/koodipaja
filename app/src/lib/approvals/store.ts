import { and, asc, desc, eq, inArray } from "drizzle-orm";
import { getDb, schema } from "../db";
import { TEACHER_APPROVED, WRONG_ANSWER } from "../grading/status";
import { enqueueGradeSyncForSubmission } from "../lti/grade-sync";
import { answerKey, keyParts } from "./key";

/**
 * Teacher approval of an output for a course (#50, docs/specs/help-requests.md, step 2).
 * Every approval and revocation is logged in approval_events. Access checks (teacher of
 * the course) are the caller's job; every function here is scoped to one course.
 */

export const MAX_APPROVAL_REASON = 500;

/** Approved output hashes per case position for a student and exercise, over all their courses. */
export async function approvedHashesFor(userId: string, exerciseId: string): Promise<Map<number, Set<string>>> {
  const rows = await getDb()
    .select({ position: schema.approvedOutputs.casePosition, hash: schema.approvedOutputs.outputHash })
    .from(schema.approvedOutputs)
    .innerJoin(schema.courseMemberships, eq(schema.courseMemberships.courseId, schema.approvedOutputs.courseId))
    .where(
      and(
        eq(schema.courseMemberships.userId, userId),
        eq(schema.courseMemberships.role, "student"),
        eq(schema.approvedOutputs.exerciseId, exerciseId),
      ),
    );
  const map = new Map<number, Set<string>>();
  for (const r of rows) map.set(r.position, (map.get(r.position) ?? new Set()).add(r.hash));
  return map;
}

/** The failing, approvable outputs of a submission: cases that ran but printed something else. */
export async function approvableOutputs(submissionId: string) {
  return getDb()
    .select({
      position: schema.testCases.position,
      name: schema.testCases.name,
      hidden: schema.testCases.hidden,
      expected: schema.testCases.expectedStdout,
      stdout: schema.submissionResults.stdout,
      outputHash: schema.submissionResults.outputHash,
    })
    .from(schema.submissionResults)
    .innerJoin(schema.testCases, eq(schema.testCases.id, schema.submissionResults.testCaseId))
    .where(and(eq(schema.submissionResults.submissionId, submissionId), eq(schema.submissionResults.judgeStatus, WRONG_ANSWER)))
    .orderBy(asc(schema.testCases.position));
}

/**
 * Approves every failing output of the request's submission for the course, answers the
 * request and re-evaluates the course's earlier submissions. Returns the number of
 * approved outputs, or null when the request is not an open request of this course.
 */
export async function approveRequest(input: { courseId: number; requestId: string; teacherId: string; reason: string }) {
  const db = getDb();
  const [request] = await db
    .select()
    .from(schema.helpRequests)
    .where(
      and(
        eq(schema.helpRequests.id, input.requestId),
        eq(schema.helpRequests.courseId, input.courseId),
        eq(schema.helpRequests.status, "open"),
      ),
    );
  if (!request?.submissionId) return null;
  const outputs = (await approvableOutputs(request.submissionId)).filter((o) => o.outputHash && o.stdout !== null);
  if (outputs.length === 0) return 0;

  await db.transaction(async (tx) => {
    for (const o of outputs) {
      await tx
        .insert(schema.approvedOutputs)
        .values({
          courseId: input.courseId,
          exerciseId: request.exerciseId,
          casePosition: o.position,
          outputHash: o.outputHash!,
          outputSample: o.stdout!,
          approvedBy: input.teacherId,
          reason: input.reason,
        })
        .onConflictDoNothing();
      await tx.insert(schema.approvalEvents).values({
        courseId: input.courseId,
        exerciseId: request.exerciseId,
        casePosition: o.position,
        outputHash: o.outputHash!,
        action: "approve",
        actorId: input.teacherId,
        submissionId: request.submissionId,
        reason: input.reason,
      });
    }
    await tx
      .update(schema.helpRequests)
      .set({ status: "answered", reply: `Opettaja hyväksyi vastauksesi. Perustelu: ${input.reason}`, answeredAt: new Date() })
      .where(eq(schema.helpRequests.id, request.id));
  });
  await reevaluate(input.courseId, request.exerciseId);
  return outputs.length;
}

/** Revokes one approval of the course; the decision is logged and earlier submissions re-evaluated. */
export async function revokeApproval(input: { courseId: number; approvalId: number; teacherId: string; reason: string }) {
  const db = getDb();
  const [removed] = await db
    .delete(schema.approvedOutputs)
    .where(and(eq(schema.approvedOutputs.id, input.approvalId), eq(schema.approvedOutputs.courseId, input.courseId)))
    .returning();
  if (!removed) return false;
  await db.insert(schema.approvalEvents).values({
    courseId: input.courseId,
    exerciseId: removed.exerciseId,
    casePosition: removed.casePosition,
    outputHash: removed.outputHash,
    action: "revoke",
    actorId: input.teacherId,
    reason: input.reason,
  });
  await reevaluate(input.courseId, removed.exerciseId);
  return true;
}

/**
 * Applies the current approvals to every finished submission of the course's students for
 * the exercise: approved outputs pass, revoked ones fail again. Updates the pass counts
 * and queues grade passback (#25) for every changed submission. Returns how many changed.
 */
export async function reevaluate(courseId: number, exerciseId: string): Promise<number> {
  const db = getDb();
  const students = await db
    .select({ userId: schema.courseMemberships.userId })
    .from(schema.courseMemberships)
    .where(and(eq(schema.courseMemberships.courseId, courseId), eq(schema.courseMemberships.role, "student")));
  const changed: string[] = [];
  for (const { userId } of students) {
    const approved = await approvedHashesFor(userId, exerciseId);
    const rows = await db
      .select({
        id: schema.submissionResults.id,
        submissionId: schema.submissionResults.submissionId,
        judgeStatus: schema.submissionResults.judgeStatus,
        outputHash: schema.submissionResults.outputHash,
        position: schema.testCases.position,
      })
      .from(schema.submissionResults)
      .innerJoin(schema.submissions, eq(schema.submissions.id, schema.submissionResults.submissionId))
      .innerJoin(schema.testCases, eq(schema.testCases.id, schema.submissionResults.testCaseId))
      .where(
        and(
          eq(schema.submissions.userId, userId),
          eq(schema.submissions.exerciseId, exerciseId),
          eq(schema.submissions.status, "done"),
          inArray(schema.submissionResults.judgeStatus, [WRONG_ANSWER, TEACHER_APPROVED]),
        ),
      );
    const touched = new Set<string>();
    for (const r of rows) {
      const shouldPass = !!r.outputHash && !!approved.get(r.position)?.has(r.outputHash);
      const isApproved = r.judgeStatus === TEACHER_APPROVED;
      if (shouldPass === isApproved) continue;
      await db
        .update(schema.submissionResults)
        .set({ passed: shouldPass, judgeStatus: shouldPass ? TEACHER_APPROVED : WRONG_ANSWER })
        .where(eq(schema.submissionResults.id, r.id));
      touched.add(r.submissionId);
    }
    for (const submissionId of touched) {
      const results = await db
        .select({ passed: schema.submissionResults.passed })
        .from(schema.submissionResults)
        .where(eq(schema.submissionResults.submissionId, submissionId));
      await db
        .update(schema.submissions)
        .set({ passedCount: results.filter((x) => x.passed).length })
        .where(eq(schema.submissions.id, submissionId));
      changed.push(submissionId);
    }
    // One grade job per student is enough: it sends the best submission (#25).
    const [first] = [...touched];
    if (first) await enqueueGradeSyncForSubmission(first).catch(() => false);
  }
  return changed.length;
}

/** The course's approvals for the teacher, newest first. */
export async function courseApprovals(courseId: number) {
  return getDb()
    .select({
      id: schema.approvedOutputs.id,
      exerciseId: schema.approvedOutputs.exerciseId,
      exerciseTitle: schema.exercises.title,
      casePosition: schema.approvedOutputs.casePosition,
      outputSample: schema.approvedOutputs.outputSample,
      reason: schema.approvedOutputs.reason,
      approvedBy: schema.users.displayName,
      createdAt: schema.approvedOutputs.createdAt,
    })
    .from(schema.approvedOutputs)
    .innerJoin(schema.exercises, eq(schema.exercises.id, schema.approvedOutputs.exerciseId))
    .leftJoin(schema.users, eq(schema.users.id, schema.approvedOutputs.approvedBy))
    .where(eq(schema.approvedOutputs.courseId, courseId))
    .orderBy(desc(schema.approvedOutputs.createdAt));
}

/** Reasons of approvals that made a student's results pass, by case position (for the student's view). */
export async function approvalReasons(userId: string, exerciseId: string, hashes: { position: number; hash: string }[]) {
  if (hashes.length === 0) return new Map<number, string>();
  const rows = await getDb()
    .select({
      position: schema.approvedOutputs.casePosition,
      hash: schema.approvedOutputs.outputHash,
      reason: schema.approvedOutputs.reason,
    })
    .from(schema.approvedOutputs)
    .innerJoin(schema.courseMemberships, eq(schema.courseMemberships.courseId, schema.approvedOutputs.courseId))
    .where(
      and(
        eq(schema.courseMemberships.userId, userId),
        eq(schema.courseMemberships.role, "student"),
        eq(schema.approvedOutputs.exerciseId, exerciseId),
        inArray(schema.approvedOutputs.outputHash, hashes.map((h) => h.hash)),
      ),
    );
  const map = new Map<number, string>();
  for (const h of hashes) {
    const row = rows.find((r) => r.position === h.position && r.hash === h.hash);
    if (row) map.set(h.position, row.reason);
  }
  return map;
}

// ---- Same answers, one decision (#51) ----

/** The "same answer" key of a submission (see key.ts), or null. */
export async function submissionKey(submissionId: string): Promise<string | null> {
  const failed = await getDb()
    .select({
      position: schema.testCases.position,
      judgeStatus: schema.submissionResults.judgeStatus,
      outputHash: schema.submissionResults.outputHash,
    })
    .from(schema.submissionResults)
    .innerJoin(schema.testCases, eq(schema.testCases.id, schema.submissionResults.testCaseId))
    .where(and(eq(schema.submissionResults.submissionId, submissionId), eq(schema.submissionResults.passed, false)));
  return answerKey(failed, WRONG_ANSWER);
}

/** Approves the same answer for every request in the group (each is answered and logged). */
export async function approveGroup(input: { courseId: number; requestIds: string[]; teacherId: string; reason: string }) {
  let approved = 0;
  for (const requestId of input.requestIds) {
    approved += (await approveRequest({ courseId: input.courseId, requestId, teacherId: input.teacherId, reason: input.reason })) ?? 0;
  }
  return approved;
}

/**
 * Keeps the answer failing and replies to every request in the group with the same text.
 * The decision is logged per output, so later students with the same answer see the reply
 * before they ask again.
 */
export async function rejectGroup(input: { courseId: number; requestIds: string[]; teacherId: string; reply: string }) {
  const db = getDb();
  const requests = await db
    .select()
    .from(schema.helpRequests)
    .where(
      and(
        inArray(schema.helpRequests.id, input.requestIds),
        eq(schema.helpRequests.courseId, input.courseId),
        eq(schema.helpRequests.status, "open"),
      ),
    );
  if (requests.length === 0) return 0;
  const first = requests.find((r) => r.submissionId);
  const key = first?.submissionId ? await submissionKey(first.submissionId) : null;
  await db.transaction(async (tx) => {
    await tx
      .update(schema.helpRequests)
      .set({ status: "answered", reply: input.reply, answeredAt: new Date() })
      .where(inArray(schema.helpRequests.id, requests.map((r) => r.id)));
    if (key && first) {
      for (const part of keyParts(key)) {
        await tx.insert(schema.approvalEvents).values({
          courseId: input.courseId,
          exerciseId: first.exerciseId,
          casePosition: part.position,
          outputHash: part.hash,
          action: "reject",
          actorId: input.teacherId,
          submissionId: first.submissionId,
          reason: input.reply,
        });
      }
    }
  });
  return requests.length;
}

export type SameAnswerStatus = { pending: boolean; rejectedReason: string | null };

/**
 * Before a student sends "my answer is right": is the teacher already looking at the same
 * answer from someone else, or did they already decide to keep it failing (and why)?
 */
export async function sameAnswerStatus(userId: string, courseId: number, exerciseId: string): Promise<SameAnswerStatus> {
  const db = getDb();
  const [latest] = await db
    .select({ id: schema.submissions.id })
    .from(schema.submissions)
    .where(and(eq(schema.submissions.userId, userId), eq(schema.submissions.exerciseId, exerciseId), eq(schema.submissions.status, "done")))
    .orderBy(desc(schema.submissions.createdAt))
    .limit(1);
  const key = latest ? await submissionKey(latest.id) : null;
  if (!key) return { pending: false, rejectedReason: null };

  const open = await db
    .select({ userId: schema.helpRequests.userId, submissionId: schema.helpRequests.submissionId })
    .from(schema.helpRequests)
    .where(
      and(
        eq(schema.helpRequests.courseId, courseId),
        eq(schema.helpRequests.exerciseId, exerciseId),
        eq(schema.helpRequests.status, "open"),
        eq(schema.helpRequests.kind, "kiista"),
      ),
    );
  let pending = false;
  for (const r of open) {
    if (r.userId !== userId && r.submissionId && (await submissionKey(r.submissionId)) === key) {
      pending = true;
      break;
    }
  }

  // Rejected when the latest decision on every output of the answer is a rejection.
  let rejectedReason: string | null = null;
  for (const part of keyParts(key)) {
    const [last] = await db
      .select({ action: schema.approvalEvents.action, reason: schema.approvalEvents.reason })
      .from(schema.approvalEvents)
      .where(
        and(
          eq(schema.approvalEvents.courseId, courseId),
          eq(schema.approvalEvents.exerciseId, exerciseId),
          eq(schema.approvalEvents.casePosition, part.position),
          eq(schema.approvalEvents.outputHash, part.hash),
        ),
      )
      .orderBy(desc(schema.approvalEvents.createdAt), desc(schema.approvalEvents.id))
      .limit(1);
    if (last?.action !== "reject") {
      rejectedReason = null;
      break;
    }
    rejectedReason = last.reason;
  }
  return { pending, rejectedReason };
}
