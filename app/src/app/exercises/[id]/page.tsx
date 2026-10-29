import { and, asc, desc, eq } from "drizzle-orm";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Assignment } from "@/components/assignment";
import { ExerciseWorkspace } from "@/components/exercise-workspace";
import { getCurrentUser } from "@/lib/auth/session";
import { getDb, schema } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function ExercisePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = getDb();

  const [exercise] = await db.select().from(schema.exercises).where(eq(schema.exercises.id, id));
  if (!exercise) notFound();

  const user = await getCurrentUser();
  const [latest] = user
    ? await db
        .select({ sourceCode: schema.submissions.sourceCode })
        .from(schema.submissions)
        .where(and(eq(schema.submissions.userId, user.id), eq(schema.submissions.exerciseId, id)))
        .orderBy(desc(schema.submissions.createdAt))
        .limit(1)
    : [];

  const cases = await db
    .select({ stdin: schema.testCases.stdin, hidden: schema.testCases.hidden })
    .from(schema.testCases)
    .where(eq(schema.testCases.exerciseId, id))
    .orderBy(asc(schema.testCases.position));
  const caseCount = cases.length;
  // Prefill "Aja" with the first visible example so the first run works straight away.
  const exampleStdin = cases.find((c) => !c.hidden)?.stdin ?? "";

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
      <article className="prose-exercise self-start rounded-xl border border-border bg-surface p-5">
        <Assignment markdown={exercise.promptMarkdown} />
        <p className="mt-4 text-sm text-muted">Testitapauksia: {caseCount}</p>
      </article>

      <section aria-label="Ratkaisu">
        {user ? (
          <ExerciseWorkspace
            exerciseId={exercise.id}
            language={exercise.language}
            starterCode={exercise.starterCode}
            initialCode={latest?.sourceCode ?? exercise.starterCode}
            exampleStdin={exampleStdin}
          />
        ) : (
          <div className="rounded-xl border border-border bg-surface p-5">
            <p className="mb-3">Kirjaudu sisään palauttaaksesi ratkaisuja.</p>
            <Link
              href={`/login?next=/exercises/${exercise.id}`}
              className="inline-block rounded-lg bg-accent px-4 py-2 font-medium text-accent-text"
            >
              Kirjaudu
            </Link>
          </div>
        )}
      </section>
    </div>
  );
}
