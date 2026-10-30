import { describe, expect, it } from "vitest";
import { improvementNote } from "./submission-state";

describe("improvementNote", () => {
  it("praises only a real gain over the previous finished submission", () => {
    expect(improvementNote({ passedCount: 3 }, { passedCount: 2 })).toMatch(/^Yksi testi enemmän/);
    expect(improvementNote({ passedCount: 4 }, { passedCount: 1 })).toMatch(/^3 testiä enemmän/);
    expect(improvementNote({ passedCount: 2 }, { passedCount: 2 })).toBeNull();
    expect(improvementNote({ passedCount: 1 }, { passedCount: 2 })).toBeNull();
    expect(improvementNote({ passedCount: 1 })).toBeNull();
  });
});
