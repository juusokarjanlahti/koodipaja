import Link from "next/link";
import type { NextSteps } from "@/lib/exercises/next-steps";

/**
 * After a solved exercise: the way on. When stuck: other ways forward, said plainly and
 * without judgement (docs/product/visio.md, principles 1 and 4).
 */
export function NextStepsBox({
  steps,
  solved,
  stuck,
  conceptTitles,
}: {
  steps: NextSteps;
  solved: boolean;
  stuck: boolean;
  conceptTitles: Record<string, string>;
}) {
  if (solved) {
    return (
      <nav aria-label="Seuraava tehtävä" className="grid gap-2 rounded-lg border border-border bg-surface p-3">
        {steps.next ? (
          <Link
            href={`/exercises/${steps.next.id}`}
            className="justify-self-start rounded-lg bg-accent px-4 py-2 font-medium text-accent-text"
          >
            Seuraava tehtävä: {steps.next.title} →
          </Link>
        ) : (
          <p className="font-medium">Olet ratkaissut kaikki tämän kielen tehtävät.</p>
        )}
        {steps.comeBack && steps.comeBack.id !== steps.next?.id && (
          <p className="text-sm">
            Tehtävä{" "}
            <Link href={`/exercises/${steps.comeBack.id}`} className="font-medium text-accent underline">
              {steps.comeBack.title}
            </Link>{" "}
            jäi aiemmin kesken. Nyt voi olla hyvä hetki palata siihen.
          </p>
        )}
      </nav>
    );
  }
  if (!stuck || (!steps.skipTo && !steps.review && !steps.comeBack)) return null;
  return (
    <nav aria-label="Muita tapoja edetä" className="grid gap-2 rounded-lg border border-border bg-surface p-3 text-sm">
      <p className="font-medium">Jumiin jääminen kuuluu oppimiseen. Voit myös edetä toista kautta:</p>
      <ul className="grid list-disc gap-1 pl-5">
        {steps.skipTo && (
          <li>
            Jatka tehtävään{" "}
            <Link href={`/exercises/${steps.skipTo.id}`} className="font-medium text-accent underline">
              {steps.skipTo.title}
            </Link>{" "}
            ja palaa tähän myöhemmin. Se ei tarvitse tämän tehtävän asioita.
          </li>
        )}
        {steps.review && (
          <li>
            Kertaa tehtävä{" "}
            <Link href={`/exercises/${steps.review.id}`} className="font-medium text-accent underline">
              {steps.review.title}
            </Link>
            , jossa harjoiteltiin: {steps.review.concepts.map((c) => conceptTitles[c] ?? c).join(", ")}.
          </li>
        )}
        {steps.comeBack && (
          <li>
            Palaa tehtävään{" "}
            <Link href={`/exercises/${steps.comeBack.id}`} className="font-medium text-accent underline">
              {steps.comeBack.title}
            </Link>
            , joka jäi kesken.
          </li>
        )}
      </ul>
    </nav>
  );
}
