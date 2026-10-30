import { and, asc, desc, eq } from "drizzle-orm";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Assignment } from "@/components/assignment";
import { CheatsheetPanel } from "@/components/cheatsheet";
import { ExerciseWorkspace } from "@/components/exercise-workspace";
import { getCurrentUser } from "@/lib/auth/session";
import { getCheatsheet } from "@/lib/concepts/queries";
import { getSubmissionHistory } from "@/lib/progress";
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
    .select({ stdin: schema.testCases.stdin, expectedStdout: schema.testCases.expectedStdout, hidden: schema.testCases.hidden })
    .from(schema.testCases)
    .where(eq(schema.testCases.exerciseId, id))
    .orderBy(asc(schema.testCases.position));
  const cheatsheet = user ? await getCheatsheet(user.id) : [];
  const history = user ? await getSubmissionHistory(user.id, exercise.id) : [];
  // Prefill "Aja" with the first visible example so the first run works straight away.
  const example = cases.find((c) => !c.hidden);
  const exampleStdin = example?.stdin ?? "";

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
      <div className="grid gap-4 self-start">
        <article className="prose-exercise rounded-xl border border-border bg-surface p-5">
          <Assignment markdown={exercise.promptMarkdown} />
        </article>
        {user && <CheatsheetPanel cards={cheatsheet} />}
      </div>

      <section aria-label="Ratkaisu">
        {user ? (
          <ExerciseWorkspace
            exerciseId={exercise.id}
            language={exercise.language}
            starterCode={exercise.starterCode}
            initialCode={latest?.sourceCode ?? exercise.starterCode}
            exampleStdin={exampleStdin}
            exampleStdout={example?.expectedStdout ?? null}
            outputMatch={exercise.outputMatch}
            initialHistory={history}
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
