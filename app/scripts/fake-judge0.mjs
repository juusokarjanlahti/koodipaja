#!/usr/bin/env node
/**
 * FAKE Judge0 for tests and local UI work on machines where Judge0 cannot run.
 *
 * Implements only POST /submissions?base64_encoded=true&wait=true and GET /about.
 * It compiles and runs code (Python, JavaScript, TypeScript, C, C++, Java, Rust) directly
 * on this machine WITHOUT ANY SANDBOX. It binds to 127.0.0.1
 * only. Never expose it to a network and never use it with untrusted code.
 *
 *   node scripts/fake-judge0.mjs            # listens on 127.0.0.1:2358
 */
import { spawn, spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import path from "node:path";

const PORT = Number(process.env.FAKE_JUDGE0_PORT ?? 2358);
const AUTH_HEADER = (process.env.JUDGE0_AUTH_HEADER ?? "").toLowerCase();
const AUTH_TOKEN = process.env.JUDGE0_AUTH_TOKEN ?? "";
// Build and run steps come from infra/languages.json, the same file scripts/validate.py
// and the go-judge runner use (ADR 0006). Judge0 CE 1.13 language ids map to languages.
const SPECS = JSON.parse(readFileSync(new URL("../../infra/languages.json", import.meta.url), "utf8"));
const JUDGE0_IDS = { 71: "python", 63: "javascript", 74: "typescript", 50: "c", 54: "cpp", 62: "java", 73: "rust" };
const TSC = path.resolve("node_modules/.bin/tsc");
const TYPE_ROOTS = path.resolve("node_modules/@types");

/** python3 and tsc resolve to this environment's interpreter and the app's local compiler. */
function resolveCommand(cmd) {
  if (cmd[0] === "tsc") return [TSC, ...cmd.slice(1)];
  return cmd;
}

function build(spec, dir) {
  if (!spec.build) return null;
  if (spec.tsconfig) {
    writeFileSync(
      path.join(dir, "tsconfig.json"),
      JSON.stringify({
        compilerOptions: { target: "es2022", module: "commonjs", strict: true, outDir: "out", types: ["node"], typeRoots: [TYPE_ROOTS], skipLibCheck: true },
        files: ["main.ts"],
      }),
    );
  }
  const cmd = resolveCommand(spec.build);
  const res = spawnSync(cmd[0], cmd.slice(1), { cwd: dir, encoding: "utf8", timeout: 60_000 });
  if (res.status === 0) return null;
  return `${res.stdout ?? ""}${res.stderr ?? ""}`.trim() || "compilation failed";
}

const b64 = (s) => Buffer.from(s, "utf8").toString("base64");
const unb64 = (s) => (s ? Buffer.from(s, "base64").toString("utf8") : "");

function execute({ language_id, source_code, stdin, cpu_time_limit = 2 }) {
  return new Promise((resolve) => {
    const lang = SPECS[JUDGE0_IDS[language_id]];
    if (!lang) return resolve({ status: { id: 14, description: "Exec Format Error" } });

    const dir = mkdtempSync(path.join(tmpdir(), "fake-judge0-"));
    writeFileSync(path.join(dir, lang.source), unb64(source_code));
    const compileError = build(lang, dir);
    if (compileError) {
      rmSync(dir, { recursive: true, force: true });
      return resolve({
        status: { id: 6, description: "Compilation Error" },
        stdout: null,
        stderr: null,
        compile_output: b64(compileError),
        time: null,
        memory: null,
      });
    }

    const started = process.hrtime.bigint();
    const run = resolveCommand(lang.run);
    const child = spawn(run[0], run.slice(1), { cwd: dir, stdio: "pipe", env: { ...process.env, JAVA_TOOL_OPTIONS: "" } });
    let stdout = "";
    let stderr = "";
    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      child.kill("SIGKILL");
    }, cpu_time_limit * 1000);

    child.stdout.on("data", (d) => (stdout += d));
    child.stderr.on("data", (d) => (stderr += d));
    child.stdin.end(unb64(stdin));
    child.on("close", (code) => {
      clearTimeout(timer);
      rmSync(dir, { recursive: true, force: true });
      const seconds = Number(process.hrtime.bigint() - started) / 1e9;
      const status = timedOut
        ? { id: 5, description: "Time Limit Exceeded" }
        : code === 0
          ? { id: 3, description: "Accepted" }
          : { id: 11, description: "Runtime Error (NZEC)" };
      resolve({
        status,
        stdout: b64(stdout),
        stderr: b64(stderr),
        compile_output: null,
        time: seconds.toFixed(3),
        memory: 0,
      });
    });
  });
}

const server = createServer(async (req, res) => {
  const send = (code, body) => {
    res.writeHead(code, { "Content-Type": "application/json" });
    res.end(JSON.stringify(body));
  };
  if (AUTH_HEADER && AUTH_TOKEN && req.headers[AUTH_HEADER] !== AUTH_TOKEN) {
    return send(401, { error: "unauthorized" });
  }
  const url = new URL(req.url ?? "/", "http://localhost");
  if (req.method === "GET" && url.pathname === "/about") {
    return send(200, { version: "fake", warning: "NO SANDBOX" });
  }
  if (req.method === "POST" && url.pathname === "/submissions") {
    let raw = "";
    for await (const chunk of req) raw += chunk;
    try {
      return send(201, await execute(JSON.parse(raw)));
    } catch (err) {
      return send(422, { error: String(err) });
    }
  }
  send(404, { error: "not found" });
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(`fake Judge0 (NO SANDBOX) on http://127.0.0.1:${PORT}`);
});
