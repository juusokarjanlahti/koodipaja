import type { Metadata } from "next";
import ReactMarkdown from "react-markdown";
import { getCurrentUser } from "@/lib/auth/session";
import { guidesForUser, libraryGuide } from "@/lib/guides";

export const metadata: Metadata = { title: "Ohje – Koodipaja" };
export const dynamic = "force-dynamic";

export default async function GuidePage() {
  const user = await getCurrentUser();
  const guides = user ? (await guidesForUser(user.id)).filter((g) => g.markdown.trim() !== "") : [];
  return (
    <div className="grid gap-6">
      <h1 className="text-2xl font-semibold">Ohje</h1>
      {guides.map((g) => (
        <section key={g.courseId} aria-labelledby={`course-${g.courseId}`} className="rounded-xl border border-accent bg-surface p-5">
          <h2 id={`course-${g.courseId}`} className="mb-2 text-xl font-semibold">
            Kurssin ohje: {g.title ?? "Kurssi"}
          </h2>
          <div className="prose-exercise">
            <ReactMarkdown>{g.markdown}</ReactMarkdown>
          </div>
        </section>
      ))}
      <section aria-label="Koodipajan yleinen ohje" className="prose-exercise rounded-xl border border-border bg-surface p-5">
        <ReactMarkdown>{libraryGuide()}</ReactMarkdown>
      </section>
    </div>
  );
}
