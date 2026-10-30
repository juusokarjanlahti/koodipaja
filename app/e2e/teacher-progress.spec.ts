import { readFileSync } from "node:fs";
import { join } from "node:path";
import { expect, test, type Browser, type Page } from "@playwright/test";
import { FakePlatform, type FakeUser } from "./fake-lti-platform";

const platform = new FakePlatform();
const otherPlatform = new FakePlatform();
test.beforeAll(async () => {
  await platform.start();
  await otherPlatform.start();
});
test.afterAll(() => {
  platform.stop();
  otherPlatform.stop();
});

const TEACHER = ["http://purl.imsglobal.org/vocab/lis/v2/membership#Instructor"];
const LEARNER = ["http://purl.imsglobal.org/vocab/lis/v2/membership#Learner"];
const solution = readFileSync(join(__dirname, "../../exercises/python/01-tervehdys/solution.py"), "utf8");

async function launch(browser: Browser, on: FakePlatform, user: FakeUser): Promise<Page> {
  const page = await (await browser.newContext()).newPage();
  on.nextUser = user;
  await page.goto(on.loginPath(user));
  await expect(page).toHaveURL(/\/exercises\/01-tervehdys$/);
  return page;
}

async function submit(page: Page, code: string) {
  await page.locator(".cm-content").click();
  await page.keyboard.press("ControlOrMeta+a");
  await page.keyboard.press("Delete");
  await page.keyboard.insertText(code);
  await page.getByRole("button", { name: "Palauta" }).click();
}

test("the teacher sees the course's progress and a student's submissions; others see nothing", async ({ browser }) => {
  const run = platform.run;
  const solver = await launch(browser, platform, { sub: `a-${run}`, name: `Aino ${run}`, roles: LEARNER });
  await submit(solver, solution);
  await expect(solver.getByText(/Kaikki \d+ testiä meni läpi/)).toBeVisible({ timeout: 30_000 });
  const trier = await launch(browser, platform, { sub: `b-${run}`, name: `Bertta ${run}`, roles: LEARNER });
  await submit(trier, 'print("Hei")\n');
  await expect(trier.getByText(/testiä läpi\. Avoinna/)).toBeVisible({ timeout: 30_000 });
  await launch(browser, platform, { sub: `c-${run}`, name: `Cecilia ${run}`, roles: LEARNER });

  // The teacher finds the course from the header link.
  const teacher = await launch(browser, platform, { sub: `t-${run}`, name: `Olli ${run}`, roles: TEACHER });
  await teacher.getByRole("link", { name: "Opettajan näkymä" }).click();
  await teacher.getByRole("link", { name: /Ohjelmoinnin perusteet \(e2e\)/ }).click();
  await expect(teacher).toHaveURL(/\/opettaja\/kurssit\/\d+$/, { timeout: 30_000 });
  const courseUrl = teacher.url();

  const table = teacher.getByRole("table");
  const row = (name: string) => table.getByRole("row", { name: new RegExp(name) });
  await expect(row(`Aino ${run}`).getByRole("cell", { name: "Ratkaistu", exact: false }).last()).toHaveText(/Ratkaistu/);
  await expect(row(`Bertta ${run}`)).toContainText("Yritetty (1)");
  await expect(row(`Cecilia ${run}`)).toContainText("Ei aloitettu");
  await expect(row("Ratkaisseita")).toContainText("33 %");

  // Students falling behind first.
  await teacher.getByRole("link", { name: "vähiten ratkaisseet ensin" }).click();
  await expect(teacher).toHaveURL(/jarjestys=ratkaistu/);
  const names = await table.locator("tbody th").allTextContents();
  expect(names[names.length - 1]).toBe(`Aino ${run}`);

  // One student's submissions with code and test results.
  await row(`Bertta ${run}`).getByRole("link", { name: `Bertta ${run}` }).click();
  await expect(teacher.getByRole("heading", { name: `Bertta ${run}: palautukset` })).toBeVisible({ timeout: 30_000 });
  await expect(teacher).toHaveURL(/\/opiskelijat\/[0-9a-f-]+$/);
  await expect(teacher.getByText('print("Hei")')).toBeVisible();
  await expect(teacher.getByText(/testiä läpi/).first()).toBeVisible();
  await expect(teacher.getByText("Odotettu tuloste").first()).toBeVisible();
  const studentUrl = teacher.url();

  // A student of the course, and a teacher of another course, get 404.
  for (const page of [solver]) {
    expect((await page.goto(courseUrl))?.status()).toBe(404);
    expect((await page.goto(studentUrl))?.status()).toBe(404);
    expect((await page.goto("/opettaja"))?.status()).toBe(404);
  }
  const stranger = await launch(browser, otherPlatform, { sub: `x-${run}`, name: `Vieras ${run}`, roles: TEACHER });
  expect((await stranger.goto(courseUrl))?.status()).toBe(404);
  expect((await stranger.goto(studentUrl))?.status()).toBe(404);
});
