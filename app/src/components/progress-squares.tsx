import Link from "next/link";
import { numberedTitle } from "@/lib/exercises/order";
import type { ExerciseStatus } from "@/lib/progress";

/**
 * The course as a row of notebook squares (#92): one square per exercise, filled when
 * solved, hatched when started, outlined when it is the next one. Each square opens its
 * exercise; its accessible name says the state in words, so nothing depends on colour.
 */
export function ProgressSquares({
  items,
  nextId,
}: {
  items: { id: string; title: string; status: ExerciseStatus | undefined }[];
  nextId?: string;
}) {
  return (
    <ol className="kp-squares" aria-label="Tehtävät ruutuina">
      {items.map((item, i) => {
        const state = item.status === "ratkaistu" ? "ratkaistu" : item.status === "yritetty" ? "kesken" : "ei aloitettu";
        const isNext = item.id === nextId;
        return (
          <li key={item.id}>
            <Link
              href={`/exercises/${item.id}`}
              className="kp-square"
              data-state={item.status ?? "uusi"}
              data-next={isNext ? "" : undefined}
              aria-label={`${numberedTitle(item.id, item.title)}: ${state}${isNext ? ", seuraavana" : ""}`}
              title={`${numberedTitle(item.id, item.title)}: ${state}`}
            >
              <span aria-hidden="true">{i + 1}</span>
            </Link>
          </li>
        );
      })}
    </ol>
  );
}
