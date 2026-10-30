import { inArray } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getDb, schema } from "@/lib/db";
import { requireEnv } from "@/lib/env";
import { autoPostPage, contentItems, deepLinkingResponse, readChoiceToken } from "@/lib/lti/deep-link";
import { appOrigin, errorRedirect } from "@/lib/lti/http";
import { toolPrivateKey } from "@/lib/lti/keys";
import { getPlatform } from "@/lib/lti/store";

/** Finishes a Deep Linking choice: signs the chosen exercises and posts them back to Moodle. */
export async function POST(request: Request) {
  const form = await request.formData();
  const token = form.get("valinta");
  const choice = typeof token === "string" ? readChoiceToken(token, requireEnv("SESSION_SECRET")) : null;
  if (!choice) return errorRedirect("choice");

  const ids = [...new Set(form.getAll("tehtava").filter((v): v is string => typeof v === "string"))];
  if (ids.length === 0) {
    return NextResponse.redirect(new URL(`/lti-valitse?valinta=${encodeURIComponent(String(token))}&tyhja=1`, appOrigin()), 303);
  }
  const chosen = await getDb()
    .select({ id: schema.exercises.id, title: schema.exercises.title })
    .from(schema.exercises)
    .where(inArray(schema.exercises.id, choice.acceptMultiple ? ids : ids.slice(0, 1)));
  // Keep the teacher's order (the order on the page).
  chosen.sort((a, b) => ids.indexOf(a.id) - ids.indexOf(b.id));

  const platform = await getPlatform(choice.platformId);
  const key = toolPrivateKey();
  if (!platform || !key || chosen.length === 0) return errorRedirect("choice");

  const jwt = deepLinkingResponse(platform, choice, contentItems(chosen, appOrigin()), key);
  return new NextResponse(autoPostPage(choice.returnUrl, jwt), {
    headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" },
  });
}
