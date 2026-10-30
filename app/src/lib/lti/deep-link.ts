import { createHmac, randomBytes, timingSafeEqual, type KeyObject } from "node:crypto";
import { signRs256 } from "./jwt";
import { publicJwk } from "./keys";
import { CLAIM } from "./launch";

/**
 * LTI Deep Linking 2.0: the teacher picks exercises in Koodipaja and we send them back to
 * the platform as resource links. The pending choice lives in a short-lived HMAC-signed
 * token (no table) that says where the answer goes. Moodle shows the chooser in an iframe,
 * where cookies are third-party and may be blocked, so the token, not the session, is what
 * authorises finishing the choice. It only ever lets its holder send exercise links back
 * to the Moodle page that asked for them.
 */

export type DeepLinkChoice = {
  platformId: number;
  deploymentId: string;
  userId: string;
  returnUrl: string;
  acceptMultiple: boolean;
  data: string | null;
  /** Unix seconds. */
  exp: number;
};

const CHOICE_TTL_SECONDS = 60 * 60;

function mac(payload: string, secret: string): string {
  return createHmac("sha256", `deep-link:${secret}`).update(payload).digest("base64url");
}

export function createChoiceToken(choice: Omit<DeepLinkChoice, "exp">, secret: string, now = Date.now()): string {
  const payload = Buffer.from(JSON.stringify({ ...choice, exp: Math.floor(now / 1000) + CHOICE_TTL_SECONDS })).toString("base64url");
  return `${payload}.${mac(payload, secret)}`;
}

/** The choice if the token is authentic and unexpired, otherwise null. */
export function readChoiceToken(token: string, secret: string, now = Date.now()): DeepLinkChoice | null {
  const [payload, signature] = token.split(".");
  if (!payload || !signature) return null;
  const expected = Buffer.from(mac(payload, secret));
  const given = Buffer.from(signature);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null;
  let choice: DeepLinkChoice;
  try {
    choice = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
  } catch {
    return null;
  }
  if (typeof choice.exp !== "number" || choice.exp * 1000 < now) return null;
  return choice;
}

export type ChosenExercise = { id: string; title: string };

/** A content item per exercise: a gradable resource link that opens the exercise. */
export function contentItems(exercises: ChosenExercise[], appOrigin: string) {
  return exercises.map((e) => ({
    type: "ltiResourceLink",
    title: e.title,
    url: `${appOrigin}/exercises/${e.id}`,
    // Moodle creates a grade item from this; AGS scores are scaled to it.
    lineItem: { scoreMaximum: 100, label: e.title, resourceId: e.id },
  }));
}

/** The signed LtiDeepLinkingResponse JWT the browser posts back to the platform. */
export function deepLinkingResponse(
  platform: { issuer: string; clientId: string },
  choice: Pick<DeepLinkChoice, "deploymentId" | "data">,
  items: ReturnType<typeof contentItems>,
  key: KeyObject,
  now = Date.now(),
): string {
  const iat = Math.floor(now / 1000);
  return signRs256(
    {
      iss: platform.clientId,
      aud: platform.issuer,
      iat,
      exp: iat + 600,
      nonce: randomBytes(16).toString("base64url"),
      [CLAIM.deploymentId]: choice.deploymentId,
      [CLAIM.messageType]: "LtiDeepLinkingResponse",
      [CLAIM.version]: "1.3.0",
      [CLAIM.contentItems]: items,
      ...(choice.data ? { [CLAIM.data]: choice.data } : {}),
    },
    key,
    publicJwk(key).kid,
  );
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
}

/** A page that posts the response JWT to the platform, with a button when scripts are off. */
export function autoPostPage(returnUrl: string, jwt: string): string {
  return `<!doctype html>
<html lang="fi"><head><meta charset="utf-8"><title>Palataan Moodleen – Koodipaja</title></head>
<body>
<form method="post" action="${escapeHtml(returnUrl)}">
<input type="hidden" name="JWT" value="${escapeHtml(jwt)}">
<p>Palataan Moodleen…</p>
<noscript><button type="submit">Jatka Moodleen</button></noscript>
</form>
<script>document.forms[0].submit()</script>
</body></html>`;
}
