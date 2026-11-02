import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

// The optional walk-through of the exercise page: starts from its button, can be ended at
// any step, and can be switched off in Asetukset.
test.beforeEach(async ({ page }) => {
  const res = await page.request.post("/api/dev-login", { data: { email: `e2e-tour-${Date.now()}@example.test` } });
  expect(res.ok()).toBe(true);
  await page.goto("/exercises/01-tervehdys");
});

test("the tour explains the required parts one at a time and can be ended with Esc", async ({ page }) => {
  const start = page.getByRole("button", { name: "Esittely: näin teet tehtävän" });
  await start.click();

  const panel = page.getByRole("dialog", { name: "Tehtävänanto" });
  await expect(panel).toContainText("Vaihe 1 / 5");
  await expect(page.locator('[data-tour="assignment"]')).toHaveClass(/kp-tour-target/);
  const axe = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
  expect(axe.violations.map((v) => v.id)).toEqual([]);

  await panel.getByRole("button", { name: "Seuraava" }).click();
  await page.getByRole("dialog", { name: "Editori" }).getByRole("button", { name: "Seuraava" }).click();
  const lines = page.getByRole("dialog", { name: "Rivinumerot" });
  await expect(lines).toContainText("eivät ole osa koodia");
  await expect(page.locator('[data-tour="editor"] .cm-gutters')).toHaveClass(/kp-tour-target/);
  await lines.getByRole("button", { name: "Edellinen" }).click();
  await expect(page.getByRole("dialog", { name: "Editori" })).toBeVisible();

  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.locator(".kp-tour-target")).toHaveCount(0);
  await expect(start).toBeFocused();
});

test("the last step ends the tour, and the button can be hidden in Asetukset", async ({ page }) => {
  await page.getByRole("button", { name: "Esittely: näin teet tehtävän" }).click();
  for (let i = 0; i < 4; i++) await page.getByRole("dialog").getByRole("button", { name: "Seuraava" }).click();
  await expect(page.getByRole("dialog", { name: "Testitulokset" })).toBeVisible();
  await page.getByRole("button", { name: "Valmis" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);

  await page.goto("/asetukset");
  await page.getByLabel(/Näytä tehtäväsivulla Esittely-painike/).uncheck();
  await page.getByRole("button", { name: "Tallenna" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Tallennettu" })).toBeVisible({ timeout: 30_000 });
  await page.goto("/exercises/01-tervehdys");
  await expect(page.getByRole("heading", { level: 1, name: "1. Tervehdys" })).toBeVisible();
  await expect(page.getByRole("button", { name: /Esittely/ })).toHaveCount(0);
});
