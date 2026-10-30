import { expect, test } from "@playwright/test";
import { CLAIM } from "../src/lib/lti/launch";
import { APP, FakePlatform } from "./fake-lti-platform";

const platform = new FakePlatform();
test.beforeAll(() => platform.start());
test.afterAll(() => platform.stop());

const TEACHER = ["http://purl.imsglobal.org/vocab/lis/v2/membership#Instructor"];

test("a teacher chooses exercises in Koodipaja and they go back to Moodle as gradable links", async ({ page }) => {
  const user = { sub: `t-${platform.run}`, name: "Olli Opettaja", roles: TEACHER, deepLink: { acceptMultiple: true } };
  platform.nextUser = user;
  await page.goto(platform.loginPath(user));

  await expect(page.getByRole("heading", { name: "Valitse tehtävät Moodleen" })).toBeVisible();
  // Submitting nothing explains what to do instead of failing.
  await page.getByRole("button", { name: "Lisää Moodleen" }).click();
  await expect(page.getByRole("alert")).toHaveText("Valitse vähintään yksi tehtävä.");

  const python = page.getByRole("group", { name: "Python" });
  await python.getByRole("checkbox").nth(0).check();
  await python.getByRole("checkbox").nth(1).check();
  const chosen = await python.getByRole("checkbox").evaluateAll((boxes) =>
    boxes.filter((b) => (b as HTMLInputElement).checked).map((b) => (b as HTMLInputElement).value),
  );
  await page.getByRole("button", { name: "Lisää Moodleen" }).click();

  await expect(page.getByRole("heading", { name: "Sisältö lisätty" })).toBeVisible();
  expect(platform.deepLinkResponses).toHaveLength(1);
  const response = platform.deepLinkResponses[0];
  expect(response).toMatchObject({
    iss: platform.clientId,
    aud: platform.issuer,
    [CLAIM.messageType]: "LtiDeepLinkingResponse",
    [CLAIM.deploymentId]: "1",
    [CLAIM.data]: `data-${platform.run}`,
  });
  const items = response[CLAIM.contentItems] as { type: string; url: string; lineItem: { scoreMaximum: number } }[];
  expect(items.map((i) => i.url)).toEqual(chosen.map((id) => `${APP}/exercises/${id}`));
  expect(items.every((i) => i.type === "ltiResourceLink" && i.lineItem.scoreMaximum === 100)).toBe(true);
});

test("a single-choice request offers radio buttons", async ({ page }) => {
  const user = { sub: `t1-${platform.run}`, name: "Olli Opettaja", roles: TEACHER, deepLink: { acceptMultiple: false } };
  platform.nextUser = user;
  await page.goto(platform.loginPath(user));
  await expect(page.getByRole("checkbox")).toHaveCount(0);
  await page.getByRole("radio").first().check();
  await page.getByRole("button", { name: "Lisää Moodleen" }).click();
  await expect(page.getByRole("heading", { name: "Sisältö lisätty" })).toBeVisible();
  const last = platform.deepLinkResponses[platform.deepLinkResponses.length - 1];
  expect(last[CLAIM.contentItems]).toHaveLength(1);
});

test("students cannot choose content", async ({ page }) => {
  const user = { sub: `st-${platform.run}`, name: "Aino Opiskelija", roles: [], deepLink: { acceptMultiple: true } };
  platform.nextUser = user;
  await page.goto(platform.loginPath(user));
  await expect(page).toHaveURL(/\/lti-virhe\?koodi=role$/);
  await expect(page.getByText("vain kurssin opettajille")).toBeVisible();
});

test("a forged or expired choice is refused", async ({ page }) => {
  await page.goto("/lti-valitse?valinta=forged.token");
  await expect(page).toHaveURL(/\/lti-virhe\?koodi=choice$/);
});
