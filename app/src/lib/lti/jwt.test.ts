import { generateKeyPairSync } from "node:crypto";
import { describe, expect, it } from "vitest";
import { decodeJwt, JwtError, selectKey, signRs256, verifyRs256, type Jwk } from "./jwt";
import { publicJwk } from "./keys";

const { privateKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
const other = generateKeyPairSync("rsa", { modulusLength: 2048 });
const jwk = publicJwk(privateKey);

function code(fn: () => unknown): string {
  try {
    fn();
  } catch (e) {
    if (e instanceof JwtError) return e.code;
    throw e;
  }
  return "ok";
}

describe("jwt", () => {
  it("round-trips a signed token", () => {
    const token = signRs256({ sub: "u1", n: 1 }, privateKey, jwk.kid);
    const { header, payload } = verifyRs256(token, jwk);
    expect(header).toMatchObject({ alg: "RS256", kid: jwk.kid });
    expect(payload).toEqual({ sub: "u1", n: 1 });
  });

  it("rejects a tampered payload", () => {
    const token = signRs256({ sub: "u1" }, privateKey);
    const [h, , s] = token.split(".");
    const forged = `${h}.${Buffer.from(JSON.stringify({ sub: "admin" })).toString("base64url")}.${s}`;
    expect(code(() => verifyRs256(forged, jwk))).toBe("signature");
  });

  it("rejects a token signed by another key", () => {
    const token = signRs256({ sub: "u1" }, other.privateKey);
    expect(code(() => verifyRs256(token, jwk))).toBe("signature");
  });

  it("rejects alg none and HS256", () => {
    const enc = (v: unknown) => Buffer.from(JSON.stringify(v)).toString("base64url");
    const none = `${enc({ alg: "none" })}.${enc({ sub: "u1" })}.x`;
    const hs = `${enc({ alg: "HS256" })}.${enc({ sub: "u1" })}.abc`;
    expect(code(() => verifyRs256(none, jwk))).toBe("alg");
    expect(code(() => verifyRs256(hs, jwk))).toBe("alg");
  });

  it("rejects malformed tokens", () => {
    expect(code(() => decodeJwt("a.b"))).toBe("malformed");
    expect(code(() => decodeJwt("a.b.c=="))).toBe("malformed");
    expect(code(() => decodeJwt(`${Buffer.from("[]").toString("base64url")}.e30.x`))).toBe("malformed");
  });

  it("selects keys by kid, or the only key without one", () => {
    const keys: Jwk[] = [jwk, { ...publicJwk(other.privateKey) }];
    expect(selectKey(keys, { kid: jwk.kid })).toBe(jwk);
    expect(selectKey(keys, { kid: "unknown" })).toBeNull();
    expect(selectKey(keys, {})).toBeNull();
    expect(selectKey([jwk], {})).toBe(jwk);
    expect(selectKey([{ ...jwk, use: "enc" }], { kid: jwk.kid })).toBeNull();
  });
});
