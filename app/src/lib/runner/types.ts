/**
 * Backend-neutral interface for running student code (ADR 0006). Every backend (go-judge,
 * Judge0) maps its own result to RunResult. Status ids follow Judge0's numbering because
 * the rest of the app and stored results already use it.
 */

export const RUN_STATUS = {
  ACCEPTED: 3,
  TIME_LIMIT_EXCEEDED: 5,
  COMPILATION_ERROR: 6,
  RUNTIME_ERROR_NZEC: 11,
  RUNTIME_ERROR_OTHER: 12,
  INTERNAL_ERROR: 13,
  EXEC_FORMAT_ERROR: 14,
} as const;

export interface RunRequest {
  sourceCode: string;
  language: string;
  stdin: string;
  cpuTimeLimitSeconds: number;
  memoryLimitMb: number;
}

export interface RunResult {
  statusId: number;
  statusDescription: string;
  stdout: string;
  stderr: string;
  compileOutput: string;
  timeMs: number | null;
  memoryKb: number | null;
}

export type Runner = (req: RunRequest) => Promise<RunResult>;

/** Infrastructure problem (backend down, 5xx, internal error): the job should be retried. */
export class RunnerUnavailableError extends Error {}
