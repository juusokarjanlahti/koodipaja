"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { getDb, schema } from "@/lib/db";
import { isAccentId } from "@/lib/theme/accents";

/** Saves the signed-in user's settings; only the curated accent ids are accepted. */
export async function saveSettingsAction(formData: FormData): Promise<void> {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/asetukset");
  const accent = formData.get("accent");
  if (!isAccentId(accent)) return;
  // An unchecked checkbox is not sent at all, so absence means "off".
  const showTour = formData.get("showTour") === "on";
  await getDb()
    .update(schema.users)
    .set({ accent, showTour })
    .where(eq(schema.users.id, user.id));
  revalidatePath("/", "layout");
  redirect("/asetukset?tallennettu=1");
}
