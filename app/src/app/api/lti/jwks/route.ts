import { NextResponse } from "next/server";
import { publicJwk, toolPrivateKey } from "@/lib/lti/keys";

/** The tool's public key set. Moodle asks for this URL when the tool is registered. */
export function GET() {
  const key = toolPrivateKey();
  if (!key) return NextResponse.json({ error: "LTI_PRIVATE_KEY is not configured" }, { status: 503 });
  return NextResponse.json({ keys: [publicJwk(key)] }, { headers: { "cache-control": "public, max-age=300" } });
}
