import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { getDb, schema } from "@/lib/db";
import { presentSubmission } from "@/lib/grading/present";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Kirjaudu sisään." }, { status: 401 });

  const { id } = await params;
  if (!UUID.test(id)) return NextResponse.json({ error: "Palautusta ei löydy." }, { status: 404 });

  const db = getDb();
  // Students can only read their own submissions.
  const [submission] = await db
    .select()
    .from(schema.submissions)
    .where(and(eq(schema.submissions.id, id), eq(schema.submissions.userId, user.id)));
  if (!submission) return NextResponse.json({ error: "Palautusta ei löydy." }, { status: 404 });

  const [cases, results] = await Promise.all([
    db.select().from(schema.testCases).where(eq(schema.testCases.exerciseId, submission.exerciseId)),
    db.select().from(schema.submissionResults).where(eq(schema.submissionResults.submissionId, id)),
  ]);

  return NextResponse.json(presentSubmission(submission, cases, results), {
    headers: { "Cache-Control": "no-store" },
  });
}
