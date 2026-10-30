// Runs the development server and the worker together; Ctrl+C stops both.
//   npm run dev:all
import { spawn } from "node:child_process";

const children = [
  ["web", ["run", "dev"]],
  ["worker", ["run", "worker"]],
].map(([name, args]) => {
  const child = spawn("npm", args, { stdio: ["ignore", "pipe", "pipe"], shell: process.platform === "win32" });
  for (const stream of [child.stdout, child.stderr]) {
    let buffer = "";
    stream.on("data", (chunk) => {
      buffer += chunk;
      const lines = buffer.split("\n");
      buffer = lines.pop();
      for (const line of lines) console.log(`[${name}] ${line}`);
    });
  }
  child.on("exit", (code) => {
    console.log(`[${name}] exited with code ${code}`);
    stop(code ?? 1);
  });
  return child;
});

let stopping = false;
function stop(code) {
  if (stopping) return;
  stopping = true;
  for (const child of children) if (child.exitCode === null) child.kill("SIGTERM");
  setTimeout(() => process.exit(code), 500);
}
process.on("SIGINT", () => stop(0));
process.on("SIGTERM", () => stop(0));
