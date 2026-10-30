import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/session";
import { MAX_NOTE_LENGTH, saveNote } from "@/lib/concepts/queries";
import { getDb, schema } from "@/lib/db";

const bodySchema = z.object({
  language: z.string().min(1).max(30),
  conceptId: z.string().min(1).max(100),
  note: z.string().max(MAX_NOTE_LENGTH, `Muistiinpano voi olla enintään ${MAX_NOTE_LENGTH} merkkiä.`),
});

/** The student's own note on a concept card. Personal data: visible only to the student. */
export async function PUT(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Kirjaudu sisään." }, { status: 401 });

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Virheellinen pyyntö." }, { status: 400 });
  }
  const { language, conceptId, note } = parsed.data;

  const [concept] = await getDb()
    .select({ id: schema.concepts.id })
    .from(schema.concepts)
    .where(and(eq(schema.concepts.language, language), eq(schema.concepts.id, conceptId)));
  if (!concept) return NextResponse.json({ error: "Korttia ei löydy." }, { status: 404 });

  await saveNote(user.id, language, conceptId, note);
  return NextResponse.json({ ok: true });
}
