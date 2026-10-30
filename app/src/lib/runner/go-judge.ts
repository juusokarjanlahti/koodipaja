/**
 * go-judge runner (ADR 0006). https://github.com/criyle/go-judge
 *
 * Compiled languages run in two sandboxed steps: the build step caches its artifacts in
 * go-judge's file store, and the run step copies them in. Build and run commands come from
 * infra/languages.json, the same file scripts/validate.py uses.
 */
import languagesJson from "../../../../infra/languages.json";
import { RUN_STATUS, RunnerUnavailableError, type RunRequest, type RunResult } from "./types";

export interface LanguageSpec {
  ext: string;
  source: string;
  build: string[] | null;
  artifacts: string[];
  run: string[];
  tsconfig?: boolean;
  memoryMultiplier?: number;
  procLimit?: number;
}

export const LANGUAGES: Record<string, LanguageSpec> = Object.fromEntries(
  Object.entries(languagesJson).filter(([name]) => !name.startsWith("$")),
) as Record<string, LanguageSpec>;

export interface GoJudgeConfig {
  url: string;
  authToken?: string;
  /** PATH inside the sandbox; commands in languages.json are resolved through it. */
  path: string;
  /** Where @types/node lives inside the sandbox, for TypeScript. */
  tsTypeRoots: string;
  requestTimeoutMs?: number;
}

export function goJudgeConfigFromEnv(): GoJudgeConfig {
  return {
    url: process.env.GO_JUDGE_URL ?? "http://127.0.0.1:5050",
    authToken: process.env.GO_JUDGE_AUTH_TOKEN,
    path: process.env.GO_JUDGE_PATH ?? "/usr/local/bin:/usr/bin:/bin",
    tsTypeRoots: process.env.GO_JUDGE_TS_TYPE_ROOTS ?? "/usr/local/lib/node_modules/@types",
  };
}

// Limits for the build step, independent of the exercise (compilers are heavy).
const BUILD_CPU_NS = 20e9;
const BUILD_MEMORY = 1024 * 1024 * 1024;
const BUILD_PROCS = 128;
const PIPE_MAX = 64 * 1024;
const DEFAULT_PROCS = 64;
const MIB = 1024 * 1024;

type GoJudgeFile = { content: string } | { fileId: string };

interface GoJudgeCmd {
  args: string[];
  env: string[];
  files: ({ content: string } | { name: string; max: number })[];
  cpuLimit: number;
  clockLimit: number;
  memoryLimit: number;
  procLimit: number;
  copyIn: Record<string, GoJudgeFile>;
  copyOutCached?: string[];
}

export interface GoJudgeResult {
  status: string;
  exitStatus?: number;
  error?: string;
  time?: number;
  memory?: number;
  files?: { stdout?: string; stderr?: string };
  fileIds?: Record<string, string>;
}

export function tsconfigFor(typeRoots: string): string {
  return JSON.stringify({
    compilerOptions: {
      target: "es2022",
      module: "commonjs",
      strict: true,
      outDir: "out",
      types: ["node"],
      typeRoots: [typeRoots],
      skipLibCheck: true,
    },
    files: ["main.ts"],
  });
}

/** Build the go-judge commands for a request. Pure, so it can be unit tested. */
export function buildCommands(config: GoJudgeConfig, spec: LanguageSpec, req: RunRequest) {
  const env = [`PATH=${config.path}`, "HOME=/tmp", "LANG=C.UTF-8", "PYTHONIOENCODING=utf-8"];
  const sourceFiles: Record<string, GoJudgeFile> = { [spec.source]: { content: req.sourceCode } };
  if (spec.tsconfig) sourceFiles["tsconfig.json"] = { content: tsconfigFor(config.tsTypeRoots) };

  const build: GoJudgeCmd | null = spec.build
    ? {
        args: spec.build,
        env,
        files: [{ content: "" }, { name: "stdout", max: PIPE_MAX }, { name: "stderr", max: PIPE_MAX }],
        cpuLimit: BUILD_CPU_NS,
        clockLimit: BUILD_CPU_NS * 2,
        memoryLimit: BUILD_MEMORY,
        procLimit: BUILD_PROCS,
        copyIn: sourceFiles,
        copyOutCached: spec.artifacts,
      }
    : null;

  const cpuNs = Math.round(req.cpuTimeLimitSeconds * 1e9);
  const run = (copyIn: Record<string, GoJudgeFile>): GoJudgeCmd => ({
    args: spec.run,
    env,
    files: [{ content: req.stdin }, { name: "stdout", max: PIPE_MAX }, { name: "stderr", max: PIPE_MAX }],
    cpuLimit: cpuNs,
    // Wall clock covers start-up of heavier runtimes (JVM) and blocking on I/O.
    clockLimit: cpuNs * 3,
    memoryLimit: req.memoryLimitMb * (spec.memoryMultiplier ?? 1) * MIB,
    procLimit: spec.procLimit ?? DEFAULT_PROCS,
    copyIn,
  });

  return { build, run, sourceFiles };
}

