import { expect, test, type Browser, type Page } from "@playwright/test";
import { FakePlatform, type FakeUser } from "./fake-lti-platform";

// #51: identical "my answer is right" requests are one decision for the teacher, and later
// students with the same answer learn it is already being looked at, or already decided.
const platform = new FakePlatform();
test.beforeAll(() => platform.start());
test.afterAll(() => platform.stop());

const TEACHER = ["http://purl.imsglobal.org/vocab/lis/v2/membership#Instructor"];
const LEARNER = ["http://purl.imsglobal.org/vocab/lis/v2/membership#Learner"];
const VARIANT = 'print("Mikä on nimesi?")\nname = input()\nprint(f"Moikka, {name}!")\n';

async function launch(browser: Browser, user: FakeUser): Promise<Page> {
  const page = await (await browser.newContext()).newPage();
  platform.nextUser = user;
  await page.goto(platform.loginPath(user));
  await expect(page).toHaveURL(/\/exercises\/01-tervehdys$/);
  return page;
}

async function submitVariant(page: Page) {
  await page.locator(".cm-content").click();
  await page.keyboard.press("ControlOrMeta+a");
  await page.keyboard.press("Delete");
  await page.keyboard.insertText(VARIANT);
  await page.getByRole("button", { name: "Palauta" }).click();
  await expect(page.getByText(/testiä läpi\. Avoinna/)).toBeVisible({ timeout: 30_000 });
}

async function openDispute(page: Page) {
  await page.getByRole("button", { name: "Pyydä apua" }).click();
  await page.getByLabel("Mielestäni vastaukseni on oikein").check();
}

test("same answers are one decision, and later students see it before asking", async ({ browser }) => {
  test.setTimeout(150_000);
  const run = platform.run;
  const first = await launch(browser, { sub: `g1-${run}`, name: `Elsa ${run}`, roles: LEARNER });
  await submitVariant(first);
  await openDispute(first);
  await first.getByRole("button", { name: "Lähetä opettajalle" }).click();
  await expect(first.getByRole("status").filter({ hasText: "Pyyntö on lähetetty" })).toBeVisible({ timeout: 15_000 });

  // The second student with the same answer is told the teacher is already looking at it.
  const second = await launch(browser, { sub: `g2-${run}`, name: `Eino ${run}`, roles: LEARNER });
  await submitVariant(second);
  await openDispute(second);
  await expect(second.getByText(/Opettaja katsoo jo täsmälleen samaa vastausta/)).toBeVisible();
  await second.getByRole("button", { name: "Lähetä opettajalle" }).click();
  await expect(second.getByRole("status").filter({ hasText: "Pyyntö on lähetetty" })).toBeVisible({ timeout: 15_000 });

  // The teacher sees one entry for both and answers both at once.
  const teacher = await launch(browser, { sub: `gt-${run}`, name: `Opettaja ${run}`, roles: TEACHER });
  await teacher.getByRole("link", { name: "Opettajan näkymä" }).click();
  await teacher.getByRole("link", { name: /Ohjelmoinnin perusteet \(e2e\)/ }).click();
  await expect(teacher).toHaveURL(/\/opettaja\/kurssit\/\d+$/, { timeout: 30_000 });
  const group = teacher.getByRole("listitem").filter({ hasText: "2 opiskelijaa, sama vastaus" });
  await expect(group).toContainText(`Elsa ${run}`);
  await expect(group).toContainText(`Eino ${run}`);
  await group.getByText("Älä hyväksy").click();
  await group.getByLabel(/Vastaus kaikille 2 opiskelijalle/).fill("Tehtävä pyytää tervehtimään sanalla Hei.");
  await group.getByRole("button", { name: "Lähetä vastaus" }).click();
  await expect(teacher.getByRole("heading", { name: /Avunpyynnöt/ })).toHaveCount(0, { timeout: 30_000 });

  for (const page of [first, second]) {
    await page.reload();
    await expect(page.getByRole("status").filter({ hasText: "Tehtävä pyytää tervehtimään sanalla Hei." })).toBeVisible();
  }

  // A third student with the same answer sees the decision before asking again.
  const third = await launch(browser, { sub: `g3-${run}`, name: `Emma ${run}`, roles: LEARNER });
  await submitVariant(third);
  await openDispute(third);
  await expect(third.getByText("Opettaja on jo katsonut saman vastauksen ja vastasi:")).toBeVisible();
  await expect(third.getByText("Tehtävä pyytää tervehtimään sanalla Hei.")).toBeVisible();
});
