import { asc, eq } from "drizzle-orm";
import { getDb, schema } from "../db";
import { runOnJudge0, type Judge0Config, type RunRequest, type RunResult } from "../judge0/client";
import type { TestCase } from "../db/schema";
import { evaluateCase, type CaseOutcome } from "./evaluate";

export type Runner = (req: RunRequest) => Promise<RunResult>;

export function judge0Runner(config: Judge0Config): Runner {
  return (req) => runOnJudge0(config, req);
}

/**
 * Grade one submission: run every test case, store per-case results, finalise counts.
 * Re-running is safe (old results are replaced), so the queue may retry on failure.
 * Infrastructure errors propagate so the job is retried.
 */
export async function gradeSubmission(submissionId: string, run: Runner): Promise<void> {
  const db = getDb();
  const [submission] = await db
    .select()
    .from(schema.submissions)
    .where(eq(schema.submissions.id, submissionId));
  if (!submission) throw new Error(`Submission ${submissionId} not found`);
  if (submission.status === "done") return;

  const [exercise] = await db
    .select()
    .from(schema.exercises)
    .where(eq(schema.exercises.id, submission.exerciseId));
  if (!exercise) throw new Error(`Exercise ${submission.exerciseId} not found`);

  const cases = await db
    .select()
    .from(schema.testCases)
    .where(eq(schema.testCases.exerciseId, exercise.id))
    .orderBy(asc(schema.testCases.position));

  await db
    .update(schema.submissions)
    .set({ status: "running", totalCount: cases.length })
    .where(eq(schema.submissions.id, submissionId));

  const outcomes: { testCase: TestCase; result: RunResult; outcome: CaseOutcome }[] = [];
  for (const testCase of cases) {
    const result = await run({
      sourceCode: submission.sourceCode,
      language: exercise.language,
      stdin: testCase.stdin,
      cpuTimeLimitSeconds: exercise.timeLimitSeconds,
      memoryLimitMb: exercise.memoryLimitMb,
    });
    outcomes.push({
      testCase,
      result,
      outcome: evaluateCase(result, testCase.expectedStdout, exercise.outputMatch),
    });
  }

  await db.transaction(async (tx) => {
    await tx.delete(schema.submissionResults).where(eq(schema.submissionResults.submissionId, submissionId));
    if (outcomes.length > 0) {
      await tx.insert(schema.submissionResults).values(
        outcomes.map(({ testCase, result, outcome }) => ({
          submissionId,
          testCaseId: testCase.id,
          passed: outcome.passed,
          judgeStatus: outcome.judgeStatus,
          stdout: outcome.stdout,
          stderr: outcome.stderr,
          timeMs: result.timeMs,
          memoryKb: result.memoryKb,
        })),
      );
    }
    await tx
      .update(schema.submissions)
      .set({
        status: "done",
        passedCount: outcomes.filter((o) => o.outcome.passed).length,
        totalCount: outcomes.length,
        finishedAt: new Date(),
      })
      .where(eq(schema.submissions.id, submissionId));
  });
}

export async function markSubmissionFailed(submissionId: string, message: string): Promise<void> {
  await getDb()
    .update(schema.submissions)
    .set({ status: "error", errorMessage: message.slice(0, 1000), finishedAt: new Date() })
    .where(eq(schema.submissions.id, submissionId));
}
