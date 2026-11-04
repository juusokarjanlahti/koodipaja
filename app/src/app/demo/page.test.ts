import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  notFound: () => {
    throw new Error("NEXT_NOT_FOUND");
  },
}));

afterEach(() => vi.unstubAllEnvs());

describe("/demo", () => {
  it("is 404 without DEMO_MODE, even with DEV_LOGIN on", async () => {
    vi.stubEnv("DEMO_MODE", "");
    vi.stubEnv("DEV_LOGIN", "true");
    const { default: DemoPage } = await import("./page");
    expect(() => DemoPage()).toThrow("NEXT_NOT_FOUND");
  });

  it("renders with DEMO_MODE=true", async () => {
    vi.stubEnv("DEMO_MODE", "true");
    const { default: DemoPage } = await import("./page");
    expect(DemoPage()).toBeTruthy();
  });
});
