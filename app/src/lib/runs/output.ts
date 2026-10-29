import { JUDGE0_STATUS, type RunResult } from "../judge0/client";
import { truncate } from "../grading/evaluate";

/** What the student sees after "Aja". Never stored in the database. */
export interface RunOutput {
  ok: boolean;
  statusDescription: string;
  stdout: string;
  stderr: string;
  timeMs: number | null;
}

export function toRunOutput(result: RunResult): RunOutput {
  const stderr = result.compileOutput ? `${result.compileOutput}\n${result.stderr}`.trim() : result.stderr;
  return {
    ok: result.statusId === JUDGE0_STATUS.ACCEPTED,
    statusDescription: result.statusDescription,
    stdout: truncate(result.stdout),
    stderr: truncate(stderr),
    timeMs: result.timeMs,
  };
}

export const RUNS_PER_MINUTE = 10;
export const MAX_STDIN_BYTES = 16 * 1024;

/**
 * Fixed-window rate limit: at most RUNS_PER_MINUTE runs per user per minute.
 * `incr` increments a counter key that expires after the window and returns the new value.
 */
export async function allowRun(
  incr: (key: string, ttlSeconds: number) => Promise<number>,
  userId: string,
  now = Date.now(),
): Promise<boolean> {
  const window = Math.floor(now / 60_000);
  const count = await incr(`koodipaja:run-rate:${userId}:${window}`, 60);
  return count <= RUNS_PER_MINUTE;
}
