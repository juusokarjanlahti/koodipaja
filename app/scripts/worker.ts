/**
 * Worker. Grades submissions, executes "Aja" runs in the sandbox and sends grades to
 * Moodle (LTI AGS).
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
import { enqueueGradeSyncForSubmission, GRADE_JOB_ATTEMPTS, GRADE_QUEUE, syncGrades, type GradeJob } from "../src/lib/lti/grade-sync";

const concurrency = Number(process.env.WORKER_CONCURRENCY ?? 4);
const runner = runnerFromEnv();

const worker = new Worker<SubmissionJob>(
  SUBMISSION_QUEUE,
  async (job) => {
    await gradeSubmission(job.data.submissionId, runner);
    // A grade that cannot be queued must not fail the grading itself.
    await enqueueGradeSyncForSubmission(job.data.submissionId).catch((error: Error) =>
      console.error(`could not queue grade sync for ${job.data.submissionId}: ${error.message}`),
    );
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

// Grades back to Moodle. Few and small, so low concurrency is enough.
const gradeWorker = new Worker<GradeJob>(
  GRADE_QUEUE,
  async (job) => {
    const attempts = job.opts.attempts ?? GRADE_JOB_ATTEMPTS;
    const sent = await syncGrades(job.data, job.attemptsMade + 1 >= attempts);
    if (sent > 0) console.log(`sent ${sent} grade(s) for ${job.data.exerciseId}`);
  },
  { connection: redisConnection(), concurrency: 2 },
);
gradeWorker.on("failed", (_job, err) => console.error(`grade sync: ${err.message}`));

console.log(
  `worker listening on "${SUBMISSION_QUEUE}" and "${RUN_QUEUE}" with concurrency ${concurrency}, runner ${runnerKind()}; grades on "${GRADE_QUEUE}"`,
);

async function shutdown() {
  console.log("shutting down");
  await Promise.all([worker.close(), runWorker.close(), gradeWorker.close()]);
  await closeDb();
  process.exit(0);
}
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
