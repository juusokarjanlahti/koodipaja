import Link from "next/link";
import { asc } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth/session";
import { getDb, schema } from "@/lib/db";
import { LANGUAGE_LABELS, languageRank } from "@/lib/exercises/languages";
import { getExerciseStatuses, type ExerciseStatus } from "@/lib/progress";

export const dynamic = "force-dynamic";


export default async function HomePage() {
  const exercises = await getDb()
    .select({
      id: schema.exercises.id,
      title: schema.exercises.title,
      language: schema.exercises.language,
      difficulty: schema.exercises.difficulty,
      topics: schema.exercises.topics,
    })
    .from(schema.exercises)
    .orderBy(asc(schema.exercises.language), asc(schema.exercises.id));

  const rank = languageRank;
  const user = await getCurrentUser();
  const statuses: Map<string, ExerciseStatus> = user ? await getExerciseStatuses(user.id) : new Map();

  const groups = [...Map.groupBy(exercises, (ex) => ex.language).entries()].sort((a, b) => rank(a[0]) - rank(b[0]));

  return (
    <>
      <h1 className="mb-2 text-2xl font-semibold">Tehtävät</h1>
      <p className="mb-6 text-muted">Valitse tehtävä, kirjoita ratkaisu ja saat heti palautteen.</p>

      {exercises.length === 0 ? (
        <p className="rounded-lg border border-border bg-surface p-4">
          Tehtäviä ei ole vielä tuotu. Aja <code>npm run import-exercises</code>.
        </p>
      ) : (
        <div className="grid gap-8">
          {groups.map(([language, items]) => (
            <section key={language} aria-labelledby={`lang-${language}`}>
              <div className="mb-3 flex items-baseline justify-between gap-3">
                <h2 id={`lang-${language}`} className="text-lg font-semibold">
                  {LANGUAGE_LABELS[language] ?? language}
                </h2>
                {user && (
                  <span className="text-sm text-muted">
                    Ratkaistu {items.filter((ex) => statuses.get(ex.id) === "ratkaistu").length} / {items.length}
                  </span>
                )}
              </div>
              <ul className="grid gap-3 sm:grid-cols-2">
                {items.map((ex) => (
                  <li key={ex.id}>
                    <Link
                      href={`/exercises/${ex.id}`}
                      className="block rounded-xl border border-border bg-surface p-4 transition-colors hover:border-accent"
                    >
                      <div className="flex items-baseline justify-between gap-3">
                        <span className="font-medium">{ex.title}</span>
                        {statuses.get(ex.id) === "ratkaistu" && (
                          <span className="rounded bg-ok-bg px-2 py-0.5 text-xs font-medium text-ok">✓ Ratkaistu</span>
                        )}
                        {statuses.get(ex.id) === "yritetty" && (
                          <span className="rounded border border-border px-2 py-0.5 text-xs text-muted">Kesken</span>
                        )}
                      </div>
                      <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-muted">
                        <span aria-label={`Vaikeustaso ${ex.difficulty} / 5`}>
                          {"●".repeat(ex.difficulty)}
                          <span className="opacity-30">{"●".repeat(5 - ex.difficulty)}</span>
                        </span>
                        {ex.topics.map((t) => (
                          <span key={t} className="rounded border border-border px-1.5 text-xs">
                            {t}
                          </span>
                        ))}
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </>
  );
}
