import { expect, test, type Browser, type Page } from "@playwright/test";
import { FakePlatform, type FakeUser } from "./fake-lti-platform";

// #50: the teacher accepts an output for the whole course, with a logged reason; earlier and
// later submissions with the same output pass; revoking makes them fail again.
const platform = new FakePlatform();
const otherCourse = new FakePlatform();
test.beforeAll(async () => {
  await platform.start();
  await otherCourse.start();
});
test.afterAll(() => {
  platform.stop();
  otherCourse.stop();
});

const TEACHER = ["http://purl.imsglobal.org/vocab/lis/v2/membership#Instructor"];
const LEARNER = ["http://purl.imsglobal.org/vocab/lis/v2/membership#Learner"];
// Prints "Terve" instead of "Hei": a plausible answer the strict check rejects.
const VARIANT = 'print("Mikä on nimesi?")\nname = input()\nprint(f"Terve, {name}!")\n';

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
  await expect(page.getByRole("button", { name: "Palauta" })).toBeEnabled({ timeout: 30_000 });
}

test("an approved output passes for the whole course, with the reason; revoking undoes it", async ({ browser }) => {
  test.setTimeout(180_000);
  const run = platform.run;
  const asker = await launch(browser, platform, { sub: `a1-${run}`, name: `Aada ${run}`, roles: LEARNER });
  await submit(asker, VARIANT);
  await expect(asker.getByText(/testiä läpi\. Seuraava tavoite/)).toBeVisible();

  await asker.getByRole("button", { name: "Pyydä apua" }).click();
  await asker.getByLabel("Mielestäni vastaukseni on oikein").check();
  await asker.getByRole("button", { name: "Lähetä opettajalle" }).click();
  await expect(asker.getByRole("status").filter({ hasText: "Pyyntö on lähetetty" })).toBeVisible({ timeout: 15_000 });

  // The teacher sees the outputs side by side and approves with a reason.
  const teacher = await launch(browser, platform, { sub: `at-${run}`, name: `Opettaja ${run}`, roles: TEACHER });
  await teacher.getByRole("link", { name: "Opettajan näkymä" }).click();
  await teacher.getByRole("link", { name: /Ohjelmoinnin perusteet \(e2e\)/ }).click();
  await expect(teacher).toHaveURL(/\/opettaja\/kurssit\/\d+$/, { timeout: 30_000 });
  const courseUrl = teacher.url();
  const request = teacher.getByRole("listitem").filter({ hasText: `Aada ${run}` });
  await request.getByText(/Hyväksy tämä tuloste koko kurssille/).click();
  await expect(request.getByText("Opiskelijan tuloste").first()).toBeVisible();
  await request.getByLabel(/Perustelu/).fill("Terve on yhtä hyvä tervehdys kuin Hei.");
  await request.getByRole("button", { name: "Hyväksy kurssilla" }).click();
  await expect(teacher.getByRole("heading", { name: /Hyväksytyt vastaukset/ })).toBeVisible({ timeout: 30_000 });

  // The asker's earlier submission now passes, marked as the teacher's decision with the reason.
  await asker.reload();
  await expect(asker.getByRole("status").filter({ hasText: "Opettaja hyväksyi vastauksesi" })).toBeVisible();
  const history = asker.getByRole("button", { name: /Aiemmat palautukset/ });
  await history.click();
  // Re-evaluated: the earlier submission is now fully passing.
  const earlier = asker.locator("#submission-history li").first();
  await expect(earlier).toContainText(/Kaikki \d+ testiä läpi/);
  await earlier.getByRole("button", { name: "Näytä" }).click();
  await expect(asker.getByText("Läpi (opettajan hyväksymä)").first()).toBeVisible();
  await expect(asker.getByText("Terve on yhtä hyvä tervehdys kuin Hei.").first()).toBeVisible();

  // Another student of the course with the same output passes without asking.
  const second = await launch(browser, platform, { sub: `a2-${run}`, name: `Aatu ${run}`, roles: LEARNER });
  await submit(second, VARIANT);
  await expect(second.getByText(/Kaikki \d+ testiä meni läpi/)).toBeVisible();

  // A student of another course is not affected.
  const outsider = await launch(browser, otherCourse, { sub: `o1-${run}`, name: `Olli ${run}`, roles: LEARNER });
  await submit(outsider, VARIANT);
  await expect(outsider.getByText(/testiä läpi\. Seuraava tavoite/)).toBeVisible();

  // Revoking (with a reason) makes the same output fail again, also for earlier submissions.
  await teacher.goto(courseUrl);
  // One approval per failing test case; revoke them all.
  const approvals = teacher.getByRole("region", { name: /Hyväksytyt vastaukset/ }).getByRole("listitem");
  while ((await approvals.count()) > 0) {
    const before = await approvals.count();
    const approval = approvals.first();
    await approval.getByText("Peru hyväksyntä").first().click();
    await approval.getByLabel(/Miksi perut/).fill("Tehtävä edellyttää tervehdystä Hei.");
    await approval.getByRole("button", { name: "Peru hyväksyntä" }).click();
    await expect(approvals).toHaveCount(before - 1, { timeout: 30_000 });
  }
  await second.reload();
  await submit(second, VARIANT);
  await expect(second.getByText(/testiä läpi\. Seuraava tavoite/)).toBeVisible();
});
