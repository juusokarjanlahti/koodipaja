import Link from "next/link";
import { asc } from "drizzle-orm";
import { ProgressSquares } from "@/components/progress-squares";
import { getCurrentUser } from "@/lib/auth/session";
import { getDb, schema } from "@/lib/db";
import { LANGUAGE_LABELS, languageRank } from "@/lib/exercises/languages";
import { LEVELS, type Level } from "@/lib/exercises/levels";
import { firstUnsolved, numberedTitle } from "@/lib/exercises/order";
import { getExerciseStatuses, type ExerciseStatus } from "@/lib/progress";

export const dynamic = "force-dynamic";

// The level word carries the meaning; the style only helps scanning (WCAG 1.4.1).
const LEVEL_STYLE: Record<Level, string> = {
  perus: "border border-field text-text",
  soveltava: "border-2 border-text text-text",
  haaste: "bg-action text-action-text",
};

export default async function HomePage() {
  const exercises = await getDb()
    .select({
      id: schema.exercises.id,
      title: schema.exercises.title,
      language: schema.exercises.language,
      level: schema.exercises.level,
      topics: schema.exercises.topics,
    })
    .from(schema.exercises)
    .orderBy(asc(schema.exercises.language), asc(schema.exercises.id));

  const user = await getCurrentUser();
  const statuses: Map<string, ExerciseStatus> = user ? await getExerciseStatuses(user.id) : new Map();
  const groups = [...Map.groupBy(exercises, (ex) => ex.language).entries()].sort(
    (a, b) => languageRank(a[0]) - languageRank(b[0]),
  );

  return (
    <>
      <h1 className="kp-display mb-2">Tehtävät</h1>
      <p className="mb-3 max-w-prose text-muted">Valitse tehtävä, kirjoita ratkaisu ja saat heti palautteen.</p>
      <dl className="mb-8 flex flex-wrap gap-x-6 gap-y-1 text-sm text-muted">
        {(Object.keys(LEVELS) as Level[]).map((level) => (
          <div key={level} className="flex items-baseline gap-2">
            <dt className={`px-1.5 text-xs font-bold ${LEVEL_STYLE[level]}`}>{LEVELS[level].label}</dt>
            <dd>{LEVELS[level].meaning}</dd>
          </div>
        ))}
      </dl>

      {exercises.length === 0 ? (
        <p className="border border-border bg-surface p-4">
          Tehtäviä ei ole vielä tuotu. Aja <code>npm run import-exercises</code>.
        </p>
      ) : (
        <div className="grid gap-12">
          {groups.map(([language, items]) => {
            const next = firstUnsolved(items, (id) => statuses.get(id) === "ratkaistu");
            const started = items.some((ex) => statuses.get(ex.id) !== undefined);
            return (
              <section key={language} aria-labelledby={`lang-${language}`}>
                <h2 id={`lang-${language}`} className="mb-3 text-xl font-bold">
                  {LANGUAGE_LABELS[language] ?? language}
                </h2>
                {user && (
                  <div className="mb-5 grid gap-2">
                    <ProgressSquares
                      items={items.map((ex) => ({ id: ex.id, title: ex.title, status: statuses.get(ex.id) }))}
                      nextId={next?.id}
                    />
                    <p className="flex flex-wrap gap-x-4 text-sm">
                      <span className="text-muted">
                        Ratkaistu {items.filter((ex) => statuses.get(ex.id) === "ratkaistu").length} / {items.length}
                      </span>
                      {next && (
                        <Link href={`/exercises/${next.id}`} className="font-bold text-accent underline">
                          {started ? "Jatka tästä" : "Aloita tästä"}: {numberedTitle(next.id, next.title)}
                        </Link>
                      )}
                    </p>
                  </div>
                )}
                {/* The list is the notebook's table of contents, along the margin line. */}
                <ul className="kp-margin">
                  {items.map((ex) => {
                    const status = statuses.get(ex.id);
                    return (
                      <li key={ex.id}>
                        <Link
                          href={`/exercises/${ex.id}`}
                          className="kp-row flex flex-wrap items-baseline gap-x-4 gap-y-1 py-2.5 pl-4 pr-2"
                        >
                          <span className="font-bold">{numberedTitle(ex.id, ex.title)}</span>
                          {status === "ratkaistu" && (
                            <span className="bg-fill px-1.5 text-xs font-bold text-fill-text">✓ Ratkaistu</span>
                          )}
                          {status === "yritetty" && <span className="text-xs font-bold text-muted">Kesken</span>}
                          <span className={`px-1.5 text-xs font-bold ${LEVEL_STYLE[ex.level]}`}>
                            {LEVELS[ex.level].label}
                          </span>
                          <span className="text-sm text-muted">{ex.topics.join(", ")}</span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </section>
            );
          })}
        </div>
      )}
    </>
  );
}
