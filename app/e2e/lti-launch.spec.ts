import { expect, test } from "@playwright/test";
import { APP, FakePlatform } from "./fake-lti-platform";

const platform = new FakePlatform();
test.beforeAll(() => platform.start());
test.afterAll(() => platform.stop());

test("a student launched from the platform lands on the exercise, signed in", async ({ page }) => {
  const user = { sub: `s-${platform.run}`, name: "Aino Opiskelija", roles: ["http://purl.imsglobal.org/vocab/lis/v2/membership#Learner"] };
  platform.nextUser = user;
  await page.goto(platform.loginPath(user));

  await expect(page).toHaveURL(/\/exercises\/01-tervehdys$/);
  await expect(page.getByText("Aino Opiskelija")).toBeVisible();
  await expect(page.getByRole("button", { name: "Palauta" })).toBeVisible();

  // The same platform user is the same Koodipaja user on the next launch.
  await page.context().clearCookies();
  await page.goto(platform.loginPath(user));
  await expect(page.getByText("Aino Opiskelija")).toBeVisible();
});

test("an id_token cannot be replayed", async ({ page }) => {
  const user = { sub: `r-${platform.run}`, name: "Replay Testi", roles: [] };
  platform.nextUser = user;
  await page.goto(platform.loginPath(user));
  await expect(page).toHaveURL(/\/exercises\/01-tervehdys$/);

  const { state, idToken } = platform.issued[platform.issued.length - 1];
  const replay = await page.request.post("/api/lti/launch", {
    form: { state, id_token: idToken },
    headers: { cookie: `kp_lti_${state}=1` },
    maxRedirects: 0,
  });
  expect(replay.status()).toBe(303);
  expect(replay.headers().location).toContain("/lti-virhe?koodi=state");
});

test("a launch without the browser's state cookie is rejected", async ({ page, playwright }) => {
  const user = { sub: `c-${platform.run}`, name: "Ilman Evästettä", roles: [] };
  // Start the login in one client, finish it from another that never got the cookie.
  const other = await playwright.request.newContext({ baseURL: APP });
  const login = await other.get(platform.loginPath(user), { maxRedirects: 0 });
  const auth = new URL(login.headers().location);
  const idToken = platform.idToken(auth.searchParams.get("nonce")!, user);
  await other.dispose();

  const launch = await page.request.post("/api/lti/launch", {
    form: { state: auth.searchParams.get("state")!, id_token: idToken },
    maxRedirects: 0,
  });
  expect(launch.headers().location).toContain("/lti-virhe?koodi=state");

  await page.goto("/lti-virhe?koodi=state");
  await expect(page.getByRole("heading", { name: "Moodle-kirjautuminen ei onnistunut" })).toBeVisible();
  await expect(page.getByText("avaa Koodipaja-aktiviteetti uudelleen")).toBeVisible();
});

test("an unknown platform gets a clear error page", async ({ page }) => {
  await page.goto(`/api/lti/login?iss=${encodeURIComponent("https://unknown.example")}&login_hint=x`);
  await expect(page).toHaveURL(/\/lti-virhe\?koodi=platform$/);
  await expect(page.getByText("Koodipaja ei tunnista Moodlea")).toBeVisible();
});
