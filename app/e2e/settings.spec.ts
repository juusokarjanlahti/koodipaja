import { expect, test } from "@playwright/test";

// #92: the accent colour is a personal setting, saved to the account and applied on every page.
test("a student picks an accent colour and it stays after reload", async ({ page }) => {
  const res = await page.request.post("/api/dev-login", { data: { email: `e2e-accent-${Date.now()}@example.test` } });
  expect(res.ok()).toBe(true);

  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("data-accent", "turkoosi");
  await page.getByRole("link", { name: "Asetukset" }).click();

  const group = page.getByRole("group", { name: "Korostusväri" });
  await expect(group.getByRole("radio", { name: /Turkoosi/ })).toBeChecked();
  await group.getByRole("radio", { name: "Violetti" }).check();
  await page.getByRole("button", { name: "Tallenna" }).click();

  await expect(page.getByRole("status").filter({ hasText: "Tallennettu" })).toBeVisible({ timeout: 30_000 });
  await expect(page.locator("html")).toHaveAttribute("data-accent", "violetti");
  // The filled squares follow the accent.
  const fill = await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue("--fill").trim());
  expect(fill).toBe("#5b3fbf");
  const mark = await page.evaluate(
    () => getComputedStyle(document.querySelector(".kp-wordmark")!, "::after").backgroundColor,
  );
  expect(mark).toBe("rgb(91, 63, 191)");

  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("data-accent", "violetti");
  await page.goto("/asetukset");
  await expect(group.getByRole("radio", { name: "Violetti" })).toBeChecked();
});

test("signed-out visitors get the default accent and a sign-in link on the settings page", async ({ page }) => {
  await page.goto("/asetukset");
  await expect(page.locator("html")).toHaveAttribute("data-accent", "turkoosi");
  await expect(page.getByRole("link", { name: "Kirjaudu sisään" })).toBeVisible();
});
