/** Pure progress matrix for the teacher's course view (docs/specs/teacher-progress.md). */

export type CellState = "ratkaistu" | "yritetty" | "ei-aloitettu";

export type Student = { id: string; name: string };
export type CourseExercise = { id: string; title: string; language: string };
export type ProgressRow = { userId: string; exerciseId: string; solved: boolean; attempts: number };

export type Cell = { state: CellState; attempts: number };
export type StudentProgress = Student & { cells: Cell[]; solvedCount: number };
export type CourseProgress = {
  exercises: (CourseExercise & { solvedCount: number; solveRate: number | null })[];
  students: StudentProgress[];
};

export type SortOrder = "nimi" | "ratkaistu";

export function buildProgress(
  students: Student[],
  exercises: CourseExercise[],
  rows: ProgressRow[],
  sort: SortOrder = "nimi",
): CourseProgress {
  const byKey = new Map(rows.map((r) => [`${r.userId}\u0000${r.exerciseId}`, r]));
  const progress: StudentProgress[] = students.map((s) => {
    const cells = exercises.map((e): Cell => {
      const r = byKey.get(`${s.id}\u0000${e.id}`);
      if (!r || r.attempts === 0) return { state: "ei-aloitettu", attempts: 0 };
      return { state: r.solved ? "ratkaistu" : "yritetty", attempts: r.attempts };
    });
    return { ...s, cells, solvedCount: cells.filter((c) => c.state === "ratkaistu").length };
  });

  const byName = (a: StudentProgress, b: StudentProgress) => a.name.localeCompare(b.name, "fi");
  progress.sort(sort === "ratkaistu" ? (a, b) => a.solvedCount - b.solvedCount || byName(a, b) : byName);

  return {
    exercises: exercises.map((e, i) => {
      const solvedCount = progress.filter((p) => p.cells[i].state === "ratkaistu").length;
      return { ...e, solvedCount, solveRate: students.length ? solvedCount / students.length : null };
    }),
    students: progress,
  };
}

export function cellLabel(cell: Cell): string {
  if (cell.state === "ratkaistu") return "Ratkaistu";
  if (cell.state === "yritetty") return `Yritetty (${cell.attempts})`;
  return "Ei aloitettu";
}

export function percent(rate: number | null): string {
  return rate === null ? "–" : `${Math.round(rate * 100)} %`;
}
