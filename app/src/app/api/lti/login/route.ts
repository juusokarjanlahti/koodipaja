import { NextResponse } from "next/server";
import { appOrigin, errorRedirect, readParams, STATE_COOKIE_PREFIX, stateCookieOptions } from "@/lib/lti/http";
import { createLaunchState, findPlatform } from "@/lib/lti/store";

/**
 * LTI 1.3 third-party initiated login (IMS Security Framework 5.1.1). The platform sends
 * the browser here; we answer with an OIDC authentication request back to the platform.
 */
async function handle(request: Request) {
  const params = await readParams(request);
  const iss = params.get("iss");
  const loginHint = params.get("login_hint");
  if (!iss || !loginHint) return errorRedirect("platform");

  const platform = await findPlatform(iss, params.get("client_id"));
  if (!platform) return errorRedirect("platform");
  const deploymentId = params.get("lti_deployment_id");
  if (deploymentId && !platform.deploymentIds.includes(deploymentId)) return errorRedirect("platform");

  const { state, nonce } = await createLaunchState(platform.id);
  const auth = new URL(platform.authLoginUrl);
  const query: Record<string, string> = {
    scope: "openid",
    response_type: "id_token",
    response_mode: "form_post",
    prompt: "none",
    client_id: platform.clientId,
    redirect_uri: `${appOrigin()}/api/lti/launch`,
    login_hint: loginHint,
    state,
    nonce,
  };
  const messageHint = params.get("lti_message_hint");
  if (messageHint) query.lti_message_hint = messageHint;
  for (const [key, value] of Object.entries(query)) auth.searchParams.set(key, value);

  const response = NextResponse.redirect(auth, 302);
  response.cookies.set(`${STATE_COOKIE_PREFIX}${state}`, "1", stateCookieOptions);
  return response;
}

export const GET = handle;
export const POST = handle;
