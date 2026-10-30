import { execFileSync } from "node:child_process";
import { generateKeyPairSync, randomUUID } from "node:crypto";
import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { expect, test } from "@playwright/test";
import { signRs256 } from "../src/lib/lti/jwt";
import { CLAIM } from "../src/lib/lti/launch";
import { publicJwk } from "../src/lib/lti/keys";

// A fake LTI 1.3 platform (a tiny "Moodle") so the whole browser flow runs in CI:
// login initiation -> OIDC auth request -> form_post of a signed id_token -> signed in.

const APP = process.env.APP_URL ?? "http://localhost:3000";
const { privateKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
const jwk = publicJwk(privateKey);
const run = randomUUID().slice(0, 8);
const clientId = `e2e-${run}`;
let platformUrl = "";
let server: Server;
// Who the next auth request signs in as, and every token the platform issued.
let nextUser = { sub: "", name: "", roles: [] as string[] };
const issued: { state: string; idToken: string }[] = [];

const issuer = () => `${platformUrl}/issuer-${run}`;

function idToken(nonce: string, sub: string, name: string, roles: string[]): string {
  const now = Math.floor(Date.now() / 1000);
  return signRs256(
    {
      iss: issuer(),
      aud: clientId,
      sub,
      name,
      exp: now + 300,
      iat: now,
      nonce,
      [CLAIM.deploymentId]: "1",
      [CLAIM.version]: "1.3.0",
      [CLAIM.messageType]: "LtiResourceLinkRequest",
      [CLAIM.resourceLink]: { id: "rl-1" },
      [CLAIM.roles]: roles,
      [CLAIM.context]: { id: "course-1", title: "Ohjelmoinnin perusteet (e2e)" },
      [CLAIM.targetLinkUri]: `${APP}/exercises/01-tervehdys`,
    },
    privateKey,
    jwk.kid,
  );
}

test.beforeAll(async () => {
  server = createServer((req, res) => {
    const url = new URL(req.url ?? "/", platformUrl);
    if (url.pathname === "/jwks") {
      res.setHeader("content-type", "application/json");
      res.end(JSON.stringify({ keys: [jwk] }));
      return;
    }
    if (url.pathname === "/auth") {
      const q = url.searchParams;
      const ok =
        q.get("client_id") === clientId &&
        q.get("response_type") === "id_token" &&
        q.get("response_mode") === "form_post" &&
        q.get("scope") === "openid" &&
        q.get("redirect_uri") === `${APP}/api/lti/launch` &&
        q.get("login_hint") === nextUser.sub;
      if (!ok) {
        res.statusCode = 400;
        res.end(`bad auth request: ${url.search}`);
        return;
      }
      const state = q.get("state")!;
      const token = idToken(q.get("nonce")!, nextUser.sub, nextUser.name, nextUser.roles);
      issued.push({ state, idToken: token });
      res.setHeader("content-type", "text/html");
      res.end(`<form method="post" action="${q.get("redirect_uri")}">
        <input type="hidden" name="id_token" value="${token}">
        <input type="hidden" name="state" value="${state}">
      </form><script>document.forms[0].submit()</script>`);
      return;
    }
    res.statusCode = 404;
    res.end();
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  platformUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;

  execFileSync(
    "npx",
    [
      "tsx", "scripts/lti-register.ts",
      "--issuer", issuer(),
      "--client-id", clientId,
      "--auth-login-url", `${platformUrl}/auth`,
      "--auth-token-url", `${platformUrl}/token`,
      "--jwks-url", `${platformUrl}/jwks`,
      "--deployment", "1",
    ],
    { stdio: "pipe" },
  );
});

test.afterAll(() => {
  server?.close();
});

function loginUrl(loginHint: string) {
  const q = new URLSearchParams({
    iss: issuer(),
    client_id: clientId,
    login_hint: loginHint,
    target_link_uri: `${APP}/exercises/01-tervehdys`,
    lti_deployment_id: "1",
  });
  return `/api/lti/login?${q}`;
}

test("a student launched from the platform lands on the exercise, signed in", async ({ page }) => {
  nextUser = { sub: `s-${run}`, name: "Aino Opiskelija", roles: ["http://purl.imsglobal.org/vocab/lis/v2/membership#Learner"] };
  await page.goto(loginUrl(nextUser.sub));

  await expect(page).toHaveURL(/\/exercises\/01-tervehdys$/);
  await expect(page.getByText("Aino Opiskelija")).toBeVisible();
  await expect(page.getByRole("button", { name: "Palauta" })).toBeVisible();

  // The same platform user is the same Koodipaja user on the next launch.
  await page.context().clearCookies();
  await page.goto(loginUrl(nextUser.sub));
  await expect(page.getByText("Aino Opiskelija")).toBeVisible();
});

test("an id_token cannot be replayed", async ({ page }) => {
  nextUser = { sub: `r-${run}`, name: "Replay Testi", roles: [] };
  await page.goto(loginUrl(nextUser.sub));
  await expect(page).toHaveURL(/\/exercises\/01-tervehdys$/);

  const { state, idToken: token } = issued[issued.length - 1];
  const replay = await page.request.post("/api/lti/launch", {
    form: { state, id_token: token },
    headers: { cookie: `kp_lti_${state}=1` },
    maxRedirects: 0,
  });
  expect(replay.status()).toBe(303);
  expect(replay.headers().location).toContain("/lti-virhe?koodi=state");
});

test("a launch without the browser's state cookie is rejected", async ({ page, playwright }) => {
  nextUser = { sub: `c-${run}`, name: "Ilman Evästettä", roles: [] };
  // Start the login in one client, finish it from another that never got the cookie.
  const other = await playwright.request.newContext({ baseURL: APP });
  const login = await other.get(loginUrl(nextUser.sub), { maxRedirects: 0 });
  const auth = new URL(login.headers().location);
  const token = idToken(auth.searchParams.get("nonce")!, nextUser.sub, nextUser.name, []);
  await other.dispose();

  const launch = await page.request.post("/api/lti/launch", {
    form: { state: auth.searchParams.get("state")!, id_token: token },
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
