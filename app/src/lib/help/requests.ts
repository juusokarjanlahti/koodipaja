import { and, desc, eq } from "drizzle-orm";
import { getDb, schema } from "../db";

export const MAX_HELP_MESSAGE = 500;
export const MAX_HELP_REPLY = 1000;

export interface HelpRequestView {
  id: string;
  kind: "apu" | "kiista";
  message: string | null;
  status: "open" | "answered";
  reply: string | null;
}

/** The course whose teacher can see this student's work on the exercise, if any. */
export async function courseForStudentExercise(userId: string, exerciseId: string): Promise<number | null> {
  const [row] = await getDb()
    .select({ courseId: schema.courseMemberships.courseId })
    .from(schema.courseMemberships)
    .innerJoin(schema.ltiResourceLinks, eq(schema.ltiResourceLinks.courseId, schema.courseMemberships.courseId))
    .where(
      and(
        eq(schema.courseMemberships.userId, userId),
        eq(schema.courseMemberships.role, "student"),
        eq(schema.ltiResourceLinks.exerciseId, exerciseId),
      ),
    )
    .limit(1);
  return row?.courseId ?? null;
}

/** The student's open request for the exercise, otherwise the latest answered one. */
export async function currentHelpRequest(userId: string, exerciseId: string): Promise<HelpRequestView | null> {
  const [row] = await getDb()
    .select({
      id: schema.helpRequests.id,
      kind: schema.helpRequests.kind,
      message: schema.helpRequests.message,
      status: schema.helpRequests.status,
      reply: schema.helpRequests.reply,
    })
    .from(schema.helpRequests)
    .where(and(eq(schema.helpRequests.userId, userId), eq(schema.helpRequests.exerciseId, exerciseId)))
    // Open first, then newest.
    .orderBy(desc(schema.helpRequests.status), desc(schema.helpRequests.createdAt))
    .limit(1);
  return row ?? null;
}

/** Creates the request, or updates the student's open one (one open request per exercise). */
export async function saveHelpRequest(input: {
  userId: string;
  exerciseId: string;
  courseId: number;
  kind: "apu" | "kiista";
  message: string | null;
}): Promise<void> {
  const db = getDb();
  const [latest] = await db
    .select({ id: schema.submissions.id })
    .from(schema.submissions)
    .where(and(eq(schema.submissions.userId, input.userId), eq(schema.submissions.exerciseId, input.exerciseId)))
    .orderBy(desc(schema.submissions.createdAt))
    .limit(1);
  await db
    .insert(schema.helpRequests)
    .values({ ...input, submissionId: latest?.id ?? null })
    .onConflictDoUpdate({
      target: [schema.helpRequests.userId, schema.helpRequests.exerciseId],
      targetWhere: eq(schema.helpRequests.status, "open"),
      set: { kind: input.kind, message: input.message, submissionId: latest?.id ?? null, courseId: input.courseId },
    });
}

/** Open requests of a course for the teacher, oldest first. */
export async function openHelpRequests(courseId: number) {
  return getDb()
    .select({
      id: schema.helpRequests.id,
      userId: schema.helpRequests.userId,
      studentName: schema.users.displayName,
      studentEmail: schema.users.email,
      exerciseId: schema.helpRequests.exerciseId,
      exerciseTitle: schema.exercises.title,
      kind: schema.helpRequests.kind,
      message: schema.helpRequests.message,
      createdAt: schema.helpRequests.createdAt,
    })
    .from(schema.helpRequests)
    .innerJoin(schema.users, eq(schema.users.id, schema.helpRequests.userId))
    .innerJoin(schema.exercises, eq(schema.exercises.id, schema.helpRequests.exerciseId))
    .where(and(eq(schema.helpRequests.courseId, courseId), eq(schema.helpRequests.status, "open")))
    .orderBy(schema.helpRequests.createdAt);
}

/** Answers an open request of this course; false if it is not an open request of the course. */
export async function answerHelpRequest(courseId: number, requestId: string, reply: string): Promise<boolean> {
  const rows = await getDb()
    .update(schema.helpRequests)
    .set({ status: "answered", reply, answeredAt: new Date() })
    .where(
      and(
        eq(schema.helpRequests.id, requestId),
        eq(schema.helpRequests.courseId, courseId),
        eq(schema.helpRequests.status, "open"),
      ),
    )
    .returning({ id: schema.helpRequests.id });
  return rows.length > 0;
}

/** The student withdraws their own open request; it is deleted, nothing is kept. */
export async function withdrawHelpRequest(userId: string, exerciseId: string): Promise<boolean> {
  const rows = await getDb()
    .delete(schema.helpRequests)
    .where(
      and(
        eq(schema.helpRequests.userId, userId),
        eq(schema.helpRequests.exerciseId, exerciseId),
        eq(schema.helpRequests.status, "open"),
      ),
    )
    .returning({ id: schema.helpRequests.id });
  return rows.length > 0;
}
