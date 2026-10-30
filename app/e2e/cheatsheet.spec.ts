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

  // The panel on the next exercise is collapsed by default and lists the cards by title.
  // Tall enough that the cheat sheet and the editor are on screen together for the drag.
  await page.setViewportSize({ width: 1280, height: 1400 });
  await page.goto("/exercises/02-lukujen-summa");
  const toggle = page.getByRole("button", { name: /Muistilista \(3\)/ });
  await expect(toggle).toHaveAttribute("aria-expanded", "false");
  await toggle.click();
  const printCard = page.locator('[data-concept="print"]');
  await expect(printCard.getByText("Tulostaminen print()-funktiolla")).toBeVisible();
  // Closed: only the title, so the student scans past what they already know.
  await expect(printCard.getByLabel(/Oma muistiinpano/)).toBeHidden();

  // Opening a card shows the example, which drags into the editor like assignment code.
  await printCard.getByText("Tulostaminen print()-funktiolla").click();
  const example = printCard.locator("pre[data-snippet]");
  await expect(example).toBeVisible();
  const exampleText = (await example.textContent())!.split("\n")[0];
  const nextEditor = page.locator(".cm-content");
  await nextEditor.click();
  await page.keyboard.press("ControlOrMeta+a");
  await page.keyboard.press("Delete");
  await example.dragTo(nextEditor);
  await expect(nextEditor).toContainText(exampleText);

  // Search opens the matching cards and hides the rest.
  await page.getByPlaceholder(/Hae/).fill("f-merkki");
  const fCard = page.locator('[data-concept="f-merkkijono"]');
  await expect(fCard.getByLabel(/Oma muistiinpano/)).toBeVisible();
  await expect(printCard).toHaveCount(0);

  // A note is saved and shown on the full cheat sheet page.
  await page.getByPlaceholder(/Hae/).fill("");
  const card = page.locator('[data-concept="input"]');
  await card.getByText(/Syötteen lukeminen/).click();
  await card.getByLabel(/Oma muistiinpano/).fill("input palauttaa aina merkkijonon");
  await card.getByRole("button", { name: "Tallenna" }).click();
  await expect(card.getByRole("status")).toHaveText("Tallennettu");

  // The full page: a topic menu jumps to the topic, cards open on demand.
  await page.goto("/muistilista");
  await page.getByRole("navigation", { name: "Aiheet" }).getByRole("link", { name: /Tulostus ja syöte/ }).click();
  await expect(page).toHaveURL(/#aihe-tulostus-ja-syote$/);
  await expect(page.getByRole("heading", { name: "Tulostus ja syöte" })).toBeVisible();
  const fullCard = page.locator('[data-concept="input"]');
  await expect(fullCard.getByText("✎")).toBeVisible();
  await page.getByRole("button", { name: "Avaa kaikki" }).click();
  await expect(fullCard.getByLabel(/Oma muistiinpano/)).toHaveValue("input palauttaa aina merkkijonon");
  await page.getByRole("button", { name: "Sulje kaikki" }).click();
  await expect(fullCard.getByLabel(/Oma muistiinpano/)).toBeHidden();
});
