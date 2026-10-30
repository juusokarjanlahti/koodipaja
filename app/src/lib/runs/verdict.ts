import { compareOutput, type OutputMatchMode } from "../grading/normalise";
import type { RunOutput } from "./output";

/**
 * What "Aja" can honestly say about a run. Only the assignment's example has a known
 * expected output on the page, so only a run with exactly that input is compared, with
 * the same rules as grading (ADR 0003). Every other run just finished.
 */
export type RunVerdict =
  | { kind: "matches-example"; formattingDifference: boolean }
  | { kind: "differs-from-example"; expected: string }
  | { kind: "finished" }
  | { kind: "failed" };

const sameInput = (a: string, b: string) => a.replace(/\r\n/g, "\n").trimEnd() === b.replace(/\r\n/g, "\n").trimEnd();

export function runVerdict(
  output: RunOutput,
  ranWithStdin: string,
  example: { stdin: string; stdout: string } | null,
  mode: OutputMatchMode,
): RunVerdict {
  if (!output.ok) return { kind: "failed" };
  if (!example || !sameInput(ranWithStdin, example.stdin)) return { kind: "finished" };
  const match = compareOutput(output.stdout, example.stdout, mode);
  if (match === "fail") return { kind: "differs-from-example", expected: example.stdout };
  return { kind: "matches-example", formattingDifference: match === "lenient" };
}
