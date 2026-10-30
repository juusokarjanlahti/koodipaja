import { createHash, createPrivateKey, createPublicKey, type KeyObject } from "node:crypto";
import { JwtError, selectKey, type Jwk, type JwtHeader } from "./jwt";

const JWKS_TTL_MS = 10 * 60 * 1000;
const cache = new Map<string, { keys: Jwk[]; fetchedAt: number }>();

type Fetch = typeof fetch;

async function fetchKeySet(url: string, fetchImpl: Fetch): Promise<Jwk[]> {
  let response: Response;
  try {
    response = await fetchImpl(url, { headers: { accept: "application/json" }, signal: AbortSignal.timeout(5000) });
  } catch {
    throw new JwtError("jwks", "platform key set could not be fetched");
  }
  if (!response.ok) throw new JwtError("jwks", `platform key set returned HTTP ${response.status}`);
  const body = (await response.json().catch(() => null)) as { keys?: unknown } | null;
  if (!body || !Array.isArray(body.keys)) throw new JwtError("jwks", "platform key set is not a JWKS");
  return body.keys as Jwk[];
}

/**
 * The platform key for a JWT header. Key sets are cached for ten minutes; an unknown kid
 * triggers one refetch, so a platform's key rotation works without a restart.
 */
export async function platformKey(jwksUrl: string, header: JwtHeader, fetchImpl: Fetch = fetch, now = Date.now()): Promise<Jwk> {
  const cached = cache.get(jwksUrl);
  if (cached && now - cached.fetchedAt < JWKS_TTL_MS) {
    const key = selectKey(cached.keys, header);
    if (key) return key;
  }
  const keys = await fetchKeySet(jwksUrl, fetchImpl);
  cache.set(jwksUrl, { keys, fetchedAt: now });
  const key = selectKey(keys, header);
  if (!key) throw new JwtError("kid", "no platform key matches the token");
  return key;
}

export function clearKeyCache(): void {
  cache.clear();
}

/** The tool's own key pair from LTI_PRIVATE_KEY (PKCS#8 PEM), or null when not configured. */
export function toolPrivateKey(): KeyObject | null {
  const pem = process.env.LTI_PRIVATE_KEY?.replace(/\\n/g, "\n");
  if (!pem) return null;
  return createPrivateKey(pem);
}

/** The public JWK for a private key, with a stable kid (RFC 7638 thumbprint). */
export function publicJwk(privateKey: KeyObject): Jwk {
  const jwk = createPublicKey(privateKey).export({ format: "jwk" }) as Jwk;
  const thumbprint = createHash("sha256")
    .update(JSON.stringify({ e: jwk.e, kty: jwk.kty, n: jwk.n }))
    .digest("base64url");
  return { kty: jwk.kty, n: jwk.n, e: jwk.e, kid: thumbprint, alg: "RS256", use: "sig" };
}
