import { afterEach, describe, expect, it, vi } from "vitest";
import { demoDisplayName, demoModeEnabled, parseDemoRole } from "./mode";

afterEach(() => vi.unstubAllEnvs());

describe("demoModeEnabled", () => {
  it("is on only with DEMO_MODE=true", () => {
    vi.stubEnv("DEMO_MODE", "true");
    expect(demoModeEnabled()).toBe(true);
    vi.stubEnv("DEMO_MODE", "1");
    expect(demoModeEnabled()).toBe(false);
    vi.stubEnv("DEMO_MODE", "");
    expect(demoModeEnabled()).toBe(false);
  });

  it("does not depend on DEV_LOGIN and works in production", () => {
    vi.stubEnv("DEMO_MODE", "true");
    vi.stubEnv("DEV_LOGIN", "false");
    vi.stubEnv("NODE_ENV", "production");
    expect(demoModeEnabled()).toBe(true);
  });
});

describe("parseDemoRole", () => {
  it("accepts only student and teacher", () => {
    expect(parseDemoRole("student")).toBe("student");
    expect(parseDemoRole("teacher")).toBe("teacher");
    expect(parseDemoRole("admin")).toBeNull();
    expect(parseDemoRole(undefined)).toBeNull();
  });
});

describe("demoDisplayName", () => {
  it("names the role and a short id", () => {
    expect(demoDisplayName("student", "7f3a91c2-0000-4000-8000-000000000000")).toBe("Demo-opiskelija 7F3A");
    expect(demoDisplayName("teacher", "ab12cd34-0000-4000-8000-000000000000")).toBe("Demo-opettaja AB12");
  });
});
