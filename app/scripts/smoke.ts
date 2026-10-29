/**
 * End-to-end smoke test against a running stack (app + worker + Judge0 or fake Judge0).
 *
 *   APP_URL=http://localhost:3000 npm run smoke
 *
 * Submits each exercise's reference solution (must pass every case) and each wrong
 * solution (must fail at least one case) through the real HTTP API, and checks that
 * hidden test details never reach the client.
 */
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import type { PresentedSubmission } from "../src/lib/grading/present";
import { findExerciseFolders, LANGUAGE_EXTENSIONS, loadExercise } from "../src/lib/exercises/load";

const APP_URL = process.env.APP_URL ?? "http://localhost:3000";
const exercisesRoot = path.resolve(process.cwd(), "../exercises");

async function login(): Promise<string> {
  const res = await fetch(`${APP_URL}/api/dev-login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: `smoke-${Date.now()}@example.test` }),
  });
  if (!res.ok) throw new Error(`dev login failed: ${res.status}`);
  const cookie = res.headers.get("set-cookie")?.split(";")[0];
  if (!cookie) throw new Error("dev login returned no cookie");
  return cookie;
}

async function submitAndWait(cookie: string, exerciseId: string, sourceCode: string): Promise<PresentedSubmission> {
  const res = await fetch(`${APP_URL}/api/submissions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", cookie },
    body: JSON.stringify({ exerciseId, sourceCode }),
  });
  const body = (await res.json()) as { id?: string; error?: string };
  if (res.status !== 202 || !body.id) throw new Error(`submit failed: ${res.status} ${body.error}`);

  const deadline = Date.now() + 60_000;
  while (Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, 300));
    const poll = await fetch(`${APP_URL}/api/submissions/${body.id}`, { headers: { cookie } });
    const data = (await poll.json()) as PresentedSubmission;
    if (data.status === "done" || data.status === "error") return data;
  }
  throw new Error(`submission ${body.id} did not finish in time`);
}

async function main() {
  const cookie = await login();
  let failures = 0;

  const unauth = await fetch(`${APP_URL}/api/submissions`, { method: "POST", body: "{}" });
  if (unauth.status !== 401) {
    console.error(`FAIL  unauthenticated submit returned ${unauth.status}, expected 401`);
    failures++;
  }

  for (const folder of await findExerciseFolders(exercisesRoot)) {
    const ex = await loadExercise(folder);
    const ext = LANGUAGE_EXTENSIONS[ex.language];
    const hiddenSecrets = ex.cases.filter((c) => c.hidden).map((c) => c.expectedStdout.trim());

    const solution = await readFile(path.join(folder, `solution${ext}`), "utf8");
    const good = await submitAndWait(cookie, ex.id, solution);
    const leaked = hiddenSecrets.some((s) => s && JSON.stringify(good).includes(s));
    if (good.status !== "done" || good.passedCount !== good.totalCount || leaked) {
      console.error(`FAIL  ${ex.id} solution: ${good.status} ${good.passedCount}/${good.totalCount}${leaked ? " (hidden data leaked)" : ""}`);
      failures++;
    } else {
      console.log(`ok    ${ex.id} solution passes ${good.passedCount}/${good.totalCount}`);
    }

    const wrongDir = path.join(folder, "wrong");
    for (const file of (await readdir(wrongDir)).filter((f) => f.endsWith(ext)).sort()) {
      const result = await submitAndWait(cookie, ex.id, await readFile(path.join(wrongDir, file), "utf8"));
      if (result.status !== "done" || result.passedCount === result.totalCount) {
        console.error(`FAIL  ${ex.id} wrong/${file} was not caught (${result.passedCount}/${result.totalCount})`);
        failures++;
      } else {
        console.log(`ok    ${ex.id} wrong/${file} caught (${result.passedCount}/${result.totalCount})`);
      }
    }
  }

  console.log(failures ? `\n${failures} failure(s)` : "\nall smoke checks passed");
  process.exitCode = failures ? 1 : 0;
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
