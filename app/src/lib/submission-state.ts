/** Client-safe: whether a submission solves its exercise (shared by server and browser code). */
export function isSolved(s: { status: string; passedCount: number; totalCount: number }): boolean {
  return s.status === "done" && s.totalCount > 0 && s.passedCount === s.totalCount;
}

/** Encouragement when more tests pass than in the previous finished submission; null otherwise. */
export function improvementNote(current: { passedCount: number }, previous?: { passedCount: number }): string | null {
  if (!previous) return null;
  const gained = current.passedCount - previous.passedCount;
  if (gained <= 0) return null;
  return gained === 1 ? "Yksi testi enemmän kuin viime kerralla. Hyvä, eteneminen näkyy." : `${gained} testiä enemmän kuin viime kerralla. Hyvä, eteneminen näkyy.`;
}