/** Map a go-judge status to the app's RunResult. Internal problems throw so the job retries. */
export function mapRunResult(r: GoJudgeResult): RunResult {
  const base = {
    stdout: r.files?.stdout ?? "",
    stderr: r.files?.stderr ?? "",
    compileOutput: "",
    timeMs: r.time !== undefined ? Math.round(r.time / 1e6) : null,
    memoryKb: r.memory !== undefined ? Math.round(r.memory / 1024) : null,
  };
  switch (r.status) {
    case "Accepted":
      return { ...base, statusId: RUN_STATUS.ACCEPTED, statusDescription: "Accepted" };
    case "Time Limit Exceeded":
      return { ...base, statusId: RUN_STATUS.TIME_LIMIT_EXCEEDED, statusDescription: "Time Limit Exceeded" };
    case "Nonzero Exit Status":
      return { ...base, statusId: RUN_STATUS.RUNTIME_ERROR_NZEC, statusDescription: "Runtime Error (NZEC)" };
    case "Memory Limit Exceeded":
    case "Output Limit Exceeded":
    case "Signalled":
    case "Dangerous Syscall":
      return { ...base, statusId: RUN_STATUS.RUNTIME_ERROR_OTHER, statusDescription: `Runtime Error (${r.status})` };
    default:
      throw new RunnerUnavailableError(`go-judge ${r.status}: ${r.error ?? "no details"}`);
  }
}

async function post(config: GoJudgeConfig, cmd: GoJudgeCmd): Promise<GoJudgeResult> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (config.authToken) headers.Authorization = `Bearer ${config.authToken}`;
  let response: Response;
  try {
    response = await fetch(`${config.url}/run`, {
      method: "POST",
      headers,
      body: JSON.stringify({ cmd: [cmd] }),
      signal: AbortSignal.timeout(config.requestTimeoutMs ?? 60_000),
    });
  } catch (err) {
    throw new RunnerUnavailableError(`go-judge request failed: ${(err as Error).message}`);
  }
  if (response.status >= 500 || response.status === 429 || response.status === 401) {
    throw new RunnerUnavailableError(`go-judge responded ${response.status}`);
  }
  if (!response.ok) throw new Error(`go-judge rejected the request: ${response.status} ${await response.text()}`);
  const [result] = (await response.json()) as GoJudgeResult[];
  if (!result) throw new RunnerUnavailableError("go-judge returned no result");
  return result;
}

async function deleteFiles(config: GoJudgeConfig, ids: string[]): Promise<void> {
  const headers: Record<string, string> = {};
  if (config.authToken) headers.Authorization = `Bearer ${config.authToken}`;
  await Promise.allSettled(ids.map((id) => fetch(`${config.url}/file/${id}`, { method: "DELETE", headers })));
}

export async function runOnGoJudge(config: GoJudgeConfig, req: RunRequest): Promise<RunResult> {
  const spec = LANGUAGES[req.language];
  if (!spec) throw new Error(`No language definition for "${req.language}"`);
  const { build, run, sourceFiles } = buildCommands(config, spec, req);

  if (!build) return mapRunResult(await post(config, run(sourceFiles)));

  const built = await post(config, build);
  const fileIds = built.fileIds ?? {};
  try {
    if (built.status !== "Accepted") {
      if (built.status === "Internal Error" || built.status === "File Error") {
        throw new RunnerUnavailableError(`go-judge build ${built.status}: ${built.error ?? ""}`);
      }
      const output = `${built.files?.stdout ?? ""}${built.files?.stderr ?? ""}`.trim();
      return {
        statusId: RUN_STATUS.COMPILATION_ERROR,
        statusDescription: "Compilation Error",
        stdout: "",
        stderr: "",
        compileOutput: built.status === "Time Limit Exceeded" ? `${output}\nKääntäminen kesti liian kauan.`.trim() : output,
        timeMs: null,
        memoryKb: null,
      };
    }
    const copyIn = Object.fromEntries(spec.artifacts.map((name) => [name, { fileId: fileIds[name] } as GoJudgeFile]));
    if (spec.artifacts.some((name) => !fileIds[name])) {
      throw new RunnerUnavailableError("go-judge build did not return every artifact");
    }
    return mapRunResult(await post(config, run(copyIn)));
  } finally {
    await deleteFiles(config, Object.values(fileIds));
  }
}
