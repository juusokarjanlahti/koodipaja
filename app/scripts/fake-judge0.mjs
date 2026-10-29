#!/usr/bin/env node
/**
 * FAKE Judge0 for tests and local UI work on machines where Judge0 cannot run.
 *
 * Implements only POST /submissions?base64_encoded=true&wait=true and GET /about.
 * It runs Python directly on this machine WITHOUT ANY SANDBOX. It binds to 127.0.0.1
 * only. Never expose it to a network and never use it with untrusted code.
 *
 *   node scripts/fake-judge0.mjs            # listens on 127.0.0.1:2358
 */
import { spawn } from "node:child_process";
import { createServer } from "node:http";

const PORT = Number(process.env.FAKE_JUDGE0_PORT ?? 2358);
const AUTH_HEADER = (process.env.JUDGE0_AUTH_HEADER ?? "").toLowerCase();
const AUTH_TOKEN = process.env.JUDGE0_AUTH_TOKEN ?? "";
const LANGUAGES = { 71: ["python3", "-I", "-c"] };

const b64 = (s) => Buffer.from(s, "utf8").toString("base64");
const unb64 = (s) => (s ? Buffer.from(s, "base64").toString("utf8") : "");

function execute({ language_id, source_code, stdin, cpu_time_limit = 2 }) {
  return new Promise((resolve) => {
    const cmd = LANGUAGES[language_id];
    if (!cmd) return resolve({ status: { id: 14, description: "Exec Format Error" } });

    const started = process.hrtime.bigint();
    const child = spawn(cmd[0], [...cmd.slice(1), unb64(source_code)], { stdio: "pipe" });
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
