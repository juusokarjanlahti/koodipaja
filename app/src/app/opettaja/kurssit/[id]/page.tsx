import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { openHelpRequests } from "@/lib/help/requests";
import { answerHelpAction, retryGradesAction } from "./actions";
import { LANGUAGE_LABELS } from "@/lib/exercises/languages";
import { courseExercises, courseGradeSyncCounts, courseForTeacher, courseProgressRows, courseStudents } from "@/lib/teacher/course";
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
  const helpRequests = await openHelpRequests(course.id);
  const gradeCounts = await courseGradeSyncCounts(course.id);
  const totalFailed = [...gradeCounts.values()].reduce((sum, g) => sum + g.failed, 0);
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
      <p className="text-sm">
        <Link href={`/opettaja/kurssit/${course.id}/ohje`} className="text-accent">
          Muokkaa kurssin ohjetta opiskelijoille
        </Link>
      </p>
      <p className="text-muted">
        {students.length} opiskelijaa · {exercises.length} tehtävää. Tehtävät ovat ne, joihin kurssin Moodle-aktiviteetit
        vievät.
      </p>

      {helpRequests.length > 0 && (
        <section aria-labelledby="help-requests" className="grid gap-3 rounded-xl border border-border bg-surface p-4">
          <h2 id="help-requests" className="text-lg font-semibold">
            Avunpyynnöt ({helpRequests.length})
          </h2>
          <ul className="grid gap-4">
            {helpRequests.map((r) => (
              <li key={r.id} className="grid gap-2">
                <p>
                  <Link href={`/opettaja/kurssit/${course.id}/opiskelijat/${r.userId}`} className="font-medium text-accent">
                    {r.studentName ?? r.studentEmail ?? "Nimetön opiskelija"}
                  </Link>{" "}
                  · {r.exerciseTitle} ·{" "}
                  {r.kind === "kiista" ? "Mielestään vastaus on oikein" : "Ei ymmärrä, miksi ei mene läpi"}
                </p>
                {r.message && <p className="text-sm">&ldquo;{r.message}&rdquo;</p>}
                <form action={answerHelpAction.bind(null, course.id)} className="grid gap-2">
                  <input type="hidden" name="requestId" value={r.id} />
                  <label className="grid gap-1 text-sm">
                    <span className="font-medium">Vastaus opiskelijalle (näkyy vain hänelle)</span>
                    <textarea name="reply" required maxLength={1000} rows={2} className="rounded border border-border bg-bg p-2" />
                  </label>
                  <button type="submit" className="w-fit rounded border border-border px-3 py-1.5 text-sm font-medium">
                    Lähetä vastaus
                  </button>
                </form>
              </li>
            ))}
          </ul>
        </section>
      )}

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
          {totalFailed > 0 && (
            <form action={retryGradesAction.bind(null, course.id)} className="flex flex-wrap items-center gap-3 rounded-lg border border-fail bg-fail-bg p-3 text-sm">
              <p className="text-fail">{totalFailed} arvosanan siirto Moodleen ei onnistunut.</p>
              <button type="submit" className="rounded border border-border bg-surface px-3 py-1 font-medium">
                Lähetä epäonnistuneet uudelleen
              </button>
            </form>
          )}
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
                <tr>
                  <th scope="row" className="sticky left-0 bg-surface p-2 text-left">
                    Arvosanat Moodleen
                  </th>
                  <td />
                  {progress.exercises.map((e) => {
                    const g = gradeCounts.get(e.id) ?? { sent: 0, failed: 0 };
                    return (
                      <td key={e.id} className="p-2 tabular-nums">
                        {g.sent} siirretty
                        {g.failed > 0 && <span className="block font-medium text-fail">{g.failed} epäonnistui</span>}
                      </td>
                    );
                  })}
                </tr>
              </tfoot>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
