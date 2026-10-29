import { NextResponse } from "next/server";
import { z } from "zod";
import {
  createSessionToken,
  devLoginEnabled,
  SESSION_COOKIE,
  sessionCookieOptions,
} from "@/lib/auth/session";
import { getDb, schema } from "@/lib/db";
import { requireEnv } from "@/lib/env";

/**
 * DEVELOPMENT-ONLY login: trusts any email address. Disabled unless DEV_LOGIN=true,
 * and always disabled when NODE_ENV=production. Real login will be LTI 1.3.
 */
const emailSchema = z.email().max(254);

function safeNext(value: unknown): string {
  return typeof value === "string" && value.startsWith("/") && !value.startsWith("//") ? value : "/";
}

export async function POST(request: Request) {
  if (!devLoginEnabled()) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const isForm = request.headers.get("content-type")?.includes("form") ?? false;
  const input = isForm
    ? Object.fromEntries(await request.formData())
    : await request.json().catch(() => ({}));

  const email = emailSchema.safeParse(String(input.email ?? "").trim().toLowerCase());
  if (!email.success) {
    return isForm
      ? NextResponse.redirect(new URL("/login?error=email", request.url), 303)
      : NextResponse.json({ error: "Virheellinen sähköposti." }, { status: 400 });
  }

  const [user] = await getDb()
    .insert(schema.users)
    .values({ email: email.data })
    .onConflictDoUpdate({ target: schema.users.email, set: { email: email.data } })
    .returning({ id: schema.users.id });

  const response = isForm
    ? NextResponse.redirect(new URL(safeNext(input.next), request.url), 303)
    : NextResponse.json({ ok: true });
  response.cookies.set(SESSION_COOKIE, createSessionToken(user.id, requireEnv("SESSION_SECRET")), sessionCookieOptions);
  return response;
}
