/**
 * Output comparison, see docs/adr/0003-joustava-tulosteen-vertailu.md.
 * MUST stay identical to compare() in scripts/validate.py. Shared vectors:
 * scripts/output-match-cases.json (tested in normalise.test.ts and validate.py --self-test).
 */

export type OutputMatchMode = "lenient" | "exact";
export type MatchResult = "exact" | "lenient" | "fail";

/** Exact mode: trailing whitespace on each line and trailing newlines are ignored. */
export function normaliseOutput(text: string): string {
  return text
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((line) => line.replace(/\s+$/u, ""))
    .join("\n")
    .replace(/\n+$/u, "");
}

// A number may carry a minus sign only when not preceded by a letter, digit or dot,
// so "Summa: -4" gives -4 but "5-3" gives 5 and 3. Words are runs of letters.
const TOKEN_RE = /(?<![\p{L}\p{N}])(?<!\.)-?[0-9]+(?:\.[0-9]+)?|[0-9]+(?:\.[0-9]+)?|\p{L}+/gu;

/** Lenient mode: compare only words (case-insensitive) and numbers, in order. */
export function lenientTokens(text: string): string[] {
  return text.normalize("NFC").toLowerCase().match(TOKEN_RE) ?? [];
}

export function compareOutput(actual: string, expected: string, mode: OutputMatchMode = "lenient"): MatchResult {
  if (normaliseOutput(actual) === normaliseOutput(expected)) return "exact";
  if (mode === "lenient") {
    const a = lenientTokens(actual);
    const e = lenientTokens(expected);
    if (a.length === e.length && a.every((token, i) => token === e[i])) return "lenient";
  }
  return "fail";
}
