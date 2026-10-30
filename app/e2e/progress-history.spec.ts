import { expect, test } from "@playwright/test";

async function setCode(page: import("@playwright/test").Page, code: string) {
  const editor = page.locator(".cm-content");
  await editor.click();
  await page.keyboard.press("ControlOrMeta+a");
  await page.keyboard.press("Delete");
  await page.keyboard.insertText(code);
}

test("progress shows on the exercise list and earlier submissions can be reopened", async ({ page }) => {
  const res = await page.request.post("/api/dev-login", { data: { email: `e2e-prog-${Date.now()}@example.test` } });
  expect(res.ok()).toBe(true);

  await page.goto("/");
  const python = page.locator("section", { has: page.getByRole("heading", { name: "Python" }) });
  // Read the total from the page so adding exercises never breaks this test.
  const progress = python.getByText(/^Ratkaistu \d+ \/ \d+$/);
  await expect(progress).toHaveText(/^Ratkaistu 0 \/ \d+$/);
  const total = Number((await progress.textContent())?.match(/\/ (\d+)/)?.[1]);
  expect(total).toBeGreaterThan(0);

  // First attempt does not pass yet.
  await page.goto("/exercises/01-tervehdys");
  await setCode(page, 'print("Hei")\n');
  await page.getByRole("button", { name: "Palauta" }).click();
  await expect(page.getByText(/testiä läpi\. Avoinna/)).toBeVisible({ timeout: 30_000 });

  await page.goto("/");
  await expect(python.getByText("Kesken")).toBeVisible();

  // Second attempt solves it.
  await page.goto("/exercises/01-tervehdys");
  await setCode(page, 'nimi = input("Mikä on nimesi? ")\nprint(f"Hei, {nimi}!")\n');
  await page.getByRole("button", { name: "Palauta" }).click();
  await expect(page.getByText(/Kaikki 4 testiä meni läpi/)).toBeVisible({ timeout: 30_000 });

  // Reopen the first attempt from the history and restore its code.
  await page.getByRole("button", { name: /Aiemmat palautukset \(2\)/ }).click();
  const items = page.locator("#submission-history li");
  await expect(items).toHaveCount(2);
  await expect(items.first()).toContainText("Kaikki 4 testiä läpi");
  await items.nth(1).getByRole("button", { name: "Näytä" }).click();
  await expect(page.getByText(/Näytät aiempaa palautusta/)).toBeVisible();
  page.once("dialog", (d) => void d.accept());
  await page.getByRole("button", { name: "Palauta tämä koodi editoriin" }).click();
  await expect(page.locator(".cm-content")).toContainText('print("Hei")');

  await page.goto("/");
  await expect(progress).toHaveText(`Ratkaistu 1 / ${total}`);
  await expect(python.getByText("✓ Ratkaistu")).toBeVisible();
});
