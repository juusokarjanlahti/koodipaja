import Link from "next/link";
import { asc } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";

export const dynamic = "force-dynamic";

const LANGUAGE_LABELS: Record<string, string> = {
  python: "Python",
  javascript: "JavaScript",
  typescript: "TypeScript",
  c: "C",
  cpp: "C++",
  java: "Java",
  rust: "Rust",
};
// Python is the pilot course; other languages follow as examples of the same exercise.
const LANGUAGE_ORDER = ["python", "javascript", "typescript", "java", "c", "cpp", "rust"];

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

  const rank = (language: string) => {
    const i = LANGUAGE_ORDER.indexOf(language);
    return i === -1 ? LANGUAGE_ORDER.length : i;
  };
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
              <h2 id={`lang-${language}`} className="mb-3 text-lg font-semibold">
                {LANGUAGE_LABELS[language] ?? language}
              </h2>
              <ul className="grid gap-3 sm:grid-cols-2">
                {items.map((ex) => (
                  <li key={ex.id}>
                    <Link
                      href={`/exercises/${ex.id}`}
                      className="block rounded-xl border border-border bg-surface p-4 transition-colors hover:border-accent"
                    >
                      <span className="font-medium">{ex.title}</span>
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
