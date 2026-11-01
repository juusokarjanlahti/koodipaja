import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { getDb, schema } from "@/lib/db";
import { approvalReasons } from "@/lib/approvals/store";
import { presentSubmission } from "@/lib/grading/present";
import { TEACHER_APPROVED } from "@/lib/grading/status";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
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

  // The student's own code is included on request, for reopening an earlier submission.
  const includeSource = new URL(request.url).searchParams.get("includeSource") === "1";
  const positions = new Map(cases.map((c) => [c.id, c.position]));
  const reasons = await approvalReasons(
    user.id,
    submission.exerciseId,
    results
      .filter((r) => r.judgeStatus === TEACHER_APPROVED && r.outputHash)
      .map((r) => ({ position: positions.get(r.testCaseId)!, hash: r.outputHash! })),
  );
  const body = presentSubmission(submission, cases, results, reasons);
  return NextResponse.json(includeSource ? { ...body, sourceCode: submission.sourceCode } : body, {
    headers: { "Cache-Control": "no-store" },
  });
}
