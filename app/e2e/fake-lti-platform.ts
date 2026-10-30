import { execFileSync } from "node:child_process";
import { generateKeyPairSync, randomUUID } from "node:crypto";
import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { signRs256, verifyRs256 } from "../src/lib/lti/jwt";
import { AGS_SCORE_SCOPE, CLAIM } from "../src/lib/lti/launch";
import { publicJwk } from "../src/lib/lti/keys";

/**
 * A fake LTI 1.3 platform (a tiny "Moodle") so the whole browser flow runs in CI:
 * login initiation -> OIDC auth request -> form_post of a signed id_token -> signed in,
 * and for grades: client-credentials token endpoint and a line item score endpoint.
 */

export const APP = process.env.APP_URL ?? "http://localhost:3000";

export type FakeUser = {
  sub: string;
  name: string;
  roles: string[];
  target?: string;
  grades?: boolean;
  /** Send a Deep Linking request instead of a resource link launch. */
  deepLink?: { acceptMultiple: boolean };
};
export type ReceivedScore = { lineItem: string; score: Record<string, unknown>; token: string };

export class FakePlatform {
  readonly run = randomUUID().slice(0, 8);
  readonly clientId = `e2e-${this.run}`;
  url = "";
  nextUser: FakeUser = { sub: "", name: "", roles: [] };
  readonly issued: { state: string; idToken: string }[] = [];
  readonly scores: ReceivedScore[] = [];
  readonly tokenErrors: string[] = [];
  /** Verified LtiDeepLinkingResponse payloads posted back to the return URL. */
  readonly deepLinkResponses: Record<string, unknown>[] = [];
  private readonly key = generateKeyPairSync("rsa", { modulusLength: 2048 }).privateKey;
  private readonly jwk = publicJwk(this.key);
  private server?: Server;

  get issuer() {
    return `${this.url}/issuer-${this.run}`;
  }

  lineItem(sub: string) {
    return `${this.url}/lineitems/${sub}/lineitem?type_id=1`;
  }

  idToken(nonce: string, user: FakeUser): string {
    const now = Math.floor(Date.now() / 1000);
    return signRs256(
      {
        iss: this.issuer,
        aud: this.clientId,
        sub: user.sub,
        name: user.name,
        exp: now + 300,
        iat: now,
        nonce,
        [CLAIM.deploymentId]: "1",
        [CLAIM.version]: "1.3.0",
        ...(user.deepLink
          ? {
              [CLAIM.messageType]: "LtiDeepLinkingRequest",
              [CLAIM.deepLinkingSettings]: {
                deep_link_return_url: `${this.url}/dl-return?course=1`,
                accept_types: ["ltiResourceLink"],
                accept_presentation_document_targets: ["window"],
                accept_multiple: user.deepLink.acceptMultiple,
                data: `data-${this.run}`,
              },
            }
          : {
              [CLAIM.messageType]: "LtiResourceLinkRequest",
              [CLAIM.resourceLink]: { id: `rl-${user.sub}` },
            }),
        [CLAIM.roles]: user.roles,
        [CLAIM.context]: { id: "course-1", title: "Ohjelmoinnin perusteet (e2e)" },
        [CLAIM.targetLinkUri]: `${APP}${user.target ?? "/exercises/01-tervehdys"}`,
        ...(user.grades
          ? { [CLAIM.agsEndpoint]: { lineitem: this.lineItem(user.sub), scope: [AGS_SCORE_SCOPE] } }
          : {}),
      },
      this.key,
      this.jwk.kid,
    );
  }

  loginPath(user: FakeUser) {
    const q = new URLSearchParams({
      iss: this.issuer,
      client_id: this.clientId,
      login_hint: user.sub,
      target_link_uri: `${APP}${user.target ?? "/exercises/01-tervehdys"}`,
      lti_deployment_id: "1",
    });
    return `/api/lti/login?${q}`;
  }

