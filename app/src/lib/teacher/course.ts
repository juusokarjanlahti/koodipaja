import { and, asc, count, countDistinct, desc, eq, inArray, isNotNull, sql } from "drizzle-orm";
import { getDb, schema } from "../db";
import type { CourseExercise, ProgressRow, Student } from "./progress";

/** Courses the user teaches, with how many students and exercises each has. */
export async function teacherCourses(userId: string) {
  const db = getDb();
  const courses = await db
    .select({ id: schema.courses.id, title: schema.courses.title })
    .from(schema.courseMemberships)
    .innerJoin(schema.courses, eq(schema.courses.id, schema.courseMemberships.courseId))
    .where(and(eq(schema.courseMemberships.userId, userId), eq(schema.courseMemberships.role, "teacher")))
    .orderBy(asc(schema.courses.title));
  if (courses.length === 0) return [];
  const ids = courses.map((c) => c.id);
  const students = await db
    .select({ courseId: schema.courseMemberships.courseId, n: count() })
    .from(schema.courseMemberships)
    .where(and(inArray(schema.courseMemberships.courseId, ids), eq(schema.courseMemberships.role, "student")))
    .groupBy(schema.courseMemberships.courseId);
  const exercises = await db
    .select({ courseId: schema.ltiResourceLinks.courseId, n: countDistinct(schema.ltiResourceLinks.exerciseId) })
    .from(schema.ltiResourceLinks)
    .where(inArray(schema.ltiResourceLinks.courseId, ids))
    .groupBy(schema.ltiResourceLinks.courseId);
  const s = new Map(students.map((r) => [r.courseId, r.n]));
  const e = new Map(exercises.map((r) => [r.courseId, r.n]));
  return courses.map((c) => ({ ...c, students: s.get(c.id) ?? 0, exercises: e.get(c.id) ?? 0 }));
}

export async function isTeacherOf(userId: string, courseId: number): Promise<boolean> {
  const [row] = await getDb()
    .select({ role: schema.courseMemberships.role })
    .from(schema.courseMemberships)
    .where(and(eq(schema.courseMemberships.courseId, courseId), eq(schema.courseMemberships.userId, userId)));
  return row?.role === "teacher";
}

/** The course if the user teaches it, otherwise null. */
export async function courseForTeacher(userId: string, courseId: number) {
  if (!Number.isSafeInteger(courseId) || !(await isTeacherOf(userId, courseId))) return null;
  const [course] = await getDb().select().from(schema.courses).where(eq(schema.courses.id, courseId));
  return course ?? null;
}

export async function courseExercises(courseId: number): Promise<CourseExercise[]> {
  return getDb()
    .selectDistinct({ id: schema.exercises.id, title: schema.exercises.title, language: schema.exercises.language })
    .from(schema.ltiResourceLinks)
    .innerJoin(schema.exercises, eq(schema.exercises.id, schema.ltiResourceLinks.exerciseId))
    .where(and(eq(schema.ltiResourceLinks.courseId, courseId), isNotNull(schema.ltiResourceLinks.exerciseId)))
    .orderBy(asc(schema.exercises.language), asc(schema.exercises.id));
}

export async function courseStudents(courseId: number): Promise<Student[]> {
  const rows = await getDb()
    .select({ id: schema.users.id, name: schema.users.displayName, email: schema.users.email })
    .from(schema.courseMemberships)
    .innerJoin(schema.users, eq(schema.users.id, schema.courseMemberships.userId))
    .where(and(eq(schema.courseMemberships.courseId, courseId), eq(schema.courseMemberships.role, "student")));
  return rows.map((r) => ({ id: r.id, name: r.name ?? r.email ?? "Nimetön opiskelija" }));
}

/** One aggregate query: per student and exercise, solved or not and how many attempts. */
export async function courseProgressRows(studentIds: string[], exerciseIds: string[]): Promise<ProgressRow[]> {
  if (studentIds.length === 0 || exerciseIds.length === 0) return [];
  const s = schema.submissions;
  return getDb()
    .select({
      userId: s.userId,
      exerciseId: s.exerciseId,
      solved: sql<boolean>`bool_or(${s.status} = 'done' and ${s.totalCount} > 0 and ${s.passedCount} = ${s.totalCount})`,
      attempts: count(),
    })
    .from(s)
    .where(and(inArray(s.userId, studentIds), inArray(s.exerciseId, exerciseIds)))
    .groupBy(s.userId, s.exerciseId);
}

