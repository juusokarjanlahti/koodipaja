/** Client-safe: whether a submission solves its exercise (shared by server and browser code). */
export function isSolved(s: { status: string; passedCount: number; totalCount: number }): boolean {
  return s.status === "done" && s.totalCount > 0 && s.passedCount === s.totalCount;
}
