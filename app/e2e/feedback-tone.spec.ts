import { expect, test } from "@playwright/test";

test("a failing submission says what does not work yet and explains the error", async ({ page }) => {
  const res = await page.request.post("/api/dev-login", { data: { email: `e2e-tone-${Date.now()}@example.test` } });
  expect(res.ok()).toBe(true);
  await page.goto("/exercises/02-lukujen-summa");

  const editor = page.locator(".cm-content");
  await editor.click();
  await page.keyboard.press("ControlOrMeta+a");
  await page.keyboard.press("Delete");
  // Classic data-type mistake: adding a string to an int.
  await page.keyboard.insertText('total = 0\nn = input()\ntotal = total + n\nprint("Summa:", total)\n');

  await page.getByRole("button", { name: "Palauta" }).click();

  await expect(page.getByText(/testiä läpi\. Avoinna on ensimmäinen testi/)).toBeVisible({ timeout: 30_000 });
  await expect(page.getByText("Ei vielä läpi: virhe ajon aikana").first()).toBeVisible();
  await expect(page.getByText("Merkkijono ja luku eivät yhdisty").first()).toBeVisible();
  await expect(page.getByText(/TypeError/).first()).toBeVisible();
  // No shaming vocabulary.
  await expect(page.getByText(/Väärä|Hylätty/)).toHaveCount(0);
});
