import { describe, expect, it } from "vitest";
import type { RunResult } from "../runner/types";
import { allowRun, RUNS_PER_MINUTE, toRunOutput } from "./output";

const base: RunResult = {
  statusId: 3,
  statusDescription: "Accepted",
  stdout: "Hei, Aino!\n",
  stderr: "",
  compileOutput: "",
  timeMs: 12,
  memoryKb: 100,
};

describe("toRunOutput", () => {
  it("passes output through for a clean run", () => {
    expect(toRunOutput(base)).toEqual({
      ok: true,
      statusDescription: "Accepted",
      stdout: "Hei, Aino!\n",
      stderr: "",
      timeMs: 12,
    });
  });

  it("marks runtime errors as not ok and keeps stderr", () => {
    const out = toRunOutput({ ...base, statusId: 11, statusDescription: "Runtime Error (NZEC)", stderr: "ValueError" });
    expect(out).toMatchObject({ ok: false, stderr: "ValueError" });
  });

  it("includes compile output in stderr", () => {
    const out = toRunOutput({ ...base, statusId: 6, compileOutput: "SyntaxError", stderr: "" });
    expect(out.stderr).toBe("SyntaxError");
  });
});

describe("allowRun", () => {
  function fakeIncr() {
    const counts = new Map<string, number>();
    return async (key: string) => {
      const next = (counts.get(key) ?? 0) + 1;
      counts.set(key, next);
      return next;
    };
  }

  it("allows up to the limit per minute and blocks after", async () => {
    const incr = fakeIncr();
    const now = 1_000_000_000;
    for (let i = 0; i < RUNS_PER_MINUTE; i++) expect(await allowRun(incr, "u1", now)).toBe(true);
    expect(await allowRun(incr, "u1", now)).toBe(false);
  });

  it("resets in the next minute and is per user", async () => {
    const incr = fakeIncr();
    const now = 1_000_000_000;
    for (let i = 0; i <= RUNS_PER_MINUTE; i++) await allowRun(incr, "u1", now);
    expect(await allowRun(incr, "u1", now + 60_000)).toBe(true);
    expect(await allowRun(incr, "u2", now)).toBe(true);
  });
});
