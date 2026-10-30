import { randomBytes } from "node:crypto";
import { and, eq, lt, sql } from "drizzle-orm";
import { getDb, schema } from "../db";
import type { LtiPlatform } from "../db/schema";
import type { Launch, LaunchUser } from "./launch";

const STATE_TTL_MS = 10 * 60 * 1000;

/** Finds the platform for a login request. With several registrations for one issuer, client_id is required. */
export async function findPlatform(issuer: string, clientId: string | null): Promise<LtiPlatform | null> {
  const db = getDb();
  const rows = await db
    .select()
    .from(schema.ltiPlatforms)
    .where(
      clientId
        ? and(eq(schema.ltiPlatforms.issuer, issuer), eq(schema.ltiPlatforms.clientId, clientId))
        : eq(schema.ltiPlatforms.issuer, issuer),
    );
  return rows.length === 1 ? rows[0] : null;
}

export async function getPlatform(id: number): Promise<LtiPlatform | null> {
  const [row] = await getDb().select().from(schema.ltiPlatforms).where(eq(schema.ltiPlatforms.id, id));
  return row ?? null;
}

export async function createLaunchState(platformId: number, now = Date.now()): Promise<{ state: string; nonce: string }> {
  const db = getDb();
  const state = randomBytes(24).toString("base64url");
  const nonce = randomBytes(24).toString("base64url");
  // Housekeeping: expired states are useless; deleting them here keeps the table tiny.
  await db.delete(schema.ltiLaunchStates).where(lt(schema.ltiLaunchStates.expiresAt, new Date(now)));
  await db.insert(schema.ltiLaunchStates).values({ state, nonce, platformId, expiresAt: new Date(now + STATE_TTL_MS) });
  return { state, nonce };
}

/** Deletes and returns the state row: each state, and therefore each id_token, works once. */
export async function consumeLaunchState(state: string, now = Date.now()) {
  const [row] = await getDb()
    .delete(schema.ltiLaunchStates)
    .where(eq(schema.ltiLaunchStates.state, state))
    .returning();
  if (!row || row.expiresAt.getTime() < now) return null;
  return row;
}

/**
 * Creates or updates the user, course, membership and activity (resource link) for a
 * validated launch. `exerciseId` is the exercise the activity opens, if any. Returns the user id.
 */
export async function recordLaunch(
  platformId: number,
  launch: LaunchUser & Partial<Pick<Launch, "resourceLinkId" | "ags">>,
  exerciseId: string | null = null,
): Promise<string> {
  return getDb().transaction(async (tx) => {
    const [identity] = await tx
      .select({ userId: schema.ltiIdentities.userId })
      .from(schema.ltiIdentities)
      .where(and(eq(schema.ltiIdentities.platformId, platformId), eq(schema.ltiIdentities.sub, launch.sub)));

    let userId = identity?.userId;
    if (userId) {
      await tx
        .update(schema.users)
        .set({
          displayName: launch.displayName,
          // Raised to teacher by a teaching launch, never lowered (docs/specs/lti-launch.md).
          ...(launch.role === "teacher" ? { role: "teacher" as const } : {}),
        })
        .where(eq(schema.users.id, userId));
    } else {
      const [user] = await tx
        .insert(schema.users)
        .values({ displayName: launch.displayName, role: launch.role })
        .returning({ id: schema.users.id });
      userId = user.id;
      await tx
        .insert(schema.ltiIdentities)
        .values({ platformId, sub: launch.sub, userId })
        .onConflictDoNothing();
      // A parallel first launch may have won the race; use its user.
      const [winner] = await tx
        .select({ userId: schema.ltiIdentities.userId })
        .from(schema.ltiIdentities)
        .where(and(eq(schema.ltiIdentities.platformId, platformId), eq(schema.ltiIdentities.sub, launch.sub)));
      if (winner.userId !== userId) {
        await tx.delete(schema.users).where(eq(schema.users.id, userId));
        userId = winner.userId;
      }
    }

    let courseId: number | null = null;
    if (launch.context) {
      const [course] = await tx
        .insert(schema.courses)
        .values({ platformId, contextId: launch.context.id, title: launch.context.title })
        .onConflictDoUpdate({
          target: [schema.courses.platformId, schema.courses.contextId],
          set: { title: launch.context.title, updatedAt: sql`now()` },
        })
        .returning({ id: schema.courses.id });
      courseId = course.id;
      await tx
        .insert(schema.courseMemberships)
        .values({ courseId: course.id, userId, role: launch.role })
        .onConflictDoUpdate({
          target: [schema.courseMemberships.courseId, schema.courseMemberships.userId],
          set: { role: launch.role, lastLaunchAt: sql`now()` },
        });
    }

    // Deep Linking requests have no activity yet.
    if (!launch.resourceLinkId) return userId;

    const [exercise] = exerciseId
      ? await tx.select({ id: schema.exercises.id }).from(schema.exercises).where(eq(schema.exercises.id, exerciseId))
      : [];
    const link = {
      courseId,
      exerciseId: exercise?.id ?? null,
      lineItemUrl: launch.ags?.lineItem ?? null,
      agsScopes: launch.ags?.scopes ?? [],
    };
    const [resourceLink] = await tx
      .insert(schema.ltiResourceLinks)
      .values({ platformId, resourceLinkId: launch.resourceLinkId, ...link })
      .onConflictDoUpdate({
        target: [schema.ltiResourceLinks.platformId, schema.ltiResourceLinks.resourceLinkId],
        set: { ...link, updatedAt: sql`now()` },
      })
      .returning({ id: schema.ltiResourceLinks.id });
    await tx
      .insert(schema.ltiGradeSyncs)
      .values({ resourceLinkId: resourceLink.id, userId, platformUserId: launch.sub })
      .onConflictDoUpdate({
        target: [schema.ltiGradeSyncs.resourceLinkId, schema.ltiGradeSyncs.userId],
        set: { platformUserId: launch.sub },
      });
    return userId;
  });
}
