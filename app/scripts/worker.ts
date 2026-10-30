/**
 * Worker. Grades submissions and executes "Aja" runs on Judge0.
 *
 *   npm run worker
 */
import { Worker } from "bullmq";
import { closeDb } from "../src/lib/db";
import { gradeSubmission, markSubmissionFailed } from "../src/lib/grading/grade";
import { runnerFromEnv, runnerKind, type RunRequest } from "../src/lib/runner";
import { redisConnection, SUBMISSION_QUEUE, type SubmissionJob } from "../src/lib/queue";
import { toRunOutput, type RunOutput } from "../src/lib/runs/output";
import { RUN_QUEUE } from "../src/lib/runs/queue";

const concurrency = Number(process.env.WORKER_CONCURRENCY ?? 4);
const runner = runnerFromEnv();

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

// "Aja omalla syötteellä": result goes back to the waiting API request, nothing is stored.
const runWorker = new Worker<RunRequest, RunOutput>(
  RUN_QUEUE,
  async (job) => toRunOutput(await runner(job.data)),
  { connection: redisConnection(), concurrency },
);
runWorker.on("failed", (_job, err) => console.error(`run failed: ${err.message}`));

console.log(
  `worker listening on "${SUBMISSION_QUEUE}" and "${RUN_QUEUE}" with concurrency ${concurrency}, runner ${runnerKind()}`,
);

async function shutdown() {
  console.log("shutting down");
  await Promise.all([worker.close(), runWorker.close()]);
  await closeDb();
  process.exit(0);
}
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
