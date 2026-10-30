import { NextResponse } from "next/server";
import { createSessionToken, SESSION_COOKIE, sessionCookieOptions } from "@/lib/auth/session";
import { requireEnv } from "@/lib/env";
import { appOrigin, errorRedirect, readParams, STATE_COOKIE_PREFIX, stateCookieOptions } from "@/lib/lti/http";
import { decodeJwt, JwtError, verifyRs256 } from "@/lib/lti/jwt";
import { createChoiceToken } from "@/lib/lti/deep-link";
import { exerciseIdFromPath, messageType, redirectPath, validateDeepLinkRequest, validateLaunch } from "@/lib/lti/launch";
import { platformKey } from "@/lib/lti/keys";
import { consumeLaunchState, getPlatform, recordLaunch } from "@/lib/lti/store";

/** LTI 1.3 launch: the platform posts the signed id_token here (form_post). */
export async function POST(request: Request) {
  const params = await readParams(request);
  const state = params.get("state");
  const idToken = params.get("id_token");
  if (!state || !idToken) return errorRedirect("state");

  // The state must have been issued to this browser (cookie) and not used before (row).
  const cookieName = `${STATE_COOKIE_PREFIX}${state}`;
  const hasCookie = request.headers.get("cookie")?.split(/;\s*/).some((c) => c.startsWith(`${cookieName}=`));
  const stored = await consumeLaunchState(state);
  if (!hasCookie || !stored) return errorRedirect("state");

  const platform = await getPlatform(stored.platformId);
  if (!platform) return errorRedirect("platform");

  let launch;
  let deepLink;
  try {
    const { header } = decodeJwt(idToken);
    const key = await platformKey(platform.jwksUrl, header);
    const { payload } = verifyRs256(idToken, key);
    if (messageType(payload) === "LtiDeepLinkingRequest") {
      deepLink = validateDeepLinkRequest(payload, platform, stored.nonce);
    } else {
      launch = validateLaunch(payload, platform, stored.nonce);
    }
  } catch (error) {
    if (error instanceof JwtError) {
      console.warn(`LTI launch rejected (${error.code}): ${error.message}`);
      return errorRedirect(error.code === "role" ? "role" : "token");
    }
    throw error;
  }

  if (deepLink) {
    // A teacher choosing exercises for a new activity. Works inside Moodle's iframe too:
    // the chooser is authorised by the signed choice token, not by the session cookie.
    const userId = await recordLaunch(platform.id, deepLink);
    const token = createChoiceToken(
      {
        platformId: platform.id,
        deploymentId: deepLink.deploymentId,
        userId,
        returnUrl: deepLink.returnUrl,
        acceptMultiple: deepLink.acceptMultiple,
        data: deepLink.data,
      },
      requireEnv("SESSION_SECRET"),
    );
    const response = NextResponse.redirect(new URL(`/lti-valitse?valinta=${encodeURIComponent(token)}`, appOrigin()), 303);
    response.cookies.set(cookieName, "", { ...stateCookieOptions, maxAge: 0 });
    return response;
  }
  if (!launch) return errorRedirect("token");

  // Inside a cross-site iframe the session cookie would be a blocked third-party cookie.
  if (request.headers.get("sec-fetch-dest") === "iframe") return errorRedirect("iframe");

  const target = redirectPath(launch.targetLinkUri, appOrigin());
  const userId = await recordLaunch(platform.id, launch, exerciseIdFromPath(target));
  const response = NextResponse.redirect(new URL(target, appOrigin()), 303);
  response.cookies.set(SESSION_COOKIE, createSessionToken(userId, requireEnv("SESSION_SECRET")), sessionCookieOptions);
  response.cookies.set(cookieName, "", { ...stateCookieOptions, maxAge: 0 });
  return response;
}
