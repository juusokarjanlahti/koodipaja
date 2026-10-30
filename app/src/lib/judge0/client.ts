import { RUN_STATUS, RunnerUnavailableError, type RunRequest, type RunResult } from "../runner/types";

/**
 * Minimal Judge0 client. Only the endpoint the worker needs.
 * https://ce.judge0.com/ (API reference, self-hosted 1.13.x is compatible)
 */

// Default Judge0 CE 1.13.x language ids. These compilers date from 2020; a custom Judge0
// image with current versions defines its own ids, set with JUDGE0_LANGUAGE_IDS (ADR 0005).
export const DEFAULT_JUDGE0_LANGUAGE_IDS: Record<string, number> = {
  python: 71,
  javascript: 63,
  typescript: 74,
  c: 50,
  cpp: 54,
  java: 62,
  rust: 73,
};

/** Language ids, optionally overridden with JSON in JUDGE0_LANGUAGE_IDS, e.g. {"python":1001}. */
export function judge0LanguageIds(env: string | undefined = process.env.JUDGE0_LANGUAGE_IDS): Record<string, number> {
  if (!env) return DEFAULT_JUDGE0_LANGUAGE_IDS;
  const parsed = JSON.parse(env) as Record<string, unknown>;
  const overrides = Object.fromEntries(
    Object.entries(parsed).filter((entry): entry is [string, number] => Number.isInteger(entry[1])),
  );
  return { ...DEFAULT_JUDGE0_LANGUAGE_IDS, ...overrides };
}

// Status ids and the shared request/result types live in ../runner/types (ADR 0006).
export const JUDGE0_STATUS = RUN_STATUS;
export type { RunRequest, RunResult };

export interface Judge0Config {
  url: string;
  authHeader?: string;
  authToken?: string;
  requestTimeoutMs?: number;
}

/** Kept as an alias so existing callers keep working. */
export const Judge0UnavailableError = RunnerUnavailableError;

const b64 = (s: string) => Buffer.from(s, "utf8").toString("base64");
const unb64 = (s: string | null | undefined) => (s ? Buffer.from(s, "base64").toString("utf8") : "");

export async function runOnJudge0(config: Judge0Config, req: RunRequest): Promise<RunResult> {
  const languageId = judge0LanguageIds()[req.language];
  if (!languageId) throw new Error(`No Judge0 language id for "${req.language}"`);

  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (config.authHeader && config.authToken) headers[config.authHeader] = config.authToken;

  let response: Response;
  try {
    response = await fetch(`${config.url}/submissions?base64_encoded=true&wait=true`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        language_id: languageId,
        source_code: b64(req.sourceCode),
        stdin: b64(req.stdin),
        cpu_time_limit: req.cpuTimeLimitSeconds,
        memory_limit: req.memoryLimitMb * 1024,
        enable_network: false,
      }),
      signal: AbortSignal.timeout(config.requestTimeoutMs ?? 30_000),
    });
  } catch (err) {
    throw new Judge0UnavailableError(`Judge0 request failed: ${(err as Error).message}`);
  }

  if (response.status >= 500 || response.status === 429) {
    throw new Judge0UnavailableError(`Judge0 responded ${response.status}`);
  }
  if (!response.ok) {
    throw new Error(`Judge0 rejected the submission: ${response.status} ${await response.text()}`);
  }

  const body = (await response.json()) as {
    status?: { id: number; description: string };
    stdout?: string | null;
    stderr?: string | null;
    compile_output?: string | null;
    time?: string | null;
    memory?: number | null;
  };

  const statusId = body.status?.id ?? JUDGE0_STATUS.INTERNAL_ERROR;
  if (statusId === JUDGE0_STATUS.INTERNAL_ERROR || statusId === JUDGE0_STATUS.EXEC_FORMAT_ERROR) {
    throw new Judge0UnavailableError(`Judge0 internal error: ${body.status?.description ?? "unknown"}`);
  }

  return {
    statusId,
    statusDescription: body.status?.description ?? "Unknown",
    stdout: unb64(body.stdout),
    stderr: unb64(body.stderr),
    compileOutput: unb64(body.compile_output),
    timeMs: body.time ? Math.round(Number(body.time) * 1000) : null,
    memoryKb: body.memory ?? null,
  };
}

export function judge0ConfigFromEnv(): Judge0Config {
  return {
    url: process.env.JUDGE0_URL ?? "http://127.0.0.1:2358",
    authHeader: process.env.JUDGE0_AUTH_HEADER,
    authToken: process.env.JUDGE0_AUTH_TOKEN,
  };
}
