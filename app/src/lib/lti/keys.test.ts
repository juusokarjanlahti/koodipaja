import { generateKeyPairSync } from "node:crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { JwtError } from "./jwt";
import { clearKeyCache, platformKey, publicJwk } from "./keys";

const a = publicJwk(generateKeyPairSync("rsa", { modulusLength: 2048 }).privateKey);
const b = publicJwk(generateKeyPairSync("rsa", { modulusLength: 2048 }).privateKey);

function jwks(keys: unknown[]) {
  return vi.fn(async () => new Response(JSON.stringify({ keys }), { status: 200 }));
}

describe("platformKey", () => {
  beforeEach(() => clearKeyCache());

  it("caches the key set", async () => {
    const fetchImpl = jwks([a]);
    await platformKey("https://moodle/jwks", { kid: a.kid }, fetchImpl, 0);
    await platformKey("https://moodle/jwks", { kid: a.kid }, fetchImpl, 1000);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it("refetches once for an unknown kid (key rotation)", async () => {
    const first = jwks([a]);
    await platformKey("https://moodle/jwks", { kid: a.kid }, first, 0);
    const rotated = jwks([b]);
    expect(await platformKey("https://moodle/jwks", { kid: b.kid }, rotated, 1000)).toEqual(b);
    expect(rotated).toHaveBeenCalledTimes(1);
  });

  it("refetches after ten minutes", async () => {
    const fetchImpl = jwks([a]);
    await platformKey("https://moodle/jwks", { kid: a.kid }, fetchImpl, 0);
    await platformKey("https://moodle/jwks", { kid: a.kid }, fetchImpl, 11 * 60 * 1000);
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it("fails clearly when no key matches or the endpoint is broken", async () => {
    await expect(platformKey("https://moodle/jwks", { kid: "x" }, jwks([a]), 0)).rejects.toMatchObject({ code: "kid" });
    const broken = vi.fn(async () => new Response("nope", { status: 500 }));
    await expect(platformKey("https://other/jwks", { kid: "x" }, broken, 0)).rejects.toBeInstanceOf(JwtError);
  });

  it("gives the tool key a stable thumbprint kid", () => {
    const { privateKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
    expect(publicJwk(privateKey).kid).toBe(publicJwk(privateKey).kid);
    expect(publicJwk(privateKey)).not.toHaveProperty("d");
  });
});
