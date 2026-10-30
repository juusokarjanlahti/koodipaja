import { readFileSync } from "node:fs";
import { join } from "node:path";
import { and, eq, isNotNull } from "drizzle-orm";
import { getDb, schema } from "./db";

export const MAX_GUIDE_LENGTH = 10_000;

/** The library guide, maintained in the repository (app/content/opiskelijan-opas.md). */
export function libraryGuide(): string {
  return readFileSync(join(process.cwd(), "content", "opiskelijan-opas.md"), "utf8");
}

export async function courseGuide(courseId: number): Promise<string> {
  const [row] = await getDb()
    .select({ markdown: schema.courseGuides.markdown })
    .from(schema.courseGuides)
    .where(eq(schema.courseGuides.courseId, courseId));
  return row?.markdown ?? "";
}

export async function saveCourseGuide(courseId: number, userId: string, markdown: string): Promise<void> {
  await getDb()
    .insert(schema.courseGuides)
    .values({ courseId, markdown, updatedBy: userId })
    .onConflictDoUpdate({
      target: schema.courseGuides.courseId,
      set: { markdown, updatedBy: userId, updatedAt: new Date() },
    });
}

/** Non-empty guides of the courses the user belongs to (as student or teacher). */
export async function guidesForUser(userId: string) {
  return getDb()
    .select({ courseId: schema.courses.id, title: schema.courses.title, markdown: schema.courseGuides.markdown })
    .from(schema.courseMemberships)
    .innerJoin(schema.courses, eq(schema.courses.id, schema.courseMemberships.courseId))
    .innerJoin(schema.courseGuides, eq(schema.courseGuides.courseId, schema.courseMemberships.courseId))
    .where(and(eq(schema.courseMemberships.userId, userId), isNotNull(schema.courseGuides.markdown)));
}
