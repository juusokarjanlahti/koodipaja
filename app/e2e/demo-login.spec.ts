import { expect, test, type Page } from "@playwright/test";

// Needs DEMO_MODE=true (CI sets it). Without it /demo is 404, which the unit tests cover.

const banner = (page: Page) => page.getByRole("note").filter({ hasText: "kaikki tiedot ovat keksittyjä" });

test("a visitor signs in from /demo as a student and lands on the exercises", async ({ page }) => {
  await page.goto("/demo");
  await expect(banner(page)).toBeVisible();
  await page.getByRole("button", { name: "Kokeile opiskelijana" }).click();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole("heading", { name: "Tehtävät" })).toBeVisible();
  await expect(page.getByText(/^Demo-opiskelija [0-9A-F]{4}$/)).toBeVisible();
  await expect(banner(page)).toBeVisible();
  // A student is not the teacher of the demo course.
  await expect(page.getByRole("link", { name: "Opettajan näkymä" })).toHaveCount(0);
});

test("a visitor signs in from /demo as a teacher and lands on the demo course", async ({ page }) => {
  await page.goto("/demo");
  await page.getByRole("button", { name: "Kokeile opettajana" }).click();
  await expect(page).toHaveURL(/\/opettaja\/kurssit\/\d+$/);
  await expect(page.getByRole("heading", { name: /Ohjelmoinnin perusteet \(demo\)/ })).toBeVisible();
  await expect(page.getByText(/^Demo-opettaja [0-9A-F]{4}$/)).toBeVisible();
  await expect(banner(page)).toBeVisible();
});

test("every visitor gets their own user", async ({ browser }) => {
  const names: string[] = [];
  for (let i = 0; i < 2; i++) {
    const page = await (await browser.newContext()).newPage();
    await page.goto("/demo");
    await page.getByRole("button", { name: "Kokeile opiskelijana" }).click();
    names.push(await page.getByText(/^Demo-opiskelija [0-9A-F]{4}$/).innerText());
  }
  expect(names[0]).not.toBe(names[1]);
});

test("the demo sign-in accepts only a role", async ({ request }) => {
  const response = await request.post("/api/demo-login", { form: { role: "admin" }, maxRedirects: 0 });
  expect(response.status()).toBe(303);
  expect(response.headers()["location"]).toMatch(/\/demo$/);
  expect(response.headers()["set-cookie"]).toBeUndefined();
});
