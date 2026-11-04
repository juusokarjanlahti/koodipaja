import { and, asc, eq, isNull, sql } from "drizzle-orm";
import { getDb, schema } from "../db";
import { demoDisplayName, type DemoRole } from "./mode";

// A made-up platform: its URLs cannot be reached (.invalid, RFC 6761), so no LTI launch or
// grade passback can ever succeed against it. It exists so the demo course can reuse the
// teacher pages, which read courses through LTI tables (docs/specs/demo-mode.md).
export const DEMO_ISSUER = "https://demo.koodipaja.invalid";
const DEMO_CLIENT_ID = "koodipaja-demo";
export const DEMO_CONTEXT_ID = "demo-kurssi";
export const DEMO_COURSE_TITLE = "Ohjelmoinnin perusteet (demo)";
const DEMO_LANGUAGE = "python";

/** Creates the demo platform, course and its exercises if missing; returns the course id. */
export async function ensureDemoCourse(): Promise<number> {
  const db = getDb();
  return db.transaction(async (tx) => {
    const [platform] = await tx
      .insert(schema.ltiPlatforms)
      .values({
        issuer: DEMO_ISSUER,
        clientId: DEMO_CLIENT_ID,
        authLoginUrl: `${DEMO_ISSUER}/auth`,
        authTokenUrl: `${DEMO_ISSUER}/token`,
        jwksUrl: `${DEMO_ISSUER}/jwks`,
      })
      .onConflictDoUpdate({
        target: [schema.ltiPlatforms.issuer, schema.ltiPlatforms.clientId],
        set: { issuer: DEMO_ISSUER },
      })
      .returning({ id: schema.ltiPlatforms.id });

    const [course] = await tx
      .insert(schema.courses)
      .values({ platformId: platform.id, contextId: DEMO_CONTEXT_ID, title: DEMO_COURSE_TITLE })
      .onConflictDoUpdate({
        target: [schema.courses.platformId, schema.courses.contextId],
        set: { title: DEMO_COURSE_TITLE, updatedAt: sql`now()` },
      })
      .returning({ id: schema.courses.id });

    const exercises = await tx
      .select({ id: schema.exercises.id })
      .from(schema.exercises)
      .where(and(eq(schema.exercises.language, DEMO_LANGUAGE), isNull(schema.exercises.retiredAt)))
      .orderBy(asc(schema.exercises.id));
    if (exercises.length > 0) {
      await tx
        .insert(schema.ltiResourceLinks)
        .values(
          exercises.map((ex) => ({
            platformId: platform.id,
            resourceLinkId: `demo-${ex.id}`,
            courseId: course.id,
            exerciseId: ex.id,
          })),
        )
        .onConflictDoNothing();
    }
    return course.id;
  });
}

/** A fresh user for one visitor, enrolled on the demo course with the chosen role. */
export async function createDemoUser(role: DemoRole, courseId: number): Promise<string> {
  return getDb().transaction(async (tx) => {
    const [user] = await tx.insert(schema.users).values({ role }).returning({ id: schema.users.id });
    await tx
      .update(schema.users)
      .set({ displayName: demoDisplayName(role, user.id) })
      .where(eq(schema.users.id, user.id));
    await tx.insert(schema.courseMemberships).values({ courseId, userId: user.id, role });
    return user.id;
  });
}
