import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { isSolved } from "@/lib/progress";
import { courseExercises, courseForTeacher, courseStudents, isStudentOf, studentSubmissions } from "@/lib/teacher/course";

export const metadata: Metadata = { title: "Opiskelijan palautukset – Koodipaja" };
export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function Output({ label, text }: { label: string; text: string | null | undefined }) {
  return (
    <div>
      <div className="text-xs font-medium text-muted">{label}</div>
      <pre className="overflow-x-auto whitespace-pre-wrap rounded border border-border bg-bg p-2 font-mono text-xs">
        {text ? text : <span className="text-muted">(tyhjä)</span>}
      </pre>
    </div>
  );
}

export default async function StudentSubmissionsPage({ params }: { params: Promise<{ id: string; userId: string }> }) {
  const { id, userId } = await params;
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=/opettaja/kurssit/${encodeURIComponent(id)}`);
  const course = await courseForTeacher(user.id, Number(id));
  if (!course || !UUID.test(userId) || !(await isStudentOf(userId, course.id))) notFound();

  const [exercises, students] = await Promise.all([courseExercises(course.id), courseStudents(course.id)]);
  const student = students.find((s) => s.id === userId)!;
  const submissions = await studentSubmissions(userId, exercises.map((e) => e.id));
  const byExercise = Map.groupBy(submissions, (s) => s.exerciseId);
  const dateFormat = new Intl.DateTimeFormat("fi-FI", { dateStyle: "short", timeStyle: "short", timeZone: "Europe/Helsinki" });

  return (
    <div className="grid gap-6">
      <p className="text-sm">
        <Link href={`/opettaja/kurssit/${course.id}`} className="text-accent">
          ← {course.title ?? "Kurssi"}
        </Link>
      </p>
      <h1 className="text-2xl font-semibold">{student.name}: palautukset</h1>
      {submissions.length === 0 && <p className="text-muted">Ei vielä palautuksia tämän kurssin tehtäviin.</p>}
      {exercises
        .filter((e) => byExercise.has(e.id))
        .map((e) => (
          <section key={e.id} aria-labelledby={`ex-${e.id}`} className="grid gap-3">
            <h2 id={`ex-${e.id}`} className="text-lg font-semibold">
              {e.title} <span className="text-sm font-normal text-muted">({byExercise.get(e.id)!.length} palautusta, uusin ensin)</span>
            </h2>
            {byExercise.get(e.id)!.map((sub, index) => (
              <details key={sub.id} open={index === 0} className="rounded-xl border border-border bg-surface p-3">
                <summary className="cursor-pointer font-medium">
                  {dateFormat.format(sub.createdAt)} ·{" "}
                  {sub.status === "done"
                    ? isSolved(sub)
                      ? `✓ Kaikki ${sub.totalCount} testiä läpi`
                      : `${sub.passedCount} / ${sub.totalCount} testiä läpi`
                    : sub.status === "error"
                      ? "Arviointi epäonnistui"
                      : "Arvioidaan"}
                </summary>
                <div className="mt-3 grid gap-3">
                  <Output label="Koodi" text={sub.sourceCode} />
                  <ol className="grid gap-2">
                    {sub.results.map((r) => (
                      <li key={r.position} className="rounded-lg border border-border p-2">
                        <div className="mb-1 text-sm font-medium">
                          {r.passed ? "✓ Läpi" : "○ Ei vielä läpi"}: {r.name}
                          {r.hidden && <span className="ml-2 text-xs text-muted">(piilotettu testi)</span>}
                          {!r.passed && <span className="ml-2 text-xs text-muted">{r.judgeStatus}</span>}
                        </div>
                        <div className="grid gap-2 sm:grid-cols-3">
                          <Output label="Syöte" text={r.stdin} />
                          <Output label="Odotettu tuloste" text={r.expectedStdout} />
                          <Output label="Opiskelijan tuloste" text={r.stdout} />
                        </div>
                        {r.stderr && <Output label="Virheilmoitus" text={r.stderr} />}
                      </li>
                    ))}
                  </ol>
                </div>
              </details>
            ))}
          </section>
        ))}
    </div>
  );
}
