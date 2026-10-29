import { Queue } from "bullmq";
import { requireEnv } from "./env";

export const SUBMISSION_QUEUE = "submissions";

export interface SubmissionJob {
  submissionId: string;
}

const globalForQueue = globalThis as unknown as { koodipajaQueue?: Queue<SubmissionJob> };

export function redisConnection() {
  return { url: requireEnv("REDIS_URL"), maxRetriesPerRequest: null };
}

export function getSubmissionQueue(): Queue<SubmissionJob> {
  globalForQueue.koodipajaQueue ??= new Queue<SubmissionJob>(SUBMISSION_QUEUE, {
    connection: redisConnection(),
    defaultJobOptions: {
      attempts: 3,
      backoff: { type: "exponential", delay: 2_000 },
      removeOnComplete: 1_000,
      removeOnFail: 5_000,
    },
  });
  return globalForQueue.koodipajaQueue;
}

export async function enqueueSubmission(submissionId: string): Promise<void> {
  // jobId = submissionId makes enqueueing idempotent.
  await getSubmissionQueue().add("grade", { submissionId }, { jobId: submissionId });
}
