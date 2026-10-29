import { JUDGE0_STATUS, type RunResult } from "../judge0/client";
import { outputsMatch } from "./normalise";

export const MAX_STORED_OUTPUT = 4_000;

export interface CaseOutcome {
  passed: boolean;
  judgeStatus: string;
  stdout: string;
  stderr: string;
}

/** Decide whether one test case passed and what to store about it. */
export function evaluateCase(run: RunResult, expectedStdout: string): CaseOutcome {
  const ranCleanly = run.statusId === JUDGE0_STATUS.ACCEPTED;
  const passed = ranCleanly && outputsMatch(run.stdout, expectedStdout);

  let judgeStatus = run.statusDescription;
  if (ranCleanly && !passed) judgeStatus = "Wrong Answer";

  const stderr = run.compileOutput ? `${run.compileOutput}\n${run.stderr}`.trim() : run.stderr;
  return {
    passed,
    judgeStatus,
    stdout: truncate(run.stdout),
    stderr: truncate(stderr),
  };
}

export function truncate(text: string, max = MAX_STORED_OUTPUT): string {
  return text.length > max ? `${text.slice(0, max)}\n… (tuloste katkaistu)` : text;
}
