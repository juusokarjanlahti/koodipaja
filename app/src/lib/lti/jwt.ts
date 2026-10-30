import { createPrivateKey, createPublicKey, KeyObject, sign, verify, type JsonWebKey } from "node:crypto";

/**
 * Minimal JWT support for LTI 1.3: RS256 only, built on node:crypto.
 * See docs/specs/lti-launch.md for why this is not a library.
 */

export class JwtError extends Error {
  constructor(public readonly code: string, message: string) {
    super(message);
    this.name = "JwtError";
  }
}

export type Jwk = JsonWebKey & { kid?: string; alg?: string; use?: string; kty?: string };
export type JwtHeader = { alg?: string; kid?: string; typ?: string };
export type JwtPayload = Record<string, unknown>;

function decodePart(part: string, what: string): Record<string, unknown> {
  try {
    const value = JSON.parse(Buffer.from(part, "base64url").toString("utf8"));
    if (value && typeof value === "object" && !Array.isArray(value)) return value;
  } catch {
    // fall through
  }
  throw new JwtError("malformed", `JWT ${what} is not a JSON object`);
}

export function decodeJwt(token: string): { header: JwtHeader; payload: JwtPayload; signingInput: string; signature: Buffer } {
  const parts = token.split(".");
  if (parts.length !== 3 || parts.some((p) => !/^[A-Za-z0-9_-]+$/.test(p))) {
    throw new JwtError("malformed", "JWT must have three base64url parts");
  }
  return {
    header: decodePart(parts[0], "header") as JwtHeader,
    payload: decodePart(parts[1], "payload"),
    signingInput: `${parts[0]}.${parts[1]}`,
    signature: Buffer.from(parts[2], "base64url"),
  };
}

/** Finds the signing key for a header in a key set. Returns null when no key matches. */
export function selectKey(keys: Jwk[], header: JwtHeader): Jwk | null {
  const candidates = keys.filter(
    (k) => k.kty === "RSA" && (k.use === undefined || k.use === "sig") && (k.alg === undefined || k.alg === "RS256"),
  );
  if (header.kid) return candidates.find((k) => k.kid === header.kid) ?? null;
  // Without a kid the choice is only unambiguous for a single key.
  return candidates.length === 1 ? candidates[0] : null;
}

/** Verifies an RS256 JWT and returns its payload. Claims are NOT checked here. */
export function verifyRs256(token: string, key: Jwk | KeyObject): { header: JwtHeader; payload: JwtPayload } {
  const { header, payload, signingInput, signature } = decodeJwt(token);
  if (header.alg !== "RS256") throw new JwtError("alg", `unsupported JWT alg ${String(header.alg)}`);
  let publicKey: KeyObject;
  try {
    publicKey = key instanceof KeyObject ? key : createPublicKey({ key, format: "jwk" });
  } catch {
    throw new JwtError("key", "platform key is not a valid RSA public key");
  }
  if (!verify("RSA-SHA256", Buffer.from(signingInput), publicKey, signature)) {
    throw new JwtError("signature", "JWT signature does not verify");
  }
  return { header, payload };
}

/** Signs a payload as an RS256 JWT (tests and, later, AGS client assertions). */
export function signRs256(payload: JwtPayload, privateKey: KeyObject | string, kid?: string): string {
  const key = typeof privateKey === "string" ? createPrivateKey(privateKey) : privateKey;
  const header = { alg: "RS256", typ: "JWT", ...(kid ? { kid } : {}) };
  const encode = (v: unknown) => Buffer.from(JSON.stringify(v)).toString("base64url");
  const signingInput = `${encode(header)}.${encode(payload)}`;
  return `${signingInput}.${sign("RSA-SHA256", Buffer.from(signingInput), key).toString("base64url")}`;
}