  async start() {
    this.server = createServer((req, res) => {
      const chunks: Buffer[] = [];
      req.on("data", (c) => chunks.push(c));
      req.on("end", () => {
        this.handle(req.method ?? "GET", new URL(req.url ?? "/", this.url), Buffer.concat(chunks).toString(), req.headers.authorization, res).catch(
          (error) => {
            res.statusCode = 500;
            res.end(String(error));
          },
        );
      });
    });
    await new Promise<void>((resolve) => this.server!.listen(0, "127.0.0.1", resolve));
    this.url = `http://127.0.0.1:${(this.server.address() as AddressInfo).port}`;
    execFileSync(
      "npx",
      [
        "tsx", "--env-file-if-exists=.env.local", "scripts/lti-register.ts",
        "--issuer", this.issuer,
        "--client-id", this.clientId,
        "--auth-login-url", `${this.url}/auth`,
        "--auth-token-url", `${this.url}/token`,
        "--jwks-url", `${this.url}/jwks`,
        "--deployment", "1",
      ],
      { stdio: "pipe" },
    );
  }

  stop() {
    this.server?.close();
  }

  private async handle(
    method: string,
    url: URL,
    body: string,
    authorization: string | undefined,
    res: import("node:http").ServerResponse,
  ) {
    if (url.pathname === "/jwks") {
      res.setHeader("content-type", "application/json");
      res.end(JSON.stringify({ keys: [this.jwk] }));
      return;
    }
    if (url.pathname === "/auth") {
      const q = url.searchParams;
      const ok =
        q.get("client_id") === this.clientId &&
        q.get("response_type") === "id_token" &&
        q.get("response_mode") === "form_post" &&
        q.get("scope") === "openid" &&
        q.get("redirect_uri") === `${APP}/api/lti/launch` &&
        q.get("login_hint") === this.nextUser.sub;
      if (!ok) {
        res.statusCode = 400;
        res.end(`bad auth request: ${url.search}`);
        return;
      }
      const state = q.get("state")!;
      const token = this.idToken(q.get("nonce")!, this.nextUser);
      this.issued.push({ state, idToken: token });
      res.setHeader("content-type", "text/html");
      res.end(`<form method="post" action="${q.get("redirect_uri")}">
        <input type="hidden" name="id_token" value="${token}">
        <input type="hidden" name="state" value="${state}">
      </form><script>document.forms[0].submit()</script>`);
      return;
    }
    if (url.pathname === "/token" && method === "POST") {
      // Verify the client assertion with the tool's published key, like Moodle does.
      const form = new URLSearchParams(body);
      try {
        const keys = (await (await fetch(`${APP}/api/lti/jwks`)).json()) as { keys: Parameters<typeof verifyRs256>[1][] };
        const { payload } = verifyRs256(form.get("client_assertion") ?? "", keys.keys[0]);
        if (payload.iss !== this.clientId || payload.sub !== this.clientId || payload.aud !== `${this.url}/token`) {
          throw new Error(`bad assertion claims ${JSON.stringify(payload)}`);
        }
        if (form.get("grant_type") !== "client_credentials" || form.get("scope") !== AGS_SCORE_SCOPE) {
          throw new Error(`bad token request ${body}`);
        }
      } catch (error) {
        this.tokenErrors.push(String(error));
        res.statusCode = 400;
        res.end(JSON.stringify({ error: "invalid_client" }));
        return;
      }
      res.setHeader("content-type", "application/json");
      res.end(JSON.stringify({ access_token: `token-${this.run}`, token_type: "Bearer", expires_in: 3600 }));
      return;
    }
    if (url.pathname === "/dl-return" && method === "POST") {
      const jwt = new URLSearchParams(body).get("JWT") ?? "";
      const keys = (await (await fetch(`${APP}/api/lti/jwks`)).json()) as { keys: Parameters<typeof verifyRs256>[1][] };
      const { payload } = verifyRs256(jwt, keys.keys[0]);
      this.deepLinkResponses.push(payload);
      res.setHeader("content-type", "text/html; charset=utf-8");
      res.end(`<!doctype html><title>Moodle</title><h1>Sisältö lisätty</h1>`);
      return;
    }
    const scores = /^\/lineitems\/([^/]+)\/lineitem\/scores$/.exec(url.pathname);
    if (scores && method === "POST") {
      if (authorization !== `Bearer token-${this.run}` || url.searchParams.get("type_id") !== "1") {
        res.statusCode = 401;
        res.end();
        return;
      }
      this.scores.push({ lineItem: scores[1], score: JSON.parse(body), token: authorization });
      res.statusCode = 204;
      res.end();
      return;
    }
    res.statusCode = 404;
    res.end();
  }
}
