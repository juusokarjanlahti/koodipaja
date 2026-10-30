import { JwtError, type JwtPayload } from "./jwt";

/** LTI 1.3 claim names (LTI Core 1.3, section 5). */
export const CLAIM = {
  messageType: "https://purl.imsglobal.org/spec/lti/claim/message_type",
  version: "https://purl.imsglobal.org/spec/lti/claim/version",
  deploymentId: "https://purl.imsglobal.org/spec/lti/claim/deployment_id",
  targetLinkUri: "https://purl.imsglobal.org/spec/lti/claim/target_link_uri",
  resourceLink: "https://purl.imsglobal.org/spec/lti/claim/resource_link",
  roles: "https://purl.imsglobal.org/spec/lti/claim/roles",
  context: "https://purl.imsglobal.org/spec/lti/claim/context",
} as const;

/** How far apart the platform's and our clocks may be. */
const CLOCK_SKEW_SECONDS = 60;

export type LaunchPlatform = { issuer: string; clientId: string; deploymentIds: string[] };

export type Launch = {
  sub: string;
  displayName: string | null;
  role: "student" | "teacher";
  deploymentId: string;
  context: { id: string; title: string | null } | null;
  resourceLinkId: string;
  targetLinkUri: string | null;
};

function fail(code: string, message: string): never {
  throw new JwtError(code, message);
}

function str(value: unknown): string | null {
  return typeof value === "string" && value.trim() !== "" ? value : null;
}

const TEACHER_ROLES = new Set([
  "http://purl.imsglobal.org/vocab/lis/v2/membership#Instructor",
  "http://purl.imsglobal.org/vocab/lis/v2/membership#ContentDeveloper",
  "http://purl.imsglobal.org/vocab/lis/v2/membership/Instructor#TeachingAssistant",
  // Short context role names are deprecated in LTI 1.3 but still seen in the wild.
  "Instructor",
  "ContentDeveloper",
]);

/** Course role from the LTI roles claim. Anything that is not a teaching role is a student. */
export function roleFromClaims(roles: unknown): "student" | "teacher" {
  if (!Array.isArray(roles)) return "student";
  return roles.some((r) => typeof r === "string" && TEACHER_ROLES.has(r)) ? "teacher" : "student";
}

function displayNameFrom(payload: JwtPayload): string | null {
  const name = str(payload.name);
  if (name) return name.slice(0, 200);
  const parts = [str(payload.given_name), str(payload.family_name)].filter(Boolean);
  return parts.length ? parts.join(" ").slice(0, 200) : null;
}

/**
 * Checks every claim of a resource link launch whose signature is already verified.
 * Throws JwtError with a short code on the first problem.
 */
export function validateLaunch(
  payload: JwtPayload,
  platform: LaunchPlatform,
  expectedNonce: string,
  nowSeconds = Math.floor(Date.now() / 1000),
): Launch {
  if (payload.iss !== platform.issuer) fail("iss", "issuer does not match the platform");

  const aud = payload.aud;
  const audiences = Array.isArray(aud) ? aud : [aud];
  if (!audiences.includes(platform.clientId)) fail("aud", "token is not for this client");
  if (audiences.length > 1 && payload.azp !== platform.clientId) fail("azp", "azp does not match the client");

  const exp = payload.exp;
  const iat = payload.iat;
  if (typeof exp !== "number" || exp + CLOCK_SKEW_SECONDS < nowSeconds) fail("exp", "token has expired");
  if (typeof iat !== "number" || iat - CLOCK_SKEW_SECONDS > nowSeconds) fail("iat", "token is issued in the future");

  if (payload.nonce !== expectedNonce) fail("nonce", "nonce does not match the login request");

  const deploymentId = str(payload[CLAIM.deploymentId]);
  if (!deploymentId || !platform.deploymentIds.includes(deploymentId)) {
    fail("deployment", "deployment is not registered");
  }

  if (payload[CLAIM.version] !== "1.3.0") fail("version", "LTI version must be 1.3.0");
  if (payload[CLAIM.messageType] !== "LtiResourceLinkRequest") {
    fail("message_type", `unsupported message type ${String(payload[CLAIM.messageType])}`);
  }

  const sub = str(payload.sub);
  if (!sub) fail("sub", "anonymous launches are not supported");

  const resourceLink = payload[CLAIM.resourceLink] as { id?: unknown } | undefined;
  const resourceLinkId = str(resourceLink?.id);
  if (!resourceLinkId) fail("resource_link", "resource link id is missing");

  const context = payload[CLAIM.context] as { id?: unknown; title?: unknown; label?: unknown } | undefined;
  const contextId = str(context?.id);

  return {
    sub: sub.slice(0, 255),
    displayName: displayNameFrom(payload),
    role: roleFromClaims(payload[CLAIM.roles]),
    deploymentId,
    context: contextId ? { id: contextId, title: str(context?.title) ?? str(context?.label) } : null,
    resourceLinkId,
    targetLinkUri: str(payload[CLAIM.targetLinkUri]),
  };
}

/**
 * Where to send the user after the launch: the target link if it points to this site,
 * as a path, otherwise the front page. Never an open redirect.
 */
export function redirectPath(targetLinkUri: string | null, appOrigin: string): string {
  if (!targetLinkUri) return "/";
  let url: URL;
  try {
    url = new URL(targetLinkUri);
  } catch {
    return "/";
  }
  if (url.origin !== new URL(appOrigin).origin) return "/";
  // The launch endpoints themselves are not useful landing pages.
  if (url.pathname.startsWith("/api/")) return "/";
  return `${url.pathname}${url.search}`;
}
