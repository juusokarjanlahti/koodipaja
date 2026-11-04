import { expect, test } from "@playwright/test";

// Needs DEMO_MODE=true and `npm run seed-demo` (CI runs both before the e2e tests).

test("the demo teacher sees a course in full swing", async ({ page }) => {
  await page.goto("/demo");
  await page.getByRole("button", { name: "Kokeile opettajana" }).click();
  await expect(page).toHaveURL(/\/opettaja\/kurssit\/\d+$/);
  const main = page.getByRole("main");
  await expect(main).toContainText("25 opiskelijaa · 15 tehtävää");

  // Same answer from five students, open help requests, an earlier approval with its reason.
  await expect(main).toContainText("5 opiskelijaa, sama vastaus");
  await expect(main.getByText("Hyväksy tämä tuloste koko kurssille")).toBeVisible();
  await expect(main).toContainText("negatiivinen pariton ei vieläkään mene läpi");
  await expect(main).toContainText("Perustelu: Yksikön saa kirjoittaa auki.");

  // Failed grade transfers can be sent again.
  await expect(main).toContainText("3 arvosanan siirto Moodleen ei onnistunut.");
  await expect(page.getByRole("button", { name: "Lähetä epäonnistuneet uudelleen" })).toBeVisible();

  // Ahead, stuck, behind and not started, side by side.
  const table = page.getByRole("table");
  const row = (name: string) => table.getByRole("row", { name: new RegExp(name) });
  await expect(row("Aino Silmukka")).toContainText("15 / 15");
  await expect(row("Kasper Toisto")).toContainText(/Yritetty \([4-6]\)/);
  await expect(row("Aleksi Kommentti")).toContainText(/[23] \/ 15/);
  await expect(row("Niilo Avain")).toContainText("0 / 15");

  // The newest students first when sorted by fewest solved.
  await page.getByRole("link", { name: "vähiten ratkaisseet ensin" }).click();
  await expect(table.getByRole("row").nth(1)).toContainText("0 / 15");
});

test("a visiting student is not shown to visiting teachers", async ({ browser }) => {
  const student = await (await browser.newContext()).newPage();
  await student.goto("/demo");
  await student.getByRole("button", { name: "Kokeile opiskelijana" }).click();
  const name = await student.getByText(/^Demo-opiskelija [0-9A-F]{4}$/).innerText();

  const teacher = await (await browser.newContext()).newPage();
  await teacher.goto("/demo");
  await teacher.getByRole("button", { name: "Kokeile opettajana" }).click();
  await expect(teacher.getByRole("table")).toBeVisible();
  await expect(teacher.getByRole("main")).not.toContainText(name);
  await expect(teacher.getByRole("main")).not.toContainText("Demo-opiskelija");
});
