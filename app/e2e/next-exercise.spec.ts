import { readFileSync } from "node:fs";
import { join } from "node:path";
import { expect, test, type Page } from "@playwright/test";

const solution = (id: string) => readFileSync(join(__dirname, `../../exercises/python/${id}/solution.py`), "utf8");

async function submit(page: Page, code: string) {
  await page.locator(".cm-content").click();
  await page.keyboard.press("ControlOrMeta+a");
  await page.keyboard.press("Delete");
  await page.keyboard.insertText(code);
  await page.getByRole("button", { name: "Palauta" }).click();
  await expect(page.getByRole("button", { name: "Palauta" })).toBeEnabled({ timeout: 30_000 });
}

test("solved: go on; stuck: skip to an exercise that does not need this one, then come back", async ({ page }) => {
  const res = await page.request.post("/api/dev-login", { data: { email: `e2e-next-${Date.now()}@example.test` } });
  expect(res.ok()).toBe(true);

  // Solving offers the next exercise.
  await page.goto("/exercises/01-tervehdys");
  await submit(page, solution("01-tervehdys"));
  const next = page.getByRole("navigation", { name: "Seuraava tehtävä" }).getByRole("link");
  await expect(next).toHaveText(/Seuraava tehtävä: .+ →/);
  await next.click();
  await expect(page).toHaveURL(/\/exercises\/02-lukujen-summa$/);

  // Two failed tries: no detour yet. The third one offers other ways forward.
  const ways = page.getByRole("navigation", { name: "Muita tapoja edetä" });
  for (let i = 0; i < 2; i++) await submit(page, 'print("Summa: 0")\n');
  await expect(ways).toHaveCount(0);
  await submit(page, 'print("Summa: 0")\n');
  await expect(ways).toContainText("Jumiin jääminen kuuluu oppimiseen");
  // 12 is the first later exercise that needs nothing 02 is the first to teach.
  await expect(ways.getByRole("link", { name: "Sanan kirjaimet" })).toBeVisible();
  await expect(ways).toContainText("Kertaa tehtävä Tervehdys");

  // Skip, solve, and be pointed back to the unfinished exercise.
  await ways.getByRole("link", { name: "Sanan kirjaimet" }).click();
  await expect(page).toHaveURL(/\/exercises\/12-sanan-kirjaimet$/);
  await submit(page, solution("12-sanan-kirjaimet"));
  const after = page.getByRole("navigation", { name: "Seuraava tehtävä" });
  await expect(after).toContainText("jäi aiemmin kesken");
  await after.getByRole("link", { name: "Lukujen summa" }).click();
  await expect(page).toHaveURL(/\/exercises\/02-lukujen-summa$/);

  // Previous / next links between exercises.
  await expect(page.getByRole("navigation", { name: "Tehtävien välillä" }).getByRole("link", { name: /← Tervehdys/ })).toBeVisible();
});
