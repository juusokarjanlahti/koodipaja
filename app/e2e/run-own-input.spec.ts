import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  const res = await page.request.post("/api/dev-login", { data: { email: `e2e-run-${Date.now()}@example.test` } });
  expect(res.ok()).toBe(true);
  await page.goto("/exercises/02-lukujen-summa");
});

async function setCode(page: import("@playwright/test").Page, code: string) {
  const editor = page.locator(".cm-content");
  await editor.click();
  await page.keyboard.press("ControlOrMeta+a");
  await page.keyboard.press("Delete");
  // insertText avoids the editor's auto-indent so the code is exactly as written.
  await page.keyboard.insertText(code);
}

test("the input is prefilled from the first visible example", async ({ page }) => {
  await expect(page.getByLabel(/Syöte/)).toHaveValue("3\n4\n0\n");
});

test("Aja runs the code with the student's own input without submitting", async ({ page }) => {
  await setCode(
    page,
    "total = 0\nwhile True:\n    n = int(input())\n    if n == 0:\n        break\n    total += n\nprint(f\"Summa: {total}\")\n",
  );
  await page.getByLabel(/Syöte/).fill("10\n20\n0\n");

  await page.getByRole("button", { name: "Aja", exact: true }).click();

  await expect(page.locator("pre", { hasText: "Summa: 30" })).toBeVisible();
  await expect(page.getByText(/Ajo valmis/)).toBeVisible();
  // A run is not a submission: no test results appear.
  await expect(page.getByText(/testiä meni läpi/)).toHaveCount(0);
});

test("runtime errors are shown, and Ctrl+Shift+Enter runs from the editor", async ({ page }) => {
  await page.getByLabel(/Syöte/).fill("kolme\n");
  await setCode(page, "print(int(input()))\n");

  // Focus is in the editor after typing; the shortcut runs without leaving it.
  await page.keyboard.press("ControlOrMeta+Shift+Enter");

  await expect(page.getByText(/ValueError/)).toBeVisible();
  await expect(page.getByText(/Ajonaikainen virhe/)).toBeVisible();
});
