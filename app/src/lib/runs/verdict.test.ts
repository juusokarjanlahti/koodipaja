import { describe, expect, it } from "vitest";
import type { RunOutput } from "./output";
import { runVerdict } from "./verdict";

const ok = (stdout: string): RunOutput => ({ ok: true, stdout, stderr: "", statusDescription: "Accepted", timeMs: 12 });
const example = { stdin: "Aino\n", stdout: "Mikä on nimesi?\nHei, Aino!\n" };

describe("runVerdict", () => {
  it("compares a run with the example input to the example output", () => {
    expect(runVerdict(ok("Mikä on nimesi?\nHei, Aino!\n"), "Aino\n", example, "lenient")).toEqual({
      kind: "matches-example",
      formattingDifference: false,
    });
    expect(runVerdict(ok("mikä on nimesi? hei aino"), "Aino", example, "lenient")).toEqual({
      kind: "matches-example",
      formattingDifference: true,
    });
    expect(runVerdict(ok("Hei"), "Aino\r\n", example, "lenient")).toEqual({ kind: "differs-from-example", expected: example.stdout });
  });

  it("uses exact matching when the exercise asks for it", () => {
    expect(runVerdict(ok("mikä on nimesi? hei aino"), "Aino", example, "exact").kind).toBe("differs-from-example");
  });

  it("does not judge other inputs or failed runs", () => {
    expect(runVerdict(ok("Hei, Pekka!"), "Pekka", example, "lenient")).toEqual({ kind: "finished" });
    expect(runVerdict(ok("x"), "Aino", null, "lenient")).toEqual({ kind: "finished" });
    expect(runVerdict({ ...ok(""), ok: false }, "Aino", example, "lenient")).toEqual({ kind: "failed" });
  });
});
