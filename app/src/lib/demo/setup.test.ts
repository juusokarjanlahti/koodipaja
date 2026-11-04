import { describe, expect, it } from "vitest";
import { DEMO_ISSUER, isRealPlatform } from "./setup";

describe("isRealPlatform", () => {
  it("treats the demo and localhost test platforms as not real", () => {
    expect(isRealPlatform(DEMO_ISSUER)).toBe(false);
    expect(isRealPlatform("http://127.0.0.1:4100/issuer-abc")).toBe(false);
    expect(isRealPlatform("http://localhost:8080")).toBe(false);
  });

  it("treats a school's Moodle and anything unparseable as real", () => {
    expect(isRealPlatform("https://moodle.example-amk.fi")).toBe(true);
    expect(isRealPlatform("https://demo.koodipaja.invalid.attacker.fi")).toBe(true);
    expect(isRealPlatform("not a url")).toBe(true);
  });
});
