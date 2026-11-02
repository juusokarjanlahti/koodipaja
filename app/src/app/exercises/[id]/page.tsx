import { and, asc, desc, eq, isNull } from "drizzle-orm";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Assignment } from "@/components/assignment";
import { CheatsheetPanel } from "@/components/cheatsheet";
import { LevelBadge } from "@/components/level-badge";
import { Tour } from "@/components/tour";
import { ExerciseWorkspace } from "@/components/exercise-workspace";
import { getCurrentUser } from "@/lib/auth/session";
import { getCheatsheet } from "@/lib/concepts/queries";
import { HelpRequest } from "@/components/help-request";
import { courseForStudentExercise, currentHelpRequest } from "@/lib/help/requests";
import { numberedTitle } from "@/lib/exercises/order";
import { getExerciseStatuses, getSentGrade, getSubmissionHistory } from "@/lib/progress";
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
  // The exercises of this language in course order, for "next exercise" suggestions.
  const path = await db
    .select({
      id: schema.exercises.id,
      title: schema.exercises.title,
      concepts: schema.exercises.concepts,
      requires: schema.exercises.requires,
    })
    .from(schema.exercises)
    .where(and(eq(schema.exercises.language, exercise.language), isNull(schema.exercises.retiredAt)))
    .orderBy(asc(schema.exercises.id));
  const position = path.findIndex((e) => e.id === exercise.id);
  const previous = position > 0 ? path[position - 1] : null;
  const following = position >= 0 && position < path.length - 1 ? path[position + 1] : null;
  const statuses = user ? await getExerciseStatuses(user.id) : new Map();
  const conceptRows = await db
    .select({ id: schema.concepts.id, title: schema.concepts.title })
    .from(schema.concepts)
    .where(eq(schema.concepts.language, exercise.language));
  const hasTeacher = user ? (await courseForStudentExercise(user.id, exercise.id)) !== null : false;
  const helpRequest = user && hasTeacher ? await currentHelpRequest(user.id, exercise.id) : null;
  const sentGrade = user && hasTeacher ? await getSentGrade(user.id, exercise.id) : null;
  const example = cases.find((c) => !c.hidden);
  const exampleStdin = example?.stdin ?? "";

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
      <div className="grid gap-4 self-start">
        {(previous || following) && (
          <nav aria-label="Tehtävien välillä" className="flex justify-between gap-3 text-sm">
            {previous ? (
              <Link href={`/exercises/${previous.id}`} className="text-accent">
                ← {numberedTitle(previous.id, previous.title)}
              </Link>
            ) : (
              <span />
            )}
            {following && (
              <Link href={`/exercises/${following.id}`} className="text-right text-accent">
                {numberedTitle(following.id, following.title)} →
              </Link>
            )}
          </nav>
        )}
        {user?.showTour && <Tour />}
        {exercise.retiredAt && (
          <p role="status" className="border border-border bg-surface p-3 text-sm">
            Tämä tehtävä ei ole enää tehtävälistalla (se on siirretty tai poistettu). Aiemmat palautuksesi ovat
            tallessa, ja voit yhä jatkaa sitä. <Link href="/" className="text-accent underline">Tehtävälistaan</Link>
          </p>
        )}
        <article data-tour="assignment" className="prose-exercise kp-margin py-1 pl-5">
          {/* Just the level word; its meaning is explained on the exercise list (#104). */}
          <p className="not-prose mb-2">
            <LevelBadge level={exercise.level} />
          </p>
          {/* The title carries the course number, like the list: "1. Tervehdys". */}
          <Assignment markdown={exercise.promptMarkdown.replace(/^# (.+)$/m, (_, title: string) => `# ${numberedTitle(exercise.id, title)}`)} />
        </article>
        {sentGrade && (
          <p role="status" className="rounded-lg border border-border bg-surface p-3 text-sm">
            {sentGrade.status === "sent" && sentGrade.sentAt
              ? `Moodleen on lähetetty ${sentGrade.scoreGiven} / ${sentGrade.scoreMaximum} (${new Intl.DateTimeFormat("fi-FI", { dateStyle: "short", timeStyle: "short", timeZone: "Europe/Helsinki" }).format(sentGrade.sentAt)}).`
              : sentGrade.status === "failed"
                ? "Arvosanan lähetys Moodleen ei onnistunut. Opettaja näkee tilan ja voi lähettää sen uudelleen, eikä sinun tarvitse tehdä mitään."
                : "Arvosanaa ei ole vielä lähetetty Moodleen. Se lähtee, kun palautat ratkaisun."}
          </p>
        )}
        {user && hasTeacher && <HelpRequest exerciseId={exercise.id} initial={helpRequest} />}
        {user && <CheatsheetPanel cards={cheatsheet} />}
      </div>

      <section aria-label="Ratkaisu" className="kp-paper">
        {user ? (
          <ExerciseWorkspace
            exerciseId={exercise.id}
            language={exercise.language}
            starterCode={exercise.starterCode}
            initialCode={latest?.sourceCode ?? exercise.starterCode}
            exampleStdin={exampleStdin}
            exampleStdout={example?.expectedStdout ?? null}
            outputMatch={exercise.outputMatch}
            path={path}
            initialStates={Object.fromEntries(statuses)}
            conceptTitles={Object.fromEntries(conceptRows.map((c) => [c.id, c.title]))}
            initialHistory={history}
          />
        ) : (
          <div className="rounded-xl border border-border bg-surface p-5">
            <p className="mb-3">Kirjaudu sisään palauttaaksesi ratkaisuja.</p>
            <Link
              href={`/login?next=/exercises/${exercise.id}`}
              className="inline-block rounded-lg bg-action px-4 py-2 font-bold text-action-text"
            >
              Kirjaudu
            </Link>
          </div>
        )}
      </section>
    </div>
  );
}
