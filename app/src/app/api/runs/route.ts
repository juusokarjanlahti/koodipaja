import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/session";
import { getDb, schema } from "@/lib/db";
import { allowRun, MAX_STDIN_BYTES } from "@/lib/runs/output";
import { redisIncr, runViaQueue } from "@/lib/runs/queue";

const MAX_SOURCE_BYTES = 64 * 1024;
const bytes = (s: string) => Buffer.byteLength(s, "utf8");

const bodySchema = z.object({
  exerciseId: z.string().min(1).max(100),
  sourceCode: z.string().refine((s) => bytes(s) <= MAX_SOURCE_BYTES, { message: "Koodi on liian pitkä (enintään 64 kt)." }),
  stdin: z.string().refine((s) => bytes(s) <= MAX_STDIN_BYTES, { message: "Syöte on liian pitkä (enintään 16 kt)." }),
});

/**
 * "Aja omalla syötteellä": runs the student's code on Judge0 through the run queue and
 * returns the output. Runs are not stored and are not visible to teachers.
 */
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Kirjaudu sisään." }, { status: 401 });

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Virheellinen pyyntö." }, { status: 400 });
  }
  const { exerciseId, sourceCode, stdin } = parsed.data;

  const [exercise] = await getDb()
    .select({
      language: schema.exercises.language,
      timeLimitSeconds: schema.exercises.timeLimitSeconds,
      memoryLimitMb: schema.exercises.memoryLimitMb,
    })
    .from(schema.exercises)
    .where(eq(schema.exercises.id, exerciseId));
  if (!exercise) return NextResponse.json({ error: "Tehtävää ei löydy." }, { status: 404 });

  try {
    if (!(await allowRun(redisIncr, user.id))) {
      return NextResponse.json(
        { error: "Ajoja on tullut paljon lyhyessä ajassa. Odota hetki ja yritä uudelleen." },
        { status: 429 },
      );
    }
    const output = await runViaQueue({
      sourceCode,
      language: exercise.language,
      stdin,
      cpuTimeLimitSeconds: exercise.timeLimitSeconds,
      memoryLimitMb: exercise.memoryLimitMb,
    });
    return NextResponse.json(output, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "Ajopalvelu ei vastannut. Yritä hetken päästä uudelleen." }, { status: 503 });
  }
}
