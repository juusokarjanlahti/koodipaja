import { createHash } from "node:crypto";
import { lenientTokens, normaliseOutput, type OutputMatchMode } from "./normalise";

/**
 * Identifies an output the way the exercise compares outputs: two outputs a lenient
 * exercise treats as the same (case, punctuation, spacing) get the same hash, an exact
 * exercise only ignores trailing whitespace. Used to approve an output for a course (#50):
 * the approval then covers every student whose program prints the same thing.
 */
export function outputHash(stdout: string, mode: OutputMatchMode): string {
  const normalised = mode === "lenient" ? lenientTokens(stdout).join(" ") : normaliseOutput(stdout);
  return createHash("sha256").update(`${mode}\u0000${normalised}`).digest("hex");
}
