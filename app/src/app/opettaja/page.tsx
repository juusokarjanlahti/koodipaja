import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { teacherCourses } from "@/lib/teacher/course";

export const metadata: Metadata = { title: "Opettajan näkymä – Koodipaja" };
export const dynamic = "force-dynamic";

export default async function TeacherHomePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/opettaja");
  const courses = await teacherCourses(user.id);
  if (courses.length === 0) notFound();

  return (
    <div className="max-w-3xl">
      <h1 className="mb-2 text-2xl font-semibold">Opettajan näkymä</h1>
      <p className="mb-6 text-muted">Kurssit, joilla olet Moodlessa opettajana.</p>
      <ul className="grid gap-3">
        {courses.map((c) => (
          <li key={c.id}>
            <Link
              href={`/opettaja/kurssit/${c.id}`}
              className="block rounded-xl border border-border bg-surface p-4 transition-colors hover:border-accent"
            >
              <span className="font-medium">{c.title ?? "Nimetön kurssi"}</span>
              <span className="mt-1 block text-sm text-muted">
                {c.students} opiskelijaa · {c.exercises} tehtävää
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
