import { afterEach, describe, expect, it, vi } from "vitest";
import {
  buildCommands,
  LANGUAGES,
  mapRunResult,
  runOnGoJudge,
  type GoJudgeConfig,
  type GoJudgeResult,
} from "./go-judge";
import { runnerKind } from "./index";
import { RUN_STATUS, RunnerUnavailableError, type RunRequest } from "./types";

const config: GoJudgeConfig = {
  url: "http://gj.test",
  authToken: "secret",
  path: "/usr/local/bin:/usr/bin:/bin",
  tsTypeRoots: "/types",
};

const req = (language: string, sourceCode = "code"): RunRequest => ({
  language,
  sourceCode,
  stdin: "3\n0\n",
  cpuTimeLimitSeconds: 2,
  memoryLimitMb: 64,
});

describe("languages.json", () => {
  it("defines every supported language with artifacts for compiled ones", () => {
    expect(Object.keys(LANGUAGES).sort()).toEqual(["c", "cpp", "java", "javascript", "python", "rust", "typescript"]);
    for (const spec of Object.values(LANGUAGES)) {
      if (spec.build) expect(spec.artifacts.length).toBeGreaterThan(0);
      else expect(spec.artifacts).toEqual([]);
    }
  });
});

describe("buildCommands", () => {
  it("runs interpreted languages in one step with the exercise limits", () => {
    const { build, run, sourceFiles } = buildCommands(config, LANGUAGES.python, req("python", "print(1)"));
    expect(build).toBeNull();
    const cmd = run(sourceFiles);
    expect(cmd.args).toEqual(["python3", "-I", "main.py"]);
    expect(cmd.copyIn).toEqual({ "main.py": { content: "print(1)" } });
    expect(cmd.files[0]).toEqual({ content: "3\n0\n" });
    expect(cmd.cpuLimit).toBe(2e9);
    expect(cmd.memoryLimit).toBe(64 * 1024 * 1024);
    expect(cmd.env).toContain("PATH=/usr/local/bin:/usr/bin:/bin");
  });

  it("builds compiled languages first and caches the artifacts", () => {
    const { build } = buildCommands(config, LANGUAGES.c, req("c"));
    expect(build?.args[0]).toBe("gcc");
    expect(build?.copyOutCached).toEqual(["prog"]);
    expect(build?.copyIn).toEqual({ "main.c": { content: "code" } });
  });

  it("generates a tsconfig with the configured type roots for TypeScript", () => {
    const { build } = buildCommands(config, LANGUAGES.typescript, req("typescript"));
    const tsconfig = JSON.parse((build?.copyIn["tsconfig.json"] as { content: string }).content);
    expect(tsconfig.compilerOptions.typeRoots).toEqual(["/types"]);
    expect(tsconfig.compilerOptions.strict).toBe(true);
  });

  it("gives Java more memory and processes", () => {
    const { run } = buildCommands(config, LANGUAGES.java, req("java"));
    const cmd = run({ "main.jar": { fileId: "x" } });
    expect(cmd.memoryLimit).toBe(4 * 64 * 1024 * 1024);
    expect(cmd.procLimit).toBe(128);
  });
});

describe("mapRunResult", () => {
  const r = (status: string, extra: Partial<GoJudgeResult> = {}): GoJudgeResult => ({
    status,
    time: 12_000_000,
    memory: 2048,
    files: { stdout: "out", stderr: "err" },
    ...extra,
  });

  it.each([
    ["Accepted", RUN_STATUS.ACCEPTED, "Accepted"],
    ["Time Limit Exceeded", RUN_STATUS.TIME_LIMIT_EXCEEDED, "Time Limit Exceeded"],
    ["Nonzero Exit Status", RUN_STATUS.RUNTIME_ERROR_NZEC, "Runtime Error (NZEC)"],
    ["Memory Limit Exceeded", RUN_STATUS.RUNTIME_ERROR_OTHER, "Runtime Error (Memory Limit Exceeded)"],
    ["Signalled", RUN_STATUS.RUNTIME_ERROR_OTHER, "Runtime Error (Signalled)"],
    ["Dangerous Syscall", RUN_STATUS.RUNTIME_ERROR_OTHER, "Runtime Error (Dangerous Syscall)"],
  ])("%s", (status, id, description) => {
    expect(mapRunResult(r(status))).toMatchObject({ statusId: id, statusDescription: description, stdout: "out", timeMs: 12, memoryKb: 2 });
  });

  it("throws on internal errors so the job is retried", () => {
    expect(() => mapRunResult(r("Internal Error", { error: "boom" }))).toThrow(RunnerUnavailableError);
    expect(() => mapRunResult(r("File Error"))).toThrow(RunnerUnavailableError);
  });
});

describe("runOnGoJudge", () => {
  afterEach(() => vi.unstubAllGlobals());

  function stubFetch(responses: GoJudgeResult[]) {
    const calls: { url: string; init?: RequestInit }[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string, init?: RequestInit) => {
        calls.push({ url, init });
        if (init?.method === "DELETE") return new Response(null, { status: 200 });
        return new Response(JSON.stringify([responses.shift()]), { status: 200 });
      }),
    );
    return calls;
  }

  it("compiles, runs with the cached artifact and deletes it afterwards", async () => {
    const calls = stubFetch([
      { status: "Accepted", fileIds: { prog: "abc" }, files: { stdout: "", stderr: "" } },
      { status: "Accepted", time: 1e6, memory: 1024, files: { stdout: "Summa: 3\n", stderr: "" } },
    ]);
    const result = await runOnGoJudge(config, req("c"));
    expect(result).toMatchObject({ statusId: RUN_STATUS.ACCEPTED, stdout: "Summa: 3\n" });

    const runBody = JSON.parse(calls[1].init?.body as string);
    expect(runBody.cmd[0].copyIn).toEqual({ prog: { fileId: "abc" } });
    expect(calls[0].init?.headers).toMatchObject({ Authorization: "Bearer secret" });
    expect(calls.at(-1)).toMatchObject({ url: "http://gj.test/file/abc", init: { method: "DELETE" } });
  });

  it("reports a failed build as a compilation error with the compiler output", async () => {
    stubFetch([{ status: "Nonzero Exit Status", files: { stdout: "", stderr: "main.c:1: error: expected ';'" } }]);
    const result = await runOnGoJudge(config, req("c"));
    expect(result).toMatchObject({ statusId: RUN_STATUS.COMPILATION_ERROR, compileOutput: "main.c:1: error: expected ';'" });
  });

  it("treats an unreachable go-judge as unavailable", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => Promise.reject(new Error("ECONNREFUSED"))));
    await expect(runOnGoJudge(config, req("python"))).rejects.toThrow(RunnerUnavailableError);
  });
});

describe("runnerKind", () => {
  it("defaults to go-judge and accepts judge0", () => {
    expect(runnerKind(undefined)).toBe("go-judge");
    expect(runnerKind("judge0")).toBe("judge0");
    expect(() => runnerKind("piston")).toThrow(/Unknown RUNNER/);
  });
});
