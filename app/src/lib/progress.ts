import { and, desc, eq, sql } from "drizzle-orm";
import { getDb, schema } from "./db";

export type ExerciseStatus = "ratkaistu" | "yritetty";

export interface SubmissionSummary {
  id: string;
  createdAt: string;
  status: "queued" | "running" | "done" | "error";
  passedCount: number;
  totalCount: number;
}

/** A submission solves the exercise when it finished and every test passed. */
export { isSolved } from "./submission-state";

/** Status per exercise for one student: solved if any submission solved it, else attempted. */
export async function getExerciseStatuses(userId: string): Promise<Map<string, ExerciseStatus>> {
  const rows = await getDb()
    .select({
      exerciseId: schema.submissions.exerciseId,
      solved: sql<boolean>`bool_or(${schema.submissions.status} = 'done' and ${schema.submissions.totalCount} > 0 and ${schema.submissions.passedCount} = ${schema.submissions.totalCount})`,
    })
    .from(schema.submissions)
    .where(eq(schema.submissions.userId, userId))
    .groupBy(schema.submissions.exerciseId);
  return new Map(rows.map((r) => [r.exerciseId, r.solved ? "ratkaistu" : "yritetty"]));
}

/** The student's own submissions for one exercise, newest first. */
export async function getSubmissionHistory(userId: string, exerciseId: string, limit = 50): Promise<SubmissionSummary[]> {
  const rows = await getDb()
    .select({
      id: schema.submissions.id,
      createdAt: schema.submissions.createdAt,
      status: schema.submissions.status,
      passedCount: schema.submissions.passedCount,
      totalCount: schema.submissions.totalCount,
    })
    .from(schema.submissions)
    .where(and(eq(schema.submissions.userId, userId), eq(schema.submissions.exerciseId, exerciseId)))
    .orderBy(desc(schema.submissions.createdAt))
    .limit(limit);
  return rows.map((r) => ({ ...r, createdAt: r.createdAt.toISOString() }));
}
