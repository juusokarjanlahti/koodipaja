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

  // "Aja omalla syötteellä": runs return output and are not stored as submissions.
  const runRes = await fetch(`${APP_URL}/api/runs`, {
    method: "POST",
    headers: { "Content-Type": "application/json", cookie },
    body: JSON.stringify({ exerciseId: "01-tervehdys", sourceCode: "print('Hei', input())", stdin: "Aino\n" }),
  });
  const runBody = (await runRes.json()) as { ok?: boolean; stdout?: string; error?: string };
  if (runRes.status !== 200 || !runBody.ok || runBody.stdout?.trim() !== "Hei Aino") {
    console.error(`FAIL  run returned ${runRes.status} ${JSON.stringify(runBody)}`);
    failures++;
  } else {
    console.log("ok    run with own input returns output");
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

    // ADR 0003: formatting-only differences must be accepted (when the exercise is lenient).
    const acceptedDir = path.join(folder, "accepted");
    const acceptedFiles = (await readdir(acceptedDir).catch(() => [] as string[])).filter((f) => f.endsWith(ext)).sort();
    for (const file of acceptedFiles) {
      const result = await submitAndWait(cookie, ex.id, await readFile(path.join(acceptedDir, file), "utf8"));
      const formatting = result.cases.filter((c) => c.judgeStatus === "Formatting Difference").length;
      if (result.status !== "done" || result.passedCount !== result.totalCount) {
        console.error(`FAIL  ${ex.id} accepted/${file} was rejected (${result.passedCount}/${result.totalCount})`);
        failures++;
      } else {
        console.log(`ok    ${ex.id} accepted/${file} passes (${formatting} with formatting difference)`);
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
