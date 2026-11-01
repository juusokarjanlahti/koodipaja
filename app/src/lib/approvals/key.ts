/**
 * The signature of "the same answer" (#51): which test cases failed with which output
 * (by output hash). Two submissions with the same key print the same wrong outputs, so one
 * teacher decision covers both. A submission that failed for another reason (an error,
 * a timeout) has no key: there is no single output to approve.
 */
export type FailedCase = { position: number; judgeStatus: string; outputHash: string | null };

export function answerKey(failed: FailedCase[], wrongAnswer = "Wrong Answer"): string | null {
  if (failed.length === 0) return null;
  if (failed.some((f) => f.judgeStatus !== wrongAnswer || !f.outputHash)) return null;
  return [...failed]
    .sort((a, b) => a.position - b.position)
    .map((f) => `${f.position}:${f.outputHash}`)
    .join("|");
}

export function keyParts(key: string): { position: number; hash: string }[] {
  return key.split("|").map((part) => {
    const [position, hash] = part.split(":");
    return { position: Number(position), hash };
  });
}

/** Groups items with the same key, largest group first; items without a key stay alone. */
export function groupByKey<T>(items: T[], keyOf: (item: T) => string | null): T[][] {
  const groups = new Map<string, T[]>();
  const singles: T[][] = [];
  for (const item of items) {
    const key = keyOf(item);
    if (key === null) singles.push([item]);
    else groups.set(key, [...(groups.get(key) ?? []), item]);
  }
  return [...[...groups.values()].sort((a, b) => b.length - a.length), ...singles];
}
