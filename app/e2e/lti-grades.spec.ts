import { readFileSync } from "node:fs";
import { join } from "node:path";
import { expect, test, type Page } from "@playwright/test";
import { FakePlatform } from "./fake-lti-platform";

const platform = new FakePlatform();
test.beforeAll(() => platform.start());
test.afterAll(() => platform.stop());

const solution = readFileSync(join(__dirname, "../../exercises/python/01-tervehdys/solution.py"), "utf8");

async function submit(page: Page, code: string) {
  const editor = page.locator(".cm-content");
  await editor.click();
  await page.keyboard.press("ControlOrMeta+a");
  await page.keyboard.press("Delete");
  await page.keyboard.insertText(code);
  await page.getByRole("button", { name: "Palauta" }).click();
}

test("the best score goes to the platform gradebook and a worse attempt does not lower it", async ({ page }) => {
  const user = { sub: `g-${platform.run}`, name: "Arvo Sana", roles: [], grades: true };
  platform.nextUser = user;
  await page.goto(platform.loginPath(user));
  await expect(page).toHaveURL(/\/exercises\/01-tervehdys$/);

  await submit(page, solution);
  await expect(page.getByText(/Kaikki \d+ testiä meni läpi/)).toBeVisible({ timeout: 30_000 });
  await expect.poll(() => platform.scores.length, { timeout: 30_000 }).toBe(1);
  const first = platform.scores[0];
  expect(first.lineItem).toBe(user.sub);
  expect(first.score).toMatchObject({ userId: user.sub, activityProgress: "Completed", gradingProgress: "FullyGraded" });
  expect(first.score.scoreGiven).toBe(first.score.scoreMaximum);

  await page.reload();
  await submit(page, 'print("ei vielä")\n');
  await expect(page.getByText(/testiä läpi\. Avoinna/)).toBeVisible({ timeout: 30_000 });
  await expect.poll(() => platform.scores.length, { timeout: 30_000 }).toBe(2);
  expect(platform.scores[1].score.scoreGiven).toBe(first.score.scoreMaximum);
  expect(platform.tokenErrors).toEqual([]);
});

test("a student whose activity takes no grades sends nothing", async ({ page }) => {
  const user = { sub: `n-${platform.run}`, name: "Ei Arvosanaa", roles: [] };
  platform.nextUser = user;
  await page.goto(platform.loginPath(user));
  await submit(page, solution);
  await expect(page.getByText(/Kaikki \d+ testiä meni läpi/)).toBeVisible({ timeout: 30_000 });
  // Give the worker time to (not) send anything.
  await page.waitForTimeout(3000);
  expect(platform.scores.filter((s) => s.lineItem === user.sub)).toEqual([]);
});
