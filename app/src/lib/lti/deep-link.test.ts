import { generateKeyPairSync } from "node:crypto";
import { describe, expect, it } from "vitest";
import { autoPostPage, contentItems, createChoiceToken, deepLinkingResponse, readChoiceToken } from "./deep-link";
import { verifyRs256 } from "./jwt";
import { publicJwk } from "./keys";
import { CLAIM } from "./launch";

const secret = "s".repeat(64);
const choice = {
  platformId: 3,
  deploymentId: "1",
  userId: "u-1",
  returnUrl: "https://moodle.example.fi/mod/lti/contentitem_return.php?course=2&id=1",
  acceptMultiple: true,
  data: "opaque-123",
};

describe("choice token", () => {
  it("round-trips and expires after an hour", () => {
    const token = createChoiceToken(choice, secret, 0);
    expect(readChoiceToken(token, secret, 59 * 60 * 1000)).toMatchObject(choice);
    expect(readChoiceToken(token, secret, 61 * 60 * 1000)).toBeNull();
  });

  it("rejects tampering and other secrets", () => {
    const token = createChoiceToken(choice, secret, 0);
    const [payload, mac] = token.split(".");
    const forged = Buffer.from(JSON.stringify({ ...choice, returnUrl: "https://evil.example", exp: 9e9 })).toString("base64url");
    expect(readChoiceToken(`${forged}.${mac}`, secret, 0)).toBeNull();
    expect(readChoiceToken(`${payload}.${mac}`, "other", 0)).toBeNull();
    expect(readChoiceToken("garbage", secret, 0)).toBeNull();
  });
});

describe("deepLinkingResponse", () => {
  it("signs the chosen exercises as gradable resource links and echoes data", () => {
    const { privateKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
    const items = contentItems([{ id: "01-tervehdys", title: "Tervehdys" }], "https://koodipaja.example.fi");
    const jwt = deepLinkingResponse({ issuer: "https://moodle.example.fi", clientId: "abc" }, choice, items, privateKey, 0);
    const { header, payload } = verifyRs256(jwt, publicJwk(privateKey));
    expect(header.kid).toBe(publicJwk(privateKey).kid);
    expect(payload).toMatchObject({
      iss: "abc",
      aud: "https://moodle.example.fi",
      [CLAIM.deploymentId]: "1",
      [CLAIM.messageType]: "LtiDeepLinkingResponse",
      [CLAIM.version]: "1.3.0",
      [CLAIM.data]: "opaque-123",
      [CLAIM.contentItems]: [
        {
          type: "ltiResourceLink",
          title: "Tervehdys",
          url: "https://koodipaja.example.fi/exercises/01-tervehdys",
          lineItem: { scoreMaximum: 100, label: "Tervehdys", resourceId: "01-tervehdys" },
        },
      ],
    });
    expect(typeof payload.nonce).toBe("string");
  });
});

describe("autoPostPage", () => {
  it("escapes the return URL and token", () => {
    const html = autoPostPage('https://m.example/r?a=1&b="x"', "a.b.c");
    expect(html).toContain('action="https://m.example/r?a=1&#38;b=&#34;x&#34;"');
    expect(html).toContain('name="JWT" value="a.b.c"');
    expect(html).toContain("<noscript>");
  });
});
