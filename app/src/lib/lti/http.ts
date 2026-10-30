import { NextResponse } from "next/server";
import { requireEnv } from "../env";

export const STATE_COOKIE_PREFIX = "kp_lti_";

/** The public origin of the app, e.g. https://koodipaja.example.fi. */
export function appOrigin(): string {
  return new URL(requireEnv("APP_URL")).origin;
}

/**
 * The state cookie travels with the platform's cross-site form_post, so it must be
 * SameSite=None, which browsers only accept together with Secure (also on http://localhost).
 */
export const stateCookieOptions = {
  httpOnly: true,
  sameSite: "none" as const,
  secure: true,
  path: "/api/lti",
  maxAge: 10 * 60,
};

/** Error codes shown on /lti-virhe. Keep in sync with that page. */
export type LtiErrorCode = "platform" | "state" | "token" | "iframe";

export function errorRedirect(code: LtiErrorCode): NextResponse {
  return NextResponse.redirect(new URL(`/lti-virhe?koodi=${code}`, appOrigin()), 303);
}

export async function readParams(request: Request): Promise<URLSearchParams> {
  if (request.method === "GET") return new URL(request.url).searchParams;
  const type = request.headers.get("content-type") ?? "";
  if (!type.includes("application/x-www-form-urlencoded") && !type.includes("multipart/form-data")) {
    return new URLSearchParams();
  }
  const form = await request.formData();
  const params = new URLSearchParams();
  for (const [key, value] of form) if (typeof value === "string") params.set(key, value);
  return params;
}
