import { execFileSync } from "node:child_process";
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, test } from "@playwright/test";

// An exercise that leaves Git (removed or renamed) is retired, not deleted: it leaves the
// lists, but its page and the student's submissions stay. It comes back if it returns.
const repo = join(__dirname, "../..");

function importFrom(exercisesRoot: string) {
  execFileSync("npx", ["tsx", "--env-file-if-exists=.env.local", "scripts/import-exercises.ts", exercisesRoot], {
    cwd: join(__dirname, ".."),
    stdio: "pipe",
  });
}

test("an exercise removed from Git leaves the list but keeps its page", async ({ page }) => {
  test.setTimeout(120_000);
  // A JavaScript exercise, so the Python list that other tests count stays the same
  // while this test runs in parallel with them.
  const id = `javascript-e2e-poistuva-${Date.now()}`;
  const tmp = mkdtempSync(join(tmpdir(), "kp-retire-"));
  try {
    cpSync(join(repo, "exercises"), join(tmp, "exercises"), { recursive: true });
    cpSync(join(repo, "concepts"), join(tmp, "concepts"), { recursive: true });
    const folder = join(tmp, "exercises/javascript", id);
    cpSync(join(repo, "exercises/javascript/javascript-lukujen-summa"), folder, { recursive: true });
    const yaml = join(folder, "exercise.yaml");
    writeFileSync(
      yaml,
      readFileSync(yaml, "utf8")
        .replace(/^id: .*$/m, `id: ${id}`)
        .replace(/^title: .*$/m, "title: Poistuva tehtävä"),
    );

    importFrom(join(tmp, "exercises"));
    await page.goto("/");
    await expect(page.getByRole("link", { name: /Poistuva tehtävä/ })).toBeVisible();

    // Back to the real library: the extra exercise is no longer in Git.
    importFrom(join(repo, "exercises"));
    await page.goto("/");
    await expect(page.getByRole("link", { name: /Poistuva tehtävä/ })).toHaveCount(0);
    await page.goto(`/exercises/${id}`);
    await expect(page.getByRole("status").filter({ hasText: "ei ole enää tehtävälistalla" })).toBeVisible();
  } finally {
    // Whatever happened above, leave the database matching the real library.
    importFrom(join(repo, "exercises"));
    rmSync(tmp, { recursive: true, force: true });
  }
});
