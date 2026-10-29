import { createHmac, timingSafeEqual } from "node:crypto";
import { eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { getDb, schema } from "../db";
import type { User } from "../db/schema";
import { requireEnv } from "../env";

export const SESSION_COOKIE = "kp_session";
const MAX_AGE_SECONDS = 60 * 60 * 24 * 14;

function sign(payload: string, secret: string): string {
  return createHmac("sha256", secret).update(payload).digest("base64url");
}

/** Token format: base64url(userId:expiresAtUnix).signature */
export function createSessionToken(userId: string, secret: string, now = Date.now()): string {
  const expiresAt = Math.floor(now / 1000) + MAX_AGE_SECONDS;
  const payload = Buffer.from(`${userId}:${expiresAt}`).toString("base64url");
  return `${payload}.${sign(payload, secret)}`;
}

/** Returns the user id if the token is authentic and unexpired, otherwise null. */
export function verifySessionToken(token: string, secret: string, now = Date.now()): string | null {
  const [payload, signature] = token.split(".");
  if (!payload || !signature) return null;

  const expected = Buffer.from(sign(payload, secret));
  const given = Buffer.from(signature);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null;

  const [userId, expiresAt] = Buffer.from(payload, "base64url").toString().split(":");
  if (!userId || !expiresAt || Number(expiresAt) * 1000 < now) return null;
  return userId;
}

export const sessionCookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: MAX_AGE_SECONDS,
};

export async function getCurrentUser(): Promise<User | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const userId = verifySessionToken(token, requireEnv("SESSION_SECRET"));
  if (!userId) return null;
  const [user] = await getDb().select().from(schema.users).where(eq(schema.users.id, userId));
  return user ?? null;
}

export function devLoginEnabled(): boolean {
  return process.env.DEV_LOGIN === "true" && process.env.NODE_ENV !== "production";
}
