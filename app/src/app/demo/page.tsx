import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { demoModeEnabled } from "@/lib/demo/mode";

export const metadata: Metadata = { title: "Kokeile demoa – Koodipaja" };
export const dynamic = "force-dynamic";

const CHOICES = [
  {
    role: "student",
    label: "Kokeile opiskelijana",
    text: "Tee ohjelmointitehtäviä selaimessa ja saat heti palautteen testeistä.",
  },
  {
    role: "teacher",
    label: "Kokeile opettajana",
    text: "Näe demokurssin opiskelijoiden edistyminen, palautukset ja avunpyynnöt.",
  },
] as const;

/** Public demo sign-in (docs/specs/demo-mode.md); 404 unless DEMO_MODE=true. */
export default function DemoPage() {
  if (!demoModeEnabled()) notFound();

  return (
    <div className="max-w-3xl">
      <h1 className="kp-display mb-2">Kokeile Koodipajaa</h1>
      <p className="mb-6 max-w-prose text-muted">
        Valitse rooli. Saat oman demotunnuksen, eikä muita tietoja kysytä. Muut kokeilijat eivät näe koodiasi.
      </p>
      <ul className="grid gap-4 sm:grid-cols-2">
        {CHOICES.map((choice) => (
          <li key={choice.role} className="flex flex-col gap-3 rounded-xl border border-border bg-surface p-5">
            <p id={`demo-${choice.role}`} className="text-muted">
              {choice.text}
            </p>
            <form action="/api/demo-login" method="post" className="mt-auto">
              <input type="hidden" name="role" value={choice.role} />
              <button
                type="submit"
                aria-describedby={`demo-${choice.role}`}
                className="rounded-lg bg-action px-4 py-2 font-bold text-action-text"
              >
                {choice.label}
              </button>
            </form>
          </li>
        ))}
      </ul>
    </div>
  );
}
