/**
 * Output normalisation. MUST stay identical to normalise() in scripts/validate.py:
 * trailing whitespace on each line and trailing newlines are ignored.
 */
export function normaliseOutput(text: string): string {
  return text
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((line) => line.replace(/\s+$/u, ""))
    .join("\n")
    .replace(/\n+$/u, "");
}

export function outputsMatch(actual: string, expected: string): boolean {
  return normaliseOutput(actual) === normaliseOutput(expected);
}
