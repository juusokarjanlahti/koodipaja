import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { LANGUAGE_LABELS } from "@/lib/exercises/languages";
import { courseExercises, courseForTeacher, courseProgressRows, courseStudents } from "@/lib/teacher/course";
import { buildProgress, cellLabel, percent, type CellState, type SortOrder } from "@/lib/teacher/progress";

export const metadata: Metadata = { title: "Kurssin eteneminen – Koodipaja" };
export const dynamic = "force-dynamic";

const CELL_STYLE: Record<CellState, string> = {
  ratkaistu: "bg-ok-bg text-ok font-medium",
  yritetty: "",
  "ei-aloitettu": "text-muted",
};
const CELL_ICON: Record<CellState, string> = { ratkaistu: "✓ ", yritetty: "○ ", "ei-aloitettu": "" };

export default async function CourseProgressPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ jarjestys?: string }>;
}) {
  const { id } = await params;
  const { jarjestys } = await searchParams;
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=/opettaja/kurssit/${encodeURIComponent(id)}`);
  const course = await courseForTeacher(user.id, Number(id));
  if (!course) notFound();

  const sort: SortOrder = jarjestys === "ratkaistu" ? "ratkaistu" : "nimi";
  const [students, exercises] = await Promise.all([courseStudents(course.id), courseExercises(course.id)]);
  const rows = await courseProgressRows(
    students.map((s) => s.id),
    exercises.map((e) => e.id),
  );
  const progress = buildProgress(students, exercises, rows, sort);
  const multiLanguage = new Set(exercises.map((e) => e.language)).size > 1;
  const title = course.title ?? "Nimetön kurssi";

  return (
    <div className="grid gap-4">
      <p className="text-sm">
        <Link href="/opettaja" className="text-accent">
          ← Opettajan näkymä
        </Link>
      </p>
      <h1 className="text-2xl font-semibold">{title}</h1>
      <p className="text-muted">
        {students.length} opiskelijaa · {exercises.length} tehtävää. Tehtävät ovat ne, joihin kurssin Moodle-aktiviteetit
        vievät.
      </p>

      {students.length === 0 || exercises.length === 0 ? (
        <p className="rounded-lg border border-border bg-surface p-4">
          {exercises.length === 0
            ? "Kurssilla ei vielä ole Koodipaja-tehtäviä. Lisää Moodlessa aktiviteetti ja valitse tehtävä."
            : "Kukaan opiskelija ei ole vielä avannut Koodipajaa tältä kurssilta."}
        </p>
      ) : (
        <>
          <nav aria-label="Järjestys" className="flex gap-4 text-sm">
            <span className="text-muted">Järjestä:</span>
            <Link href="?jarjestys=nimi" aria-current={sort === "nimi" ? "true" : undefined} className={sort === "nimi" ? "font-semibold" : "text-accent"}>
              nimen mukaan
            </Link>
            <Link
              href="?jarjestys=ratkaistu"
              aria-current={sort === "ratkaistu" ? "true" : undefined}
              className={sort === "ratkaistu" ? "font-semibold" : "text-accent"}
            >
              vähiten ratkaisseet ensin
            </Link>
          </nav>
          <div
            role="region"
            aria-labelledby="progress-caption"
            tabIndex={0}
            className="overflow-x-auto rounded-xl border border-border bg-surface"
          >
            <table className="min-w-full border-collapse text-sm">
              <caption id="progress-caption" className="sr-only">
                Kurssin {title} eteneminen: opiskelijat riveillä, tehtävät sarakkeissa
              </caption>
              <thead>
                <tr className="border-b border-border">
                  <th scope="col" className="sticky left-0 bg-surface p-2 text-left">
                    Opiskelija
                  </th>
                  <th scope="col" className="p-2 text-right">
                    Ratkaistu
                  </th>
                  {progress.exercises.map((e) => (
                    <th key={e.id} scope="col" className="p-2 text-left font-medium">
                      <Link href={`/exercises/${e.id}`} className="text-accent">
                        {e.title}
                      </Link>
                      {multiLanguage && <span className="block text-xs text-muted">{LANGUAGE_LABELS[e.language] ?? e.language}</span>}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {progress.students.map((s) => (
                  <tr key={s.id} className="border-b border-border">
                    <th scope="row" className="sticky left-0 bg-surface p-2 text-left font-medium">
                      <Link href={`/opettaja/kurssit/${course.id}/opiskelijat/${s.id}`} className="text-accent">
                        {s.name}
                      </Link>
                    </th>
                    <td className="p-2 text-right tabular-nums">
                      {s.solvedCount} / {exercises.length}
                    </td>
                    {s.cells.map((c, i) => (
                      <td key={progress.exercises[i].id} className={`whitespace-nowrap p-2 ${CELL_STYLE[c.state]}`}>
                        <span aria-hidden="true">{CELL_ICON[c.state]}</span>
                        {cellLabel(c)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <th scope="row" className="sticky left-0 bg-surface p-2 text-left">
                    Ratkaisseita
                  </th>
                  <td />
                  {progress.exercises.map((e) => (
                    <td key={e.id} className="p-2 tabular-nums">
                      {percent(e.solveRate)} <span className="text-muted">({e.solvedCount})</span>
                    </td>
                  ))}
                </tr>
              </tfoot>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
