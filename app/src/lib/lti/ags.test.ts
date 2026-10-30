import { generateKeyPairSync } from "node:crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { accessToken, AgsError, bestSubmission, clearTokenCache, postScore, scorePayload, scoresUrl } from "./ags";
import { verifyRs256 } from "./jwt";
import { publicJwk } from "./keys";
import { AGS_SCORE_SCOPE } from "./launch";

const { privateKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
const platform = { clientId: "abc123", authTokenUrl: "https://moodle.example.fi/mod/lti/token.php" };
const at = (minute: number) => new Date(Date.UTC(2026, 9, 30, 10, minute));

describe("bestSubmission", () => {
  it("keeps the best result even when a later one is worse", () => {
    const best = bestSubmission([
      { passedCount: 1, totalCount: 4, createdAt: at(1) },
      { passedCount: 4, totalCount: 4, createdAt: at(2) },
      { passedCount: 0, totalCount: 4, createdAt: at(3) },
    ]);
    expect(best).toMatchObject({ passedCount: 4, createdAt: at(2) });
  });

  it("compares fractions, prefers more cases, then the earliest, and skips empty runs", () => {
    expect(bestSubmission([{ passedCount: 2, totalCount: 4, createdAt: at(1) }, { passedCount: 3, totalCount: 5, createdAt: at(2) }])?.passedCount).toBe(3);
    expect(bestSubmission([{ passedCount: 1, totalCount: 2, createdAt: at(1) }, { passedCount: 2, totalCount: 4, createdAt: at(2) }])?.totalCount).toBe(4);
    expect(bestSubmission([{ passedCount: 2, totalCount: 4, createdAt: at(2) }, { passedCount: 2, totalCount: 4, createdAt: at(1) }])?.createdAt).toEqual(at(1));
    expect(bestSubmission([{ passedCount: 0, totalCount: 0, createdAt: at(1) }])).toBeNull();
    expect(bestSubmission([])).toBeNull();
  });
});

describe("scoresUrl", () => {
  it("adds /scores to the path and keeps the query", () => {
    expect(scoresUrl("https://moodle.example.fi/mod/lti/services.php/2/lineitems/7/lineitem?type_id=1")).toBe(
      "https://moodle.example.fi/mod/lti/services.php/2/lineitems/7/lineitem/scores?type_id=1",
    );
    expect(scoresUrl("https://lms.example/lineitems/7/")).toBe("https://lms.example/lineitems/7/scores");
  });
});

describe("scorePayload", () => {
  it("sends passed of total as a completed, fully graded score", () => {
    expect(scorePayload("42", 3, 4, at(5))).toEqual({
      userId: "42",
      scoreGiven: 3,
      scoreMaximum: 4,
      activityProgress: "Completed",
      gradingProgress: "FullyGraded",
      timestamp: "2026-10-30T10:05:00.000Z",
    });
  });
});

describe("accessToken", () => {
  beforeEach(() => clearTokenCache());

  it("requests a token with a signed client assertion and caches it", async () => {
    const fetchImpl = vi.fn(async (_url: string | URL | Request, init?: RequestInit) => {
      const body = new URLSearchParams(init?.body as URLSearchParams);
      expect(body.get("grant_type")).toBe("client_credentials");
      expect(body.get("scope")).toBe(AGS_SCORE_SCOPE);
      expect(body.get("client_assertion_type")).toBe("urn:ietf:params:oauth:client-assertion-type:jwt-bearer");
      const { payload } = verifyRs256(body.get("client_assertion")!, publicJwk(privateKey));
      expect(payload).toMatchObject({ iss: "abc123", sub: "abc123", aud: platform.authTokenUrl });
      return new Response(JSON.stringify({ access_token: "t1", expires_in: 3600 }), { status: 200 });
    });
    expect(await accessToken(platform, privateKey, AGS_SCORE_SCOPE, fetchImpl, 0)).toBe("t1");
    expect(await accessToken(platform, privateKey, AGS_SCORE_SCOPE, fetchImpl, 60_000)).toBe("t1");
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it("renews shortly before the token expires", async () => {
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify({ access_token: "t", expires_in: 120 }), { status: 200 }));
    await accessToken(platform, privateKey, AGS_SCORE_SCOPE, fetchImpl, 0);
    await accessToken(platform, privateKey, AGS_SCORE_SCOPE, fetchImpl, 61_000);
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it("reports a refused token request", async () => {
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify({ error: "invalid_client" }), { status: 400 }));
    await expect(accessToken(platform, privateKey, AGS_SCORE_SCOPE, fetchImpl, 0)).rejects.toThrow(
      new AgsError("token request returned HTTP 400 (invalid_client)"),
    );
  });
});

describe("postScore", () => {
  it("posts the score with the bearer token and score media type", async () => {
    const fetchImpl = vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
      expect(String(url)).toBe("https://lms.example/lineitems/7/scores");
      expect(init?.headers).toMatchObject({ authorization: "Bearer t1", "content-type": "application/vnd.ims.lis.v1.score+json" });
      expect(JSON.parse(String(init?.body))).toMatchObject({ userId: "42", scoreGiven: 1 });
      return new Response(null, { status: 204 });
    });
    await postScore("https://lms.example/lineitems/7", "t1", scorePayload("42", 1, 2), fetchImpl);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it("fails on an error status with a short detail", async () => {
    const fetchImpl = vi.fn(async () => new Response("no such line item", { status: 404 }));
    await expect(postScore("https://lms.example/x", "t", scorePayload("1", 0, 1), fetchImpl)).rejects.toThrow(
      "score request returned HTTP 404: no such line item",
    );
  });
});
