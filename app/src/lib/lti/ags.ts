import { randomBytes, type KeyObject } from "node:crypto";
import { signRs256 } from "./jwt";
import { publicJwk } from "./keys";
import { AGS_SCORE_SCOPE } from "./launch";

/**
 * LTI Assignment and Grade Services: scores to the platform gradebook.
 * See docs/specs/lti-grades.md.
 */

type Fetch = typeof fetch;

export class AgsError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AgsError";
  }
}

export type ScoredSubmission = { passedCount: number; totalCount: number; createdAt: Date };

/** The best submission: highest passed/total, then more cases, then the earliest. */
export function bestSubmission<T extends ScoredSubmission>(submissions: T[]): T | null {
  let best: T | null = null;
  for (const s of submissions) {
    if (s.totalCount <= 0) continue;
    if (!best) {
      best = s;
      continue;
    }
    const diff = s.passedCount * best.totalCount - best.passedCount * s.totalCount;
    if (
      diff > 0 ||
      (diff === 0 && s.totalCount > best.totalCount) ||
      (diff === 0 && s.totalCount === best.totalCount && s.createdAt < best.createdAt)
    ) {
      best = s;
    }
  }
  return best;
}

/** `<lineitem>/scores`, keeping any query string after the new path segment. */
export function scoresUrl(lineItem: string): string {
  const url = new URL(lineItem);
  url.pathname = `${url.pathname.replace(/\/+$/, "")}/scores`;
  return url.toString();
}

export function scorePayload(platformUserId: string, passed: number, total: number, now = new Date()) {
  return {
    userId: platformUserId,
    scoreGiven: passed,
    scoreMaximum: total,
    activityProgress: "Completed",
    gradingProgress: "FullyGraded",
    timestamp: now.toISOString(),
  };
}

export type TokenPlatform = { clientId: string; authTokenUrl: string };

const tokenCache = new Map<string, { token: string; expiresAt: number }>();

export function clearTokenCache(): void {
  tokenCache.clear();
}

/** OAuth 2 client credentials with a signed JWT assertion (IMS Security Framework 4.1). */
export async function accessToken(
  platform: TokenPlatform,
  key: KeyObject,
  scope = AGS_SCORE_SCOPE,
  fetchImpl: Fetch = fetch,
  now = Date.now(),
): Promise<string> {
  const cacheKey = `${platform.authTokenUrl}|${platform.clientId}|${scope}`;
  const cached = tokenCache.get(cacheKey);
  if (cached && cached.expiresAt > now) return cached.token;

  const iat = Math.floor(now / 1000);
  const assertion = signRs256(
    {
      iss: platform.clientId,
      sub: platform.clientId,
      aud: platform.authTokenUrl,
      iat,
      exp: iat + 300,
      jti: randomBytes(16).toString("base64url"),
    },
    key,
    publicJwk(key).kid,
  );
  const body = new URLSearchParams({
    grant_type: "client_credentials",
    client_assertion_type: "urn:ietf:params:oauth:client-assertion-type:jwt-bearer",
    client_assertion: assertion,
    scope,
  });

  let response: Response;
  try {
    response = await fetchImpl(platform.authTokenUrl, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded", accept: "application/json" },
      body,
      signal: AbortSignal.timeout(10_000),
    });
  } catch (error) {
    throw new AgsError(`token request failed: ${(error as Error).message}`);
  }
  const json = (await response.json().catch(() => null)) as { access_token?: unknown; expires_in?: unknown; error?: unknown } | null;
  if (!response.ok || typeof json?.access_token !== "string") {
    throw new AgsError(`token request returned HTTP ${response.status}${json?.error ? ` (${String(json.error)})` : ""}`);
  }
  const lifetime = typeof json.expires_in === "number" ? json.expires_in : 3600;
  // Renew a minute early so a token never expires mid-request.
  tokenCache.set(cacheKey, { token: json.access_token, expiresAt: now + Math.max(0, lifetime - 60) * 1000 });
  return json.access_token;
}

export async function postScore(
  lineItem: string,
  token: string,
  score: ReturnType<typeof scorePayload>,
  fetchImpl: Fetch = fetch,
): Promise<void> {
  let response: Response;
  try {
    response = await fetchImpl(scoresUrl(lineItem), {
      method: "POST",
      headers: { authorization: `Bearer ${token}`, "content-type": "application/vnd.ims.lis.v1.score+json" },
      body: JSON.stringify(score),
      signal: AbortSignal.timeout(10_000),
    });
  } catch (error) {
    throw new AgsError(`score request failed: ${(error as Error).message}`);
  }
  if (!response.ok) {
    const detail = (await response.text().catch(() => "")).slice(0, 200);
    throw new AgsError(`score request returned HTTP ${response.status}${detail ? `: ${detail}` : ""}`);
  }
}
