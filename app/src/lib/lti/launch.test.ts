import { describe, expect, it } from "vitest";
import { JwtError, type JwtPayload } from "./jwt";
import { AGS_SCORE_SCOPE, CLAIM, exerciseIdFromPath, redirectPath, roleFromClaims, validateDeepLinkRequest, validateLaunch } from "./launch";

const platform = { issuer: "https://moodle.example.fi", clientId: "abc123", deploymentIds: ["1"] };
const NOW = 1_800_000_000;

function claims(overrides: JwtPayload = {}): JwtPayload {
  return {
    iss: platform.issuer,
    aud: platform.clientId,
    sub: "42",
    exp: NOW + 60,
    iat: NOW,
    nonce: "n1",
    name: "Aino Opiskelija",
    email: "aino@example.fi",
    [CLAIM.deploymentId]: "1",
    [CLAIM.version]: "1.3.0",
    [CLAIM.messageType]: "LtiResourceLinkRequest",
    [CLAIM.resourceLink]: { id: "rl-7" },
    [CLAIM.roles]: ["http://purl.imsglobal.org/vocab/lis/v2/membership#Learner"],
    [CLAIM.context]: { id: "course-9", title: "Ohjelmoinnin perusteet", label: "OHJ1" },
    [CLAIM.targetLinkUri]: "https://koodipaja.example.fi/exercises/01-tervehdys",
    ...overrides,
  };
}

function code(payload: JwtPayload): string {
  try {
    validateLaunch(payload, platform, "n1", NOW);
    return "ok";
  } catch (e) {
    if (e instanceof JwtError) return e.code;
    throw e;
  }
}

describe("validateLaunch", () => {
  it("accepts a valid launch and keeps only what is needed", () => {
    const launch = validateLaunch(claims(), platform, "n1", NOW);
    expect(launch).toEqual({
      sub: "42",
      displayName: "Aino Opiskelija",
      role: "student",
      deploymentId: "1",
      context: { id: "course-9", title: "Ohjelmoinnin perusteet" },
      resourceLinkId: "rl-7",
      targetLinkUri: "https://koodipaja.example.fi/exercises/01-tervehdys",
      ags: null,
    });
    expect(JSON.stringify(launch)).not.toContain("aino@example.fi");
  });

  it.each([
    ["iss", { iss: "https://evil.example" }],
    ["aud", { aud: "someone-else" }],
    ["azp", { aud: ["abc123", "other"] }],
    ["exp", { exp: NOW - 61 }],
    ["exp", { exp: undefined }],
    ["iat", { iat: NOW + 61 }],
    ["nonce", { nonce: "replayed" }],
    ["deployment", { [CLAIM.deploymentId]: "2" }],
    ["version", { [CLAIM.version]: "1.1" }],
    ["message_type", { [CLAIM.messageType]: "LtiDeepLinkingRequest" }],
    ["sub", { sub: "" }],
    ["resource_link", { [CLAIM.resourceLink]: {} }],
  ])("rejects a bad %s", (expected, overrides) => {
    expect(code(claims(overrides))).toBe(expected);
  });

  it("accepts an audience list with a matching azp and tolerates clock skew", () => {
    expect(code(claims({ aud: ["abc123", "other"], azp: "abc123" }))).toBe("ok");
    expect(code(claims({ exp: NOW - 30, iat: NOW + 30 }))).toBe("ok");
  });

  it("builds a name from given and family name, and works without a context", () => {
    const launch = validateLaunch(
      claims({ name: undefined, given_name: "Aino", family_name: "O", [CLAIM.context]: undefined }),
      platform,
      "n1",
      NOW,
    );
    expect(launch.displayName).toBe("Aino O");
    expect(launch.context).toBeNull();
  });
});

describe("AGS endpoint", () => {
  const lineitem = "https://moodle.example.fi/mod/lti/services.php/2/lineitems/7/lineitem?type_id=1";
  it("is kept when the activity takes scores", () => {
    const launch = validateLaunch(
      claims({ [CLAIM.agsEndpoint]: { lineitem, scope: [AGS_SCORE_SCOPE, "other"] } }),
      platform,
      "n1",
      NOW,
    );
    expect(launch.ags).toEqual({ lineItem: lineitem, scopes: [AGS_SCORE_SCOPE, "other"] });
  });

  it("is ignored without a line item or the score scope", () => {
    expect(validateLaunch(claims({ [CLAIM.agsEndpoint]: { scope: [AGS_SCORE_SCOPE] } }), platform, "n1", NOW).ags).toBeNull();
    expect(validateLaunch(claims({ [CLAIM.agsEndpoint]: { lineitem, scope: [] } }), platform, "n1", NOW).ags).toBeNull();
  });
});

