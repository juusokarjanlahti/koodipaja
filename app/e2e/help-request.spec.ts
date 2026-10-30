import { expect, test, type Browser, type Page } from "@playwright/test";
import { FakePlatform, type FakeUser } from "./fake-lti-platform";

const platform = new FakePlatform();
test.beforeAll(() => platform.start());
test.afterAll(() => platform.stop());

const TEACHER = ["http://purl.imsglobal.org/vocab/lis/v2/membership#Instructor"];
const LEARNER = ["http://purl.imsglobal.org/vocab/lis/v2/membership#Learner"];

async function launch(browser: Browser, user: FakeUser): Promise<Page> {
  const page = await (await browser.newContext()).newPage();
  platform.nextUser = user;
  await page.goto(platform.loginPath(user));
  await expect(page).toHaveURL(/\/exercises\/01-tervehdys$/);
  return page;
}

test("a student asks for help, the teacher answers, and only that student sees the reply", async ({ browser }) => {
  const run = platform.run;
  const asker = await launch(browser, { sub: `h1-${run}`, name: `Hanna ${run}`, roles: LEARNER });
  const other = await launch(browser, { sub: `h2-${run}`, name: `Heikki ${run}`, roles: LEARNER });

  await asker.getByRole("button", { name: "Pyydä apua" }).click();
  await asker.getByLabel("Viesti opettajalle (vapaaehtoinen)").fill("En ymmärrä testiä 1");
  await asker.getByRole("button", { name: "Lähetä opettajalle" }).click();
  await expect(asker.getByRole("status").filter({ hasText: "Pyyntö on lähetetty" })).toBeVisible();

  const teacher = await launch(browser, { sub: `ht-${run}`, name: `Opettaja ${run}`, roles: TEACHER });
  await teacher.getByRole("link", { name: "Opettajan näkymä" }).click();
  await teacher.getByRole("link", { name: /Ohjelmoinnin perusteet \(e2e\)/ }).click();
  const request = teacher.getByRole("listitem").filter({ hasText: `Hanna ${run}` });
  await expect(request).toContainText("En ymmärrä testiä 1");
  await request.getByLabel(/Vastaus opiskelijalle/).fill("Katso rivin 1 tulostus.");
  await request.getByRole("button", { name: "Lähetä vastaus" }).click();
  await expect(teacher.getByRole("heading", { name: /Avunpyynnöt/ })).toHaveCount(0);

  await asker.reload();
  await expect(asker.getByRole("status")).toContainText("Katso rivin 1 tulostus.");
  await other.reload();
  await expect(other.getByText("Katso rivin 1 tulostus.")).toHaveCount(0);
});
