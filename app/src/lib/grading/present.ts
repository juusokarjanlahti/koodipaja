import type { Submission, SubmissionResult, TestCase } from "../db/schema";

export interface PresentedCase {
  position: number;
  name: string;
  hidden: boolean;
  passed: boolean | null;
  judgeStatus: string | null;
  // Only included for visible cases:
  stdin?: string;
  expectedStdout?: string;
  stdout?: string | null;
  stderr?: string | null;
}

export interface PresentedSubmission {
  id: string;
  status: Submission["status"];
  passedCount: number;
  totalCount: number;
  errorMessage: string | null;
  cases: PresentedCase[];
}

/**
 * Shape a submission for the student. Hidden cases reveal only their name and
 * pass/fail, never the input, the expected output or the program's output,
 * so they cannot be reverse-engineered by printing.
 */
export function presentSubmission(
  submission: Submission,
  cases: TestCase[],
  results: SubmissionResult[],
): PresentedSubmission {
  const byCase = new Map(results.map((r) => [r.testCaseId, r]));
  return {
    id: submission.id,
    status: submission.status,
    passedCount: submission.passedCount,
    totalCount: submission.totalCount,
    errorMessage: submission.status === "error" ? "Arviointi epäonnistui. Yritä hetken päästä uudelleen." : null,
    cases: [...cases]
      .sort((a, b) => a.position - b.position)
      .map((c) => {
        const r = byCase.get(c.id);
        const base = {
          position: c.position,
          name: c.name,
          hidden: c.hidden,
          passed: r ? r.passed : null,
          judgeStatus: r ? r.judgeStatus : null,
        };
        if (c.hidden) return base;
        return { ...base, stdin: c.stdin, expectedStdout: c.expectedStdout, stdout: r?.stdout ?? null, stderr: r?.stderr ?? null };
      }),
  };
}
