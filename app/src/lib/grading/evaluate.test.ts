import { describe, expect, it } from "vitest";
import type { RunResult } from "../runner/types";
import { applyApproval, evaluateCase, FORMATTING_DIFFERENCE, MAX_STORED_OUTPUT, TEACHER_APPROVED } from "./evaluate";
import { outputHash } from "./output-hash";

function run(partial: Partial<RunResult>): RunResult {
  return {
    statusId: 3,
    statusDescription: "Accepted",
    stdout: "",
    stderr: "",
    compileOutput: "",
    timeMs: 10,
    memoryKb: 1000,
    ...partial,
  };
}

describe("evaluateCase", () => {
  it("passes when the program runs and output matches", () => {
    const outcome = evaluateCase(run({ stdout: "Summa: 7\n" }), "Summa: 7\n");
    expect(outcome).toMatchObject({ passed: true, judgeStatus: "Accepted" });
  });

  it("reports Wrong Answer when output differs", () => {
    const outcome = evaluateCase(run({ stdout: "Summa: 34\n" }), "Summa: 7\n");
    expect(outcome).toMatchObject({ passed: false, judgeStatus: "Wrong Answer" });
  });

  it("fails on runtime error even if stdout happens to match", () => {
    const outcome = evaluateCase(
      run({ statusId: 11, statusDescription: "Runtime Error (NZEC)", stdout: "Summa: 7\n", stderr: "Traceback" }),
      "Summa: 7\n",
    );
    expect(outcome).toMatchObject({ passed: false, judgeStatus: "Runtime Error (NZEC)", stderr: "Traceback" });
  });

  it("passes with a formatting difference in lenient mode", () => {
    const outcome = evaluateCase(run({ stdout: "Mikä on nimesi? Hei, Aino\n" }), "Mikä on nimesi?\nHei, Aino!\n");
    expect(outcome).toMatchObject({ passed: true, judgeStatus: FORMATTING_DIFFERENCE });
  });

  it("requires exact output in exact mode", () => {
    const outcome = evaluateCase(run({ stdout: "Hei, Aino\n" }), "Hei, Aino!\n", "exact");
    expect(outcome).toMatchObject({ passed: false, judgeStatus: "Wrong Answer" });
  });

  it("still fails a wrong number in lenient mode", () => {
    const outcome = evaluateCase(run({ stdout: "summa 4.0\n" }), "Summa: 4\n");
    expect(outcome.passed).toBe(false);
  });

  it("fails on time limit", () => {
    const outcome = evaluateCase(run({ statusId: 5, statusDescription: "Time Limit Exceeded" }), "x");
    expect(outcome.passed).toBe(false);
  });

  it("truncates very long output", () => {
    const outcome = evaluateCase(run({ stdout: "a".repeat(MAX_STORED_OUTPUT * 2) }), "b");
    expect(outcome.stdout.length).toBeLessThan(MAX_STORED_OUTPUT + 50);
  });
});

describe("teacher approval (#50)", () => {
  const approve = (stdout: string, mode: "lenient" | "exact" = "lenient") => new Set([outputHash(stdout, mode)]);

  it("passes exactly the approved wrong answer", () => {
    const wrong = evaluateCase(run({ stdout: "Mikä on nimesi?\nTerve, Aino!\n" }), "Mikä on nimesi?\nHei, Aino!\n");
    expect(wrong.passed).toBe(false);
    const approved = applyApproval(wrong, approve("Mikä on nimesi?\nTerve, Aino!\n"));
    expect(approved).toMatchObject({ passed: true, judgeStatus: TEACHER_APPROVED });
    // A different wrong answer is not covered by that approval.
    const other = evaluateCase(run({ stdout: "Mikä on nimesi?\nMoi, Aino!\n" }), "Mikä on nimesi?\nHei, Aino!\n");
    expect(applyApproval(other, approve("Mikä on nimesi?\nTerve, Aino!\n")).passed).toBe(false);
  });

  it("follows the exercise's comparison: lenient ignores case and punctuation, exact does not", () => {
    expect(outputHash("Terve, Aino!", "lenient")).toBe(outputHash("terve aino", "lenient"));
    expect(outputHash("Terve, Aino!", "exact")).not.toBe(outputHash("terve aino", "exact"));
    expect(outputHash("Terve, Aino!\n\n", "exact")).toBe(outputHash("Terve, Aino!", "exact"));
    expect(outputHash("x", "lenient")).not.toBe(outputHash("x", "exact"));
  });

  it("never relaxes errors, timeouts or passing cases", () => {
    const timeout = evaluateCase(run({ statusId: 5, statusDescription: "Time Limit Exceeded", stdout: "x" }), "y");
    expect(timeout.outputHash).toBeNull();
    expect(applyApproval(timeout, approve("x"))).toBe(timeout);
    const ok = evaluateCase(run({ stdout: "y" }), "y");
    expect(applyApproval(ok, approve("y"))).toBe(ok);
  });

  it("hashes the full output even when the stored output is truncated", () => {
    const long = "a".repeat(MAX_STORED_OUTPUT * 2);
    expect(evaluateCase(run({ stdout: long }), "b").outputHash).toBe(outputHash(long, "lenient"));
  });
});
