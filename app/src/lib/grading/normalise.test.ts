import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { compareOutput, lenientTokens, normaliseOutput } from "./normalise";

interface Vector {
  note: string;
  expected: string;
  actual: string;
  result: "exact" | "lenient" | "fail";
}

const vectors: Vector[] = JSON.parse(
  readFileSync(path.resolve(__dirname, "../../../../scripts/output-match-cases.json"), "utf8"),
);

describe("compareOutput matches the shared vectors (same as validate.py)", () => {
  it.each(vectors.map((v) => [v.note, v] as const))("%s", (_note, v) => {
    expect(compareOutput(v.actual, v.expected, "lenient")).toBe(v.result);
    if (v.result !== "exact") {
      expect(compareOutput(v.actual, v.expected, "exact")).toBe("fail");
    }
  });
});

describe("normaliseOutput", () => {
  it("keeps leading whitespace and inner blank lines", () => {
    expect(normaliseOutput("  a\n\nb\n")).toBe("  a\n\nb");
  });
});

describe("lenientTokens", () => {
  it("treats decomposed and precomposed Finnish letters the same", () => {
    expect(lenientTokens("Väinö")).toEqual(lenientTokens("Väinö"));
  });

  it("attaches minus only to standalone numbers", () => {
    expect(lenientTokens("Summa: -4, 5-3")).toEqual(["summa", "-4", "5", "3"]);
  });
});