export async function isStudentOf(userId: string, courseId: number): Promise<boolean> {
  const [row] = await getDb()
    .select({ role: schema.courseMemberships.role })
    .from(schema.courseMemberships)
    .where(and(eq(schema.courseMemberships.courseId, courseId), eq(schema.courseMemberships.userId, userId)));
  return row?.role === "student";
}

/** A student's submissions to the given exercises, newest first, with every test result. */
export async function studentSubmissions(studentId: string, exerciseIds: string[], limitPerExercise = 20) {
  if (exerciseIds.length === 0) return [];
  const db = getDb();
  const submissions = await db
    .select()
    .from(schema.submissions)
    .where(and(eq(schema.submissions.userId, studentId), inArray(schema.submissions.exerciseId, exerciseIds)))
    .orderBy(desc(schema.submissions.createdAt));
  const perExercise = new Map<string, number>();
  const kept = submissions.filter((sub) => {
    const n = (perExercise.get(sub.exerciseId) ?? 0) + 1;
    perExercise.set(sub.exerciseId, n);
    return n <= limitPerExercise;
  });
  if (kept.length === 0) return [];
  const results = await db
    .select({
      submissionId: schema.submissionResults.submissionId,
      passed: schema.submissionResults.passed,
      judgeStatus: schema.submissionResults.judgeStatus,
      stdout: schema.submissionResults.stdout,
      stderr: schema.submissionResults.stderr,
      position: schema.testCases.position,
      name: schema.testCases.name,
      hidden: schema.testCases.hidden,
      stdin: schema.testCases.stdin,
      expectedStdout: schema.testCases.expectedStdout,
    })
    .from(schema.submissionResults)
    .innerJoin(schema.testCases, eq(schema.testCases.id, schema.submissionResults.testCaseId))
    .where(inArray(schema.submissionResults.submissionId, kept.map((k) => k.id)))
    .orderBy(asc(schema.testCases.position));
  const bySubmission = Map.groupBy(results, (r) => r.submissionId);
  return kept.map((sub) => ({ ...sub, results: bySubmission.get(sub.id) ?? [] }));
}

/** Whether the user teaches any course (for the header link). */
export async function teachesAnyCourse(userId: string): Promise<boolean> {
  const [row] = await getDb()
    .select({ n: count() })
    .from(schema.courseMemberships)
    .where(and(eq(schema.courseMemberships.userId, userId), eq(schema.courseMemberships.role, "teacher")));
  return (row?.n ?? 0) > 0;
}

/** Per exercise: how many grades of this course reached Moodle and how many transfers failed. */
export async function courseGradeSyncCounts(courseId: number) {
  const rows = await getDb()
    .select({
      exerciseId: schema.ltiResourceLinks.exerciseId,
      sent: sql<number>`count(*) filter (where ${schema.ltiGradeSyncs.status} = 'sent')::int`,
      failed: sql<number>`count(*) filter (where ${schema.ltiGradeSyncs.status} = 'failed')::int`,
    })
    .from(schema.ltiGradeSyncs)
    .innerJoin(schema.ltiResourceLinks, eq(schema.ltiResourceLinks.id, schema.ltiGradeSyncs.resourceLinkId))
    .where(and(eq(schema.ltiResourceLinks.courseId, courseId), isNotNull(schema.ltiResourceLinks.exerciseId)))
    .groupBy(schema.ltiResourceLinks.exerciseId);
  return new Map(rows.map((r) => [r.exerciseId as string, { sent: r.sent, failed: r.failed }]));
}

/** The student's grade transfers to Moodle in this course, per exercise. */
export async function studentGradeSyncs(courseId: number, userId: string) {
  return getDb()
    .select({
      exerciseId: schema.ltiResourceLinks.exerciseId,
      status: schema.ltiGradeSyncs.status,
      scoreGiven: schema.ltiGradeSyncs.scoreGiven,
      scoreMaximum: schema.ltiGradeSyncs.scoreMaximum,
      sentAt: schema.ltiGradeSyncs.sentAt,
      lastError: schema.ltiGradeSyncs.lastError,
    })
    .from(schema.ltiGradeSyncs)
    .innerJoin(schema.ltiResourceLinks, eq(schema.ltiResourceLinks.id, schema.ltiGradeSyncs.resourceLinkId))
    .where(and(eq(schema.ltiResourceLinks.courseId, courseId), eq(schema.ltiGradeSyncs.userId, userId)));
}
