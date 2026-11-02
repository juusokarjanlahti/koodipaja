import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  const res = await page.request.post("/api/dev-login", { data: { email: `e2e-plan-${Date.now()}@example.test` } });
  expect(res.ok()).toBe(true);
  await page.goto("/exercises/04-lukujen-summa");
});

test("early exercises start with a plan scaffold, so there is no button to add one", async ({ page }) => {
  await expect(page.locator(".cm-content")).toContainText("# Suunnitelma:");
  await expect(page.locator(".cm-content")).toContainText("# 1. Aloita summasta 0");
  await expect(page.getByRole("button", { name: "Lisää suunnitelma" })).toHaveCount(0);
});

test("a student can add an empty plan template to break the task down", async ({ page }) => {
  const editor = page.locator(".cm-content");
  await editor.click();
  await page.keyboard.press("ControlOrMeta+a");
  await page.keyboard.press("Delete");
  await page.keyboard.insertText("total = 0\n");

  const button = page.getByRole("button", { name: "Lisää suunnitelma" });
  await button.click();

  await expect(editor).toContainText("# Suunnitelma:");
  await expect(editor).toContainText("# 1.");
  await expect(editor).toContainText("total = 0");
  await expect(button).toHaveCount(0);
});

test("starting over asks first in a dialog, and Peruuta keeps the code", async ({ page }) => {
  const editor = page.locator(".cm-content");
  await editor.click();
  await page.keyboard.press("ControlOrMeta+a");
  await page.keyboard.press("Delete");
  await page.keyboard.insertText("oma = 1\n");

  await page.getByRole("button", { name: "Aloita alusta" }).click();
  const dialog = page.getByRole("dialog", { name: /Aloitetaanko alusta/ });
  await expect(dialog.getByRole("button", { name: "Peruuta" })).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  await expect(editor).toContainText("oma = 1");

  await page.getByRole("button", { name: "Aloita alusta" }).click();
  await dialog.getByRole("button", { name: "Aloita alusta" }).click();
  await expect(editor).toContainText("# Suunnitelma:");
  await expect(editor).not.toContainText("oma = 1");
});
