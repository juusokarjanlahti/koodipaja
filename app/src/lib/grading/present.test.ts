import { describe, expect, it } from "vitest";
import type { Submission, SubmissionResult, TestCase } from "../db/schema";
import { presentSubmission } from "./present";

const submission: Submission = {
  id: "s1",
  userId: "u1",
  exerciseId: "02-lukujen-summa",
  sourceCode: "print(1)",
  status: "done",
  passedCount: 1,
  totalCount: 2,
  errorMessage: "internal detail that must not leak",
  createdAt: new Date(),
  finishedAt: new Date(),
};

const cases: TestCase[] = [
  { id: 11, exerciseId: "x", position: 1, name: "Piilotettu", stdin: "SECRET_IN", expectedStdout: "SECRET_OUT", hidden: true },
  { id: 10, exerciseId: "x", position: 0, name: "Näkyvä", stdin: "3\n0\n", expectedStdout: "Summa: 3\n", hidden: false },
];

const results: SubmissionResult[] = [
  { id: 1, submissionId: "s1", testCaseId: 10, passed: true, judgeStatus: "Accepted", stdout: "Summa: 3\n", stderr: "", timeMs: 5, memoryKb: 1 },
  { id: 2, submissionId: "s1", testCaseId: 11, passed: false, judgeStatus: "Wrong Answer", stdout: "SECRET_ECHO", stderr: "", timeMs: 5, memoryKb: 1 },
];

describe("presentSubmission", () => {
  const presented = presentSubmission(submission, cases, results);

  it("orders cases by position", () => {
    expect(presented.cases.map((c) => c.name)).toEqual(["Näkyvä", "Piilotettu"]);
  });

  it("shows details for visible cases", () => {
    expect(presented.cases[0]).toMatchObject({ passed: true, stdin: "3\n0\n", stdout: "Summa: 3\n" });
  });

  it("never leaks hidden case input, expected output or program output", () => {
    const json = JSON.stringify(presented);
    expect(json).not.toContain("SECRET_IN");
    expect(json).not.toContain("SECRET_OUT");
    expect(json).not.toContain("SECRET_ECHO");
    expect(presented.cases[1]).toMatchObject({ hidden: true, passed: false });
  });

  it("does not expose internal error messages", () => {
    expect(JSON.stringify(presented)).not.toContain("internal detail");
  });
});
