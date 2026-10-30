/**
 * Check the configured code runner end to end (ADR 0006).
 *
 *   npm run runner-check            # every exercise + sandbox security probes
 *
 * For every exercise, runs the reference solution, wrong/ and accepted/ solutions through
 * the real runner (RUNNER, default go-judge) and checks them like scripts/validate.py does.
 * Then runs probes that a sandbox must stop: network access, writing outside the work
 * directory, reading host files, fork bombs, memory exhaustion and infinite loops.
 */
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { evaluateCase } from "../src/lib/grading/evaluate";
import { findExerciseFolders, LANGUAGE_EXTENSIONS, loadExercise } from "../src/lib/exercises/load";
import { RUN_STATUS, runnerFromEnv, runnerKind, type RunRequest } from "../src/lib/runner";

const run = runnerFromEnv();
const root = path.resolve(process.cwd(), "../exercises");
let failures = 0;

// In GitHub Actions, failures become annotations so they are visible without the log.
const annotate = (message: string) =>
  process.env.GITHUB_ACTIONS === "true" ? `::error title=runner-check::${message.replace(/%/g, "%25").replace(/\r?\n/g, "%0A")}` : `FAIL  ${message}`;

function fail(message: string) {
  failures++;
  console.error(annotate(message));
}

async function passedCases(req: Omit<RunRequest, "stdin">, cases: { stdin: string; expectedStdout: string }[], mode: "lenient" | "exact") {
  let passed = 0;
  let firstProblem = "";
  for (const c of cases) {
    const result = await run({ ...req, stdin: c.stdin });
    const outcome = evaluateCase(result, c.expectedStdout, mode);
    if (outcome.passed) passed++;
    else if (!firstProblem) firstProblem = `${outcome.judgeStatus}: ${(result.compileOutput || outcome.stderr || outcome.stdout).slice(0, 160)}`;
  }
  return { passed, firstProblem };
}

async function checkExercises() {
  for (const folder of await findExerciseFolders(root)) {
    const ex = await loadExercise(folder);
    const ext = LANGUAGE_EXTENSIONS[ex.language];
    const base = { language: ex.language, cpuTimeLimitSeconds: ex.timeLimitSeconds, memoryLimitMb: ex.memoryLimitMb };
    const total = ex.cases.length;

    const solution = await readFile(path.join(folder, `solution${ext}`), "utf8");
    const s = await passedCases({ ...base, sourceCode: solution }, ex.cases, "exact");
    if (s.passed !== total) fail(`${ex.id} solution ${s.passed}/${total} (${s.firstProblem})`);
    else console.log(`ok    ${ex.id} solution ${total}/${total}`);

    for (const [dir, shouldPass] of [["wrong", false], ["accepted", true]] as const) {
      const files = (await readdir(path.join(folder, dir)).catch(() => [] as string[])).filter((f) => f.endsWith(ext));
      for (const file of files.sort()) {
        const code = await readFile(path.join(folder, dir, file), "utf8");
        const r = await passedCases({ ...base, sourceCode: code }, ex.cases, ex.outputMatch);
        const ok = shouldPass ? r.passed === total : r.passed < total;
        if (!ok) fail(`${ex.id} ${dir}/${file} ${r.passed}/${total}`);
      }
    }
  }
}

/** Probes run as Python; each must NOT print its marker. */
const PROBES: { name: string; code: string; marker: string }[] = [
  {
    name: "network is unreachable",
    code: 'import socket\ntry:\n    socket.create_connection(("1.1.1.1", 80), timeout=3)\n    print("NETWORK-OPEN")\nexcept OSError:\n    pass\n',
    marker: "NETWORK-OPEN",
  },
  {
    name: "host files are not visible",
    code: 'import os\nfor p in ["/etc/shadow", "/etc/passwd", "/root", "/home"]:\n    if os.path.exists(p):\n        print("HOST-VISIBLE", p)\n',
    marker: "HOST-VISIBLE",
  },
  {
    name: "system directories are read-only",
    code: 'for p in ["/usr/pwned", "/bin/pwned", "/opt/koodipaja/bin/pwned"]:\n    try:\n        open(p, "w").write("x")\n        print("WROTE", p)\n    except OSError:\n        pass\n',
    marker: "WROTE",
  },
  {
    name: "process count is limited",
    code: 'import os\ncount = 0\ntry:\n    for _ in range(500):\n        if os.fork() == 0:\n            import time; time.sleep(5); os._exit(0)\n        count += 1\nexcept OSError:\n    pass\nif count >= 500:\n    print("FORKS-UNLIMITED")\n',
    marker: "FORKS-UNLIMITED",
  },
];

async function checkSandbox() {
  const base = { language: "python", stdin: "", cpuTimeLimitSeconds: 2, memoryLimitMb: 64 };
  for (const probe of PROBES) {
    const r = await run({ ...base, sourceCode: probe.code });
    if (r.stdout.includes(probe.marker)) fail(`sandbox: ${probe.name} (${r.stdout.trim().slice(0, 120)})`);
    else console.log(`ok    sandbox: ${probe.name}`);
  }
  const loop = await run({ ...base, sourceCode: "while True:\n    pass\n" });
  if (loop.statusId !== RUN_STATUS.TIME_LIMIT_EXCEEDED) fail(`sandbox: infinite loop gave ${loop.statusDescription}`);
  else console.log("ok    sandbox: infinite loop hits the time limit");
  const mem = await run({ ...base, sourceCode: "x = bytearray(1024 * 1024 * 1024)\nprint('ALLOCATED')\n" });
  if (mem.stdout.includes("ALLOCATED")) fail("sandbox: 1 GiB allocation succeeded with a 64 MiB limit");
  else console.log(`ok    sandbox: memory limit (${mem.statusDescription})`);
}

async function main() {
  console.log(`runner: ${runnerKind()}`);
  await checkExercises();
  if (process.env.SKIP_SANDBOX_PROBES === "1") console.log("skip  sandbox probes (SKIP_SANDBOX_PROBES=1)");
  else await checkSandbox();
  console.log(failures ? `\n${failures} failure(s)` : "\nall runner checks passed");
  process.exitCode = failures ? 1 : 0;
}

main().catch((err) => {
  console.error(annotate(err instanceof Error ? `${err.name}: ${err.message}` : String(err)));
  console.error(err);
  process.exitCode = 1;
});
