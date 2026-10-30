import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  const res = await page.request.post("/api/dev-login", { data: { email: `e2e-plan-${Date.now()}@example.test` } });
  expect(res.ok()).toBe(true);
  await page.goto("/exercises/02-lukujen-summa");
});

test("early exercises start with a plan scaffold, so Suunnittele is disabled", async ({ page }) => {
  await expect(page.locator(".cm-content")).toContainText("# Suunnitelma:");
  await expect(page.locator(".cm-content")).toContainText("# 1. Aloita summasta 0");
  await expect(page.getByRole("button", { name: "Suunnittele" })).toBeDisabled();
});

test("a student can add an empty plan template to break the task down", async ({ page }) => {
  const editor = page.locator(".cm-content");
  await editor.click();
  await page.keyboard.press("ControlOrMeta+a");
  await page.keyboard.press("Delete");
  await page.keyboard.insertText("total = 0\n");

  const button = page.getByRole("button", { name: "Suunnittele" });
  await button.click();

  await expect(editor).toContainText("# Suunnitelma:");
  await expect(editor).toContainText("# 1.");
  await expect(editor).toContainText("total = 0");
  await expect(button).toBeDisabled();
});
