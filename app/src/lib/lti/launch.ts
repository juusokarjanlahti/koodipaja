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
  agsEndpoint: "https://purl.imsglobal.org/spec/lti-ags/claim/endpoint",
  deepLinkingSettings: "https://purl.imsglobal.org/spec/lti-dl/claim/deep_linking_settings",
  contentItems: "https://purl.imsglobal.org/spec/lti-dl/claim/content_items",
  data: "https://purl.imsglobal.org/spec/lti-dl/claim/data",
} as const;

export const AGS_SCORE_SCOPE = "https://purl.imsglobal.org/spec/lti-ags/scope/score";

/** How far apart the platform's and our clocks may be. */
const CLOCK_SKEW_SECONDS = 60;

export type LaunchPlatform = { issuer: string; clientId: string; deploymentIds: string[] };

/** Who launched, from which course. Common to every message type. */
export type LaunchUser = {
  sub: string;
  displayName: string | null;
  role: "student" | "teacher";
  deploymentId: string;
  context: { id: string; title: string | null } | null;
};

export type DeepLinkRequest = LaunchUser & {
  returnUrl: string;
  acceptMultiple: boolean;
  /** Opaque platform value that must be echoed back in the response. */
  data: string | null;
};

export type Launch = LaunchUser & {
  resourceLinkId: string;
  targetLinkUri: string | null;
  /** Where scores for this activity go; null when the activity does not take grades. */
  ags: { lineItem: string; scopes: string[] } | null;
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

/** Claims every LTI message carries, checked the same way for every message type. */
function validateCommon(
  payload: JwtPayload,
  platform: LaunchPlatform,
  expectedNonce: string,
  messageType: string,
  nowSeconds: number,
): LaunchUser {
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
  if (payload[CLAIM.messageType] !== messageType) {
    fail("message_type", `unsupported message type ${String(payload[CLAIM.messageType])}`);
  }

  const sub = str(payload.sub);
  if (!sub) fail("sub", "anonymous launches are not supported");

  const context = payload[CLAIM.context] as { id?: unknown; title?: unknown; label?: unknown } | undefined;
  const contextId = str(context?.id);

  return {
    sub: sub.slice(0, 255),
    displayName: displayNameFrom(payload),
    role: roleFromClaims(payload[CLAIM.roles]),
    deploymentId,
    context: contextId ? { id: contextId, title: str(context?.title) ?? str(context?.label) } : null,
  };
}

/** The message type of a verified token, so the launch endpoint can pick the validator. */
export function messageType(payload: JwtPayload): string | null {
  return str(payload[CLAIM.messageType]);
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
  const user = validateCommon(payload, platform, expectedNonce, "LtiResourceLinkRequest", nowSeconds);

  const resourceLink = payload[CLAIM.resourceLink] as { id?: unknown } | undefined;
  const resourceLinkId = str(resourceLink?.id);
  if (!resourceLinkId) fail("resource_link", "resource link id is missing");

  const endpoint = payload[CLAIM.agsEndpoint] as { lineitem?: unknown; scope?: unknown } | undefined;
  const lineItem = str(endpoint?.lineitem);
  const scopes = Array.isArray(endpoint?.scope) ? endpoint.scope.filter((s): s is string => typeof s === "string") : [];

  return {
    ...user,
    resourceLinkId,
    targetLinkUri: str(payload[CLAIM.targetLinkUri]),
    ags: lineItem && scopes.includes(AGS_SCORE_SCOPE) ? { lineItem, scopes } : null,
  };
}

/**
 * Checks a Deep Linking request (LTI Deep Linking 2.0): a teacher choosing content for a
 * new activity. Only teachers may choose, and the platform must accept resource links.
 */
export function validateDeepLinkRequest(
  payload: JwtPayload,
  platform: LaunchPlatform,
  expectedNonce: string,
  nowSeconds = Math.floor(Date.now() / 1000),
): DeepLinkRequest {
  const user = validateCommon(payload, platform, expectedNonce, "LtiDeepLinkingRequest", nowSeconds);
  if (user.role !== "teacher") fail("role", "only teachers can choose content");

  const settings = payload[CLAIM.deepLinkingSettings] as
    | { deep_link_return_url?: unknown; accept_types?: unknown; accept_multiple?: unknown; data?: unknown }
    | undefined;
  const returnUrl = str(settings?.deep_link_return_url);
  if (!returnUrl || !/^https?:\/\//.test(returnUrl)) fail("deep_linking", "deep link return URL is missing");
  const acceptTypes = Array.isArray(settings?.accept_types) ? settings.accept_types : [];
  if (!acceptTypes.includes("ltiResourceLink")) fail("deep_linking", "platform does not accept resource links");

  return {
    ...user,
    returnUrl,
    acceptMultiple: settings?.accept_multiple === true,
    data: str(settings?.data),
  };
}

/** The exercise id when a path is an exercise page (/exercises/<id>), otherwise null. */
export function exerciseIdFromPath(path: string): string | null {
  const match = /^\/exercises\/([a-z0-9][a-z0-9-]*)\/?(?:\?.*)?$/.exec(path);
  return match ? match[1] : null;
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
