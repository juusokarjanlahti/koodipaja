import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { MAX_GUIDE_LENGTH, courseGuide } from "@/lib/guides";
import { courseForTeacher } from "@/lib/teacher/course";
import { saveGuideAction } from "../actions";

export const metadata: Metadata = { title: "Kurssin ohje – Koodipaja" };
export const dynamic = "force-dynamic";

export default async function CourseGuideEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=/opettaja/kurssit/${encodeURIComponent(id)}/ohje`);
  const course = await courseForTeacher(user.id, Number(id));
  if (!course) notFound();
  const markdown = await courseGuide(course.id);

  return (
    <div className="grid max-w-3xl gap-4">
      <p className="text-sm">
        <Link href={`/opettaja/kurssit/${course.id}`} className="text-accent">
          ← {course.title ?? "Kurssi"}
        </Link>
      </p>
      <h1 className="text-2xl font-semibold">Kurssin ohje opiskelijoille</h1>
      <p className="text-muted">
        Kirjoita aikataulu, tavoitteet ja kurssin omat käytännöt. Teksti näkyy opiskelijoille{" "}
        <Link href="/ohje" className="text-accent">
          Ohje-sivulla
        </Link>{" "}
        Koodipajan yleisen ohjeen yläpuolella. Voit käyttää Markdownia (otsikot <code>##</code>, listat <code>-</code>,
        lihavointi <code>**teksti**</code>). Älä kirjoita tekstiin opiskelijoiden henkilötietoja.
      </p>
      <form action={saveGuideAction.bind(null, course.id)} className="grid gap-3">
        <label className="grid gap-1">
          <span className="font-medium">Ohje (Markdown)</span>
          <textarea
            name="markdown"
            defaultValue={markdown}
            maxLength={MAX_GUIDE_LENGTH}
            rows={18}
            className="rounded border border-border bg-bg p-3 font-mono text-sm"
          />
        </label>
        <button type="submit" className="w-fit rounded bg-accent px-4 py-2 font-medium text-accent-text">
          Tallenna
        </button>
      </form>
    </div>
  );
}
