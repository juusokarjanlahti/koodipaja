/**
 * Grading worker. Runs submissions from the queue against Judge0.
 *
 *   npm run worker
 */
import { Worker } from "bullmq";
import { closeDb } from "../src/lib/db";
import { gradeSubmission, judge0Runner, markSubmissionFailed } from "../src/lib/grading/grade";
import { judge0ConfigFromEnv } from "../src/lib/judge0/client";
import { redisConnection, SUBMISSION_QUEUE, type SubmissionJob } from "../src/lib/queue";

const concurrency = Number(process.env.WORKER_CONCURRENCY ?? 4);
const runner = judge0Runner(judge0ConfigFromEnv());

const worker = new Worker<SubmissionJob>(
  SUBMISSION_QUEUE,
  async (job) => {
    await gradeSubmission(job.data.submissionId, runner);
  },
  { connection: redisConnection(), concurrency },
);

worker.on("completed", (job) => console.log(`graded ${job.data.submissionId}`));

worker.on("failed", async (job, err) => {
  if (!job) return;
  const attemptsLeft = (job.opts.attempts ?? 1) - job.attemptsMade;
  console.error(`failed ${job.data.submissionId} (${attemptsLeft} attempts left): ${err.message}`);
  if (attemptsLeft <= 0) await markSubmissionFailed(job.data.submissionId, err.message);
});

console.log(`worker listening on "${SUBMISSION_QUEUE}" with concurrency ${concurrency}`);

async function shutdown() {
  console.log("shutting down");
  await worker.close();
  await closeDb();
  process.exit(0);
}
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
