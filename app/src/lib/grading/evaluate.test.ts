import { describe, expect, it } from "vitest";
import type { RunResult } from "../judge0/client";
import { evaluateCase, MAX_STORED_OUTPUT } from "./evaluate";

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

  it("fails on time limit", () => {
    const outcome = evaluateCase(run({ statusId: 5, statusDescription: "Time Limit Exceeded" }), "x");
    expect(outcome.passed).toBe(false);
  });

  it("truncates very long output", () => {
    const outcome = evaluateCase(run({ stdout: "a".repeat(MAX_STORED_OUTPUT * 2) }), "b");
    expect(outcome.stdout.length).toBeLessThan(MAX_STORED_OUTPUT + 50);
  });
});
