import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/session";
import { MAX_HELP_MESSAGE, courseForStudentExercise, saveHelpRequest } from "@/lib/help/requests";

const bodySchema = z.object({
  exerciseId: z.string().min(1).max(200),
  kind: z.enum(["apu", "kiista"]),
  message: z.string().max(MAX_HELP_MESSAGE, `Viesti voi olla enintään ${MAX_HELP_MESSAGE} merkkiä.`).optional(),
});

/** A student asks the teacher of their course about an exercise. Personal data: the message. */
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Kirjaudu sisään." }, { status: 401 });

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Virheellinen pyyntö." }, { status: 400 });
  }
  const { exerciseId, kind, message } = parsed.data;

  const courseId = await courseForStudentExercise(user.id, exerciseId);
  if (courseId === null) {
    return NextResponse.json({ error: "Tälle tehtävälle ei löydy opettajaa, jolle pyyntö voisi mennä." }, { status: 404 });
  }
  await saveHelpRequest({ userId: user.id, exerciseId, courseId, kind, message: message?.trim() || null });
  return NextResponse.json({ ok: true });
}
