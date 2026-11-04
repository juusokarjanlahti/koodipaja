import { afterEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";

afterEach(() => vi.unstubAllEnvs());

describe("POST /api/demo-login", () => {
  it("is 404 without DEMO_MODE, even with DEV_LOGIN on", async () => {
    vi.stubEnv("DEMO_MODE", "");
    vi.stubEnv("DEV_LOGIN", "true");
    const body = new FormData();
    body.set("role", "teacher");
    const response = await POST(new Request("http://localhost/api/demo-login", { method: "POST", body }));
    expect(response.status).toBe(404);
  });

  it("sends an unknown role back to /demo without creating anyone", async () => {
    vi.stubEnv("DEMO_MODE", "true");
    const body = new FormData();
    body.set("role", "admin");
    const response = await POST(new Request("http://localhost/api/demo-login", { method: "POST", body }));
    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe("http://localhost/demo");
    expect(response.headers.get("set-cookie")).toBeNull();
  });
});