describe("validateDeepLinkRequest", () => {
  const TEACHER = ["http://purl.imsglobal.org/vocab/lis/v2/membership#Instructor"];
  const settings = { deep_link_return_url: "https://moodle.example.fi/return", accept_types: ["ltiResourceLink"], accept_multiple: true, data: "d1" };
  const request = (overrides: JwtPayload = {}) =>
    claims({
      [CLAIM.messageType]: "LtiDeepLinkingRequest",
      [CLAIM.resourceLink]: undefined,
      [CLAIM.roles]: TEACHER,
      [CLAIM.deepLinkingSettings]: settings,
      ...overrides,
    });
  const dlCode = (payload: JwtPayload) => {
    try {
      validateDeepLinkRequest(payload, platform, "n1", NOW);
      return "ok";
    } catch (e) {
      if (e instanceof JwtError) return e.code;
      throw e;
    }
  };

  it("accepts a teacher's request and keeps the return URL and data", () => {
    expect(validateDeepLinkRequest(request(), platform, "n1", NOW)).toMatchObject({
      role: "teacher",
      returnUrl: "https://moodle.example.fi/return",
      acceptMultiple: true,
      data: "d1",
    });
  });

  it.each([
    ["role", { [CLAIM.roles]: ["http://purl.imsglobal.org/vocab/lis/v2/membership#Learner"] }],
    ["deep_linking", { [CLAIM.deepLinkingSettings]: { ...settings, deep_link_return_url: undefined } }],
    ["deep_linking", { [CLAIM.deepLinkingSettings]: { ...settings, deep_link_return_url: "javascript:alert(1)" } }],
    ["deep_linking", { [CLAIM.deepLinkingSettings]: { ...settings, accept_types: ["file"] } }],
    ["message_type", { [CLAIM.messageType]: "LtiResourceLinkRequest" }],
    ["nonce", { nonce: "other" }],
  ])("rejects a bad %s", (expected, overrides) => {
    expect(dlCode(request(overrides))).toBe(expected);
  });

  it("defaults to a single choice", () => {
    const single = { ...settings, accept_multiple: undefined };
    expect(validateDeepLinkRequest(request({ [CLAIM.deepLinkingSettings]: single }), platform, "n1", NOW).acceptMultiple).toBe(false);
  });
});

describe("exerciseIdFromPath", () => {
  it("finds exercise pages only", () => {
    expect(exerciseIdFromPath("/exercises/01-tervehdys")).toBe("01-tervehdys");
    expect(exerciseIdFromPath("/exercises/java-lukujen-summa?x=1")).toBe("java-lukujen-summa");
    expect(exerciseIdFromPath("/exercises/../admin")).toBeNull();
    expect(exerciseIdFromPath("/muistilista")).toBeNull();
  });
});

describe("roleFromClaims", () => {
  it("maps teaching roles to teacher and everything else to student", () => {
    expect(roleFromClaims(["http://purl.imsglobal.org/vocab/lis/v2/membership#Instructor"])).toBe("teacher");
    expect(roleFromClaims(["http://purl.imsglobal.org/vocab/lis/v2/membership/Instructor#TeachingAssistant"])).toBe("teacher");
    expect(roleFromClaims(["Instructor"])).toBe("teacher");
    expect(roleFromClaims(["http://purl.imsglobal.org/vocab/lis/v2/membership#Learner"])).toBe("student");
    // Institution-level admin without a course teaching role is not a course teacher.
    expect(roleFromClaims(["http://purl.imsglobal.org/vocab/lis/v2/institution/person#Administrator"])).toBe("student");
    expect(roleFromClaims(undefined)).toBe("student");
  });
});

describe("redirectPath", () => {
  const origin = "https://koodipaja.example.fi";
  it("keeps same-site paths and drops everything else", () => {
    expect(redirectPath(`${origin}/exercises/01-tervehdys?x=1`, origin)).toBe("/exercises/01-tervehdys?x=1");
    expect(redirectPath("https://evil.example/exercises", origin)).toBe("/");
    expect(redirectPath(`${origin}/api/lti/launch`, origin)).toBe("/");
    expect(redirectPath("not a url", origin)).toBe("/");
    expect(redirectPath(null, origin)).toBe("/");
  });
});
