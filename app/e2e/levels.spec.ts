import { expect, test } from "@playwright/test";

// #93: the level is a word that says what the exercise is for, not a row of dots.
test("exercises show their level in words, explained on the list", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("kurssin ydintaidot, jokaiselle")).toBeVisible();
  await expect(page.getByText("vapaaehtoinen syventävä tehtävä")).toBeVisible();
  await expect(page.getByText("●")).toHaveCount(0);
  const first = page.getByRole("link", { name: /1\. Tervehdys/ });
  await expect(first).toContainText("Perus");

  await page.goto("/exercises/01-tervehdys");
  await expect(page.getByText(/^Perus$/).first()).toBeVisible();
});
