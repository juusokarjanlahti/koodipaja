import type { Metadata } from "next";
import { asc } from "drizzle-orm";
import { redirect } from "next/navigation";
import { getDb, schema } from "@/lib/db";
import { requireEnv } from "@/lib/env";
import { LANGUAGE_LABELS, languageRank } from "@/lib/exercises/languages";
import { readChoiceToken } from "@/lib/lti/deep-link";

export const metadata: Metadata = { title: "Valitse tehtävät Moodleen – Koodipaja" };
export const dynamic = "force-dynamic";

/** Deep Linking chooser: the teacher picks exercises for a Moodle activity. */
export default async function ChooseExercisesPage({ searchParams }: { searchParams: Promise<{ valinta?: string; tyhja?: string }> }) {
  const { valinta, tyhja } = await searchParams;
  const choice = valinta ? readChoiceToken(valinta, requireEnv("SESSION_SECRET")) : null;
  if (!valinta || !choice) redirect("/lti-virhe?koodi=choice");

  const exercises = await getDb()
    .select({ id: schema.exercises.id, title: schema.exercises.title, language: schema.exercises.language, topics: schema.exercises.topics })
    .from(schema.exercises)
    .orderBy(asc(schema.exercises.language), asc(schema.exercises.id));
  const groups = [...Map.groupBy(exercises, (e) => e.language).entries()].sort((a, b) => languageRank(a[0]) - languageRank(b[0]));
  const inputType = choice.acceptMultiple ? "checkbox" : "radio";

  return (
    <div className="max-w-3xl">
      <h1 className="mb-2 text-2xl font-semibold">Valitse tehtävät Moodleen</h1>
      <p className="mb-6 text-muted">
        {choice.acceptMultiple
          ? "Jokaisesta valitusta tehtävästä tulee Moodle-kurssille oma arvioitava aktiviteetti."
          : "Valitse aktiviteetille yksi tehtävä. Opiskelijan paras tulos siirtyy Moodlen arviointikirjaan."}
      </p>
      {tyhja && (
        <p role="alert" className="mb-4 rounded-lg border border-border bg-surface p-3">
          Valitse vähintään yksi tehtävä.
        </p>
      )}
      <form method="post" action="/api/lti/deep-link" className="grid gap-6">
        <input type="hidden" name="valinta" value={valinta} />
        {groups.map(([language, items]) => (
          <fieldset key={language} className="rounded-xl border border-border bg-surface p-4">
            <legend className="px-1 text-lg font-semibold">{LANGUAGE_LABELS[language] ?? language}</legend>
            <ul className="grid gap-2">
              {items.map((e) => (
                <li key={e.id}>
                  <label className="flex items-baseline gap-3">
                    <input type={inputType} name="tehtava" value={e.id} required={inputType === "radio"} />
                    <span>
                      <span className="font-medium">{e.title}</span>
                      {e.topics.length > 0 && <span className="ml-2 text-sm text-muted">{e.topics.join(", ")}</span>}
                    </span>
                  </label>
                </li>
              ))}
            </ul>
          </fieldset>
        ))}
        <div>
          <button type="submit" className="rounded-lg bg-accent px-4 py-2 font-medium text-accent-text">
            Lisää Moodleen
          </button>
        </div>
      </form>
    </div>
  );
}
