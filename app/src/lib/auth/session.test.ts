import { describe, expect, it } from "vitest";
import { createSessionToken, verifySessionToken } from "./session";

const secret = "a".repeat(64);
const userId = "6f1c2b9e-0000-4000-8000-000000000001";

describe("session tokens", () => {
  it("round-trips a valid token", () => {
    expect(verifySessionToken(createSessionToken(userId, secret), secret)).toBe(userId);
  });

  it("rejects a token signed with another secret", () => {
    expect(verifySessionToken(createSessionToken(userId, "b".repeat(64)), secret)).toBeNull();
  });

  it("rejects a tampered payload", () => {
    const [, signature] = createSessionToken(userId, secret).split(".");
    const forged = Buffer.from(`someone-else:${Date.now() / 1000 + 999}`).toString("base64url");
    expect(verifySessionToken(`${forged}.${signature}`, secret)).toBeNull();
  });

  it("rejects an expired token", () => {
    const token = createSessionToken(userId, secret, Date.now() - 1000 * 60 * 60 * 24 * 30);
    expect(verifySessionToken(token, secret)).toBeNull();
  });

  it("rejects malformed input", () => {
    expect(verifySessionToken("", secret)).toBeNull();
    expect(verifySessionToken("abc", secret)).toBeNull();
    expect(verifySessionToken("abc.def", secret)).toBeNull();
  });
});
