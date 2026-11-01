import { describe, expect, it } from "vitest";
import { answerKey, groupByKey, keyParts } from "./key";

describe("answerKey", () => {
  it("is the same for the same wrong outputs in any order", () => {
    const a = answerKey([
      { position: 2, judgeStatus: "Wrong Answer", outputHash: "h2" },
      { position: 0, judgeStatus: "Wrong Answer", outputHash: "h0" },
    ]);
    const b = answerKey([
      { position: 0, judgeStatus: "Wrong Answer", outputHash: "h0" },
      { position: 2, judgeStatus: "Wrong Answer", outputHash: "h2" },
    ]);
    expect(a).toBe("0:h0|2:h2");
    expect(a).toBe(b);
    expect(keyParts(a!)).toEqual([
      { position: 0, hash: "h0" },
      { position: 2, hash: "h2" },
    ]);
  });

  it("does not exist for passing submissions, errors or timeouts", () => {
    expect(answerKey([])).toBeNull();
    expect(answerKey([{ position: 0, judgeStatus: "Runtime Error (NZEC)", outputHash: null }])).toBeNull();
    expect(
      answerKey([
        { position: 0, judgeStatus: "Wrong Answer", outputHash: "h" },
        { position: 1, judgeStatus: "Time Limit Exceeded", outputHash: null },
      ]),
    ).toBeNull();
  });
});

describe("groupByKey", () => {
  it("puts the same answers together, biggest group first, and keeps the rest alone", () => {
    const items = [
      { id: 1, key: "a" },
      { id: 2, key: "b" },
      { id: 3, key: "a" },
      { id: 4, key: null },
    ];
    expect(groupByKey(items, (i) => i.key).map((g) => g.map((i) => i.id))).toEqual([[1, 3], [2], [4]]);
  });
});
