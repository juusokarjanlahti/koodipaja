import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  const res = await page.request.post("/api/dev-login", { data: { email: `e2e-${Date.now()}@example.test` } });
  expect(res.ok()).toBe(true);
  await page.goto("/exercises/01-tervehdys");
});

test("an assignment snippet can be dragged into the editor", async ({ page }) => {
  const editor = page.locator(".cm-content");
  await editor.click();
  await page.keyboard.press("ControlOrMeta+a");
  await page.keyboard.press("Delete");

  await page.locator("[data-snippet]", { hasText: /^Mikä on nimesi\?$/ }).first().dragTo(editor);

  await expect(editor).toContainText("Mikä on nimesi?");
});

test("an assignment snippet can be copied with the keyboard", async ({ page, context }) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  const button = page.getByRole("button", { name: "Kopioi teksti Mikä on nimesi?" });

  await button.focus();
  await page.keyboard.press("Enter");

  await expect(page.getByRole("status").filter({ hasText: "Kopioitu" })).toBeVisible();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe("Mikä on nimesi?");
});
