import { NextResponse } from "next/server";
import { createSessionToken, SESSION_COOKIE, sessionCookieOptions } from "@/lib/auth/session";
import { demoModeEnabled, parseDemoRole } from "@/lib/demo/mode";
import { createDemoUser } from "@/lib/demo/setup";
import { requireEnv } from "@/lib/env";

/**
 * Public demo sign-in (docs/specs/demo-mode.md). The only input is the role: the server
 * creates a fresh user, so a visitor can never pick an id or an email. 404 without DEMO_MODE.
 */
export async function POST(request: Request) {
  if (!demoModeEnabled()) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const form = await request.formData().catch(() => null);
  const role = parseDemoRole(form?.get("role"));
  if (!role) return NextResponse.redirect(new URL("/demo", request.url), 303);

  const { userId, courseId } = await createDemoUser(role);
  const target = role === "teacher" ? `/opettaja/kurssit/${courseId}` : "/";
  const response = NextResponse.redirect(new URL(target, request.url), 303);
  response.cookies.set(SESSION_COOKIE, createSessionToken(userId, requireEnv("SESSION_SECRET")), sessionCookieOptions);
  return response;
}
