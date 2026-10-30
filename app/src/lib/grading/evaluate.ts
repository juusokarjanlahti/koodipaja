import { RUN_STATUS as JUDGE0_STATUS, type RunResult } from "../runner/types";
import { compareOutput, type OutputMatchMode } from "./normalise";
import { FORMATTING_DIFFERENCE } from "./status";

export { FORMATTING_DIFFERENCE };
export const MAX_STORED_OUTPUT = 4_000;

export interface CaseOutcome {
  passed: boolean;
  judgeStatus: string;
  stdout: string;
  stderr: string;
}

/** Decide whether one test case passed and what to store about it. */
export function evaluateCase(run: RunResult, expectedStdout: string, mode: OutputMatchMode = "lenient"): CaseOutcome {
  const ranCleanly = run.statusId === JUDGE0_STATUS.ACCEPTED;
  const match = ranCleanly ? compareOutput(run.stdout, expectedStdout, mode) : "fail";

  let judgeStatus = run.statusDescription;
  if (ranCleanly) {
    judgeStatus = match === "exact" ? "Accepted" : match === "lenient" ? FORMATTING_DIFFERENCE : "Wrong Answer";
  }

  const stderr = run.compileOutput ? `${run.compileOutput}\n${run.stderr}`.trim() : run.stderr;
  return {
    passed: match !== "fail",
    judgeStatus,
    stdout: truncate(run.stdout),
    stderr: truncate(stderr),
  };
}

export function truncate(text: string, max = MAX_STORED_OUTPUT): string {
  return text.length > max ? `${text.slice(0, max)}\n… (tuloste katkaistu)` : text;
}
