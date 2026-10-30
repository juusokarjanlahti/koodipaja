import { expect, test } from "@playwright/test";

test("the cheat sheet fills up from submitted exercises and keeps the student's notes", async ({ page }) => {
  const res = await page.request.post("/api/dev-login", { data: { email: `e2e-cheat-${Date.now()}@example.test` } });
  expect(res.ok()).toBe(true);

  // Empty at first.
  await page.goto("/muistilista");
  await expect(page.getByText(/Muistilista täyttyy itsestään/)).toBeVisible();

  // Submitting an exercise adds the concepts it teaches.
  await page.goto("/exercises/01-tervehdys");
  const editor = page.locator(".cm-content");
  await editor.click();
  await page.keyboard.press("ControlOrMeta+a");
  await page.keyboard.press("Delete");
  await page.keyboard.insertText('nimi = input("Mikä on nimesi? ")\nprint(f"Hei, {nimi}!")\n');
  await page.getByRole("button", { name: "Palauta" }).click();
  await expect(page.getByText(/testiä meni läpi|testiä läpi/)).toBeVisible({ timeout: 30_000 });

  // The panel on the next exercise is collapsed by default and shows the collected cards.
  await page.goto("/exercises/02-lukujen-summa");
  const toggle = page.getByRole("button", { name: /Muistilista \(3\)/ });
  await expect(toggle).toHaveAttribute("aria-expanded", "false");
  await toggle.click();
  await expect(page.getByRole("heading", { name: "Tulostaminen print()-funktiolla" })).toBeVisible();

  // Search filters the cards.
  await page.getByPlaceholder(/Hae/).fill("f-merkki");
  await expect(page.getByRole("heading", { name: "Muotoiltu merkkijono (f-merkkijono)" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Tulostaminen print()-funktiolla" })).toHaveCount(0);

  // A note is saved and shown on the full cheat sheet page, grouped by topic.
  await page.getByPlaceholder(/Hae/).fill("");
  const card = page.locator('[data-concept="input"]');
  await card.getByLabel(/Oma muistiinpano/).fill("input palauttaa aina merkkijonon");
  await card.getByRole("button", { name: "Tallenna" }).click();
  await expect(card.getByRole("status")).toHaveText("Tallennettu");

  await page.goto("/muistilista");
  await expect(page.getByRole("heading", { name: "Tulostus ja syöte" })).toBeVisible();
  await expect(page.locator('[data-concept="input"]').getByLabel(/Oma muistiinpano/)).toHaveValue(
    "input palauttaa aina merkkijonon",
  );
});
