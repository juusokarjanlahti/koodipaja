import { describe, expect, it } from "vitest";
import { isSolved } from "./progress";

describe("isSolved", () => {
  it("is true only for finished submissions where every test passed", () => {
    expect(isSolved({ status: "done", passedCount: 5, totalCount: 5 })).toBe(true);
    expect(isSolved({ status: "done", passedCount: 4, totalCount: 5 })).toBe(false);
    expect(isSolved({ status: "running", passedCount: 0, totalCount: 5 })).toBe(false);
    expect(isSolved({ status: "error", passedCount: 0, totalCount: 0 })).toBe(false);
  });

  it("does not count an exercise without test cases as solved", () => {
    expect(isSolved({ status: "done", passedCount: 0, totalCount: 0 })).toBe(false);
  });
});
