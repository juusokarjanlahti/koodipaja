import { describe, expect, it } from "vitest";
import { DEFAULT_JUDGE0_LANGUAGE_IDS, judge0LanguageIds } from "./client";

describe("judge0LanguageIds", () => {
  it("uses the Judge0 CE 1.13 defaults without configuration", () => {
    expect(judge0LanguageIds(undefined)).toEqual(DEFAULT_JUDGE0_LANGUAGE_IDS);
    expect(judge0LanguageIds(undefined).python).toBe(71);
  });

  it("lets a custom Judge0 image override ids per language", () => {
    const ids = judge0LanguageIds('{"python": 1001, "rust": 1007}');
    expect(ids.python).toBe(1001);
    expect(ids.rust).toBe(1007);
    expect(ids.java).toBe(62);
  });

  it("ignores non-integer values", () => {
    expect(judge0LanguageIds('{"python": "x"}').python).toBe(71);
  });
});
