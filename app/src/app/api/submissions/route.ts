import { and, eq, inArray } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/session";
import { getDb, schema } from "@/lib/db";
import { markSubmissionFailed } from "@/lib/grading/grade";
import { enqueueSubmission } from "@/lib/queue";

const MAX_SOURCE_BYTES = 64 * 1024;

const bodySchema = z.object({
  exerciseId: z.string().min(1).max(100),
  sourceCode: z.string().refine((s) => Buffer.byteLength(s, "utf8") <= MAX_SOURCE_BYTES, {
    message: "Koodi on liian pitkä (enintään 64 kt).",
  }),
});

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Kirjaudu sisään." }, { status: 401 });

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Virheellinen pyyntö." }, { status: 400 });
  }
  const { exerciseId, sourceCode } = parsed.data;
  const db = getDb();

  const [exercise] = await db
    .select({ id: schema.exercises.id })
    .from(schema.exercises)
    .where(eq(schema.exercises.id, exerciseId));
  if (!exercise) return NextResponse.json({ error: "Tehtävää ei löydy." }, { status: 404 });

  // One submission in flight per user and exercise keeps the queue fair.
  const [pending] = await db
    .select({ id: schema.submissions.id })
    .from(schema.submissions)
    .where(
      and(
        eq(schema.submissions.userId, user.id),
        eq(schema.submissions.exerciseId, exerciseId),
        inArray(schema.submissions.status, ["queued", "running"]),
      ),
    );
  if (pending) {
    return NextResponse.json({ error: "Edellinen palautus on vielä arvioitavana.", id: pending.id }, { status: 409 });
  }

  const [submission] = await db
    .insert(schema.submissions)
    .values({ userId: user.id, exerciseId, sourceCode })
    .returning({ id: schema.submissions.id });

  try {
    await enqueueSubmission(submission.id);
  } catch (err) {
    await markSubmissionFailed(submission.id, `enqueue failed: ${(err as Error).message}`);
    return NextResponse.json({ error: "Arviointipalvelu ei ole käytettävissä." }, { status: 503 });
  }

  return NextResponse.json({ id: submission.id }, { status: 202 });
}
