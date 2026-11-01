import { RUN_STATUS as JUDGE0_STATUS, type RunResult } from "../runner/types";
import { compareOutput, type OutputMatchMode } from "./normalise";
import { outputHash } from "./output-hash";
import { FORMATTING_DIFFERENCE, TEACHER_APPROVED, WRONG_ANSWER } from "./status";

export { FORMATTING_DIFFERENCE, TEACHER_APPROVED, WRONG_ANSWER };
export const MAX_STORED_OUTPUT = 4_000;

export interface CaseOutcome {
  passed: boolean;
  judgeStatus: string;
  stdout: string;
  stderr: string;
  /** Hash of the full output (before truncation) when the program ran cleanly, else null. */
  outputHash: string | null;
}

/** Decide whether one test case passed and what to store about it. */
export function evaluateCase(run: RunResult, expectedStdout: string, mode: OutputMatchMode = "lenient"): CaseOutcome {
  const ranCleanly = run.statusId === JUDGE0_STATUS.ACCEPTED;
  const match = ranCleanly ? compareOutput(run.stdout, expectedStdout, mode) : "fail";

  let judgeStatus = run.statusDescription;
  if (ranCleanly) {
    judgeStatus = match === "exact" ? "Accepted" : match === "lenient" ? FORMATTING_DIFFERENCE : WRONG_ANSWER;
  }

  const stderr = run.compileOutput ? `${run.compileOutput}\n${run.stderr}`.trim() : run.stderr;
  return {
    passed: match !== "fail",
    judgeStatus,
    stdout: truncate(run.stdout),
    stderr: truncate(stderr),
    outputHash: ranCleanly ? outputHash(run.stdout, mode) : null,
  };
}

/**
 * A wrong answer still passes when the course teacher approved exactly this output for
 * this case (#50, docs/specs/help-requests.md). Nothing else is ever relaxed: runtime
 * errors, timeouts and unapproved outputs stay failing.
 */
export function applyApproval(outcome: CaseOutcome, approvedHashes: ReadonlySet<string>): CaseOutcome {
  if (outcome.judgeStatus !== WRONG_ANSWER || !outcome.outputHash || !approvedHashes.has(outcome.outputHash)) {
    return outcome;
  }
  return { ...outcome, passed: true, judgeStatus: TEACHER_APPROVED };
}

export function truncate(text: string, max = MAX_STORED_OUTPUT): string {
  return text.length > max ? `${text.slice(0, max)}\n… (tuloste katkaistu)` : text;
}
