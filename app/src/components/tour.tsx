"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";

/**
 * An optional walk-through of the parts a student must know to do an exercise. It starts
 * only from its button, can be ended at any step (Lopeta or Esc), and never blocks the
 * page: the panel is a non-modal dialog at the bottom of the screen, and the part being
 * explained is outlined and scrolled into view. Run and hints are left out on purpose:
 * they are optional.
 */
type Step = { target: string; title: string; text: string };

export const TOUR_STEPS: Step[] = [
  {
    target: '[data-tour="assignment"]',
    title: "Tehtävänanto",
    text: "Tässä kerrotaan, mitä ohjelmasi pitää tehdä. Esimerkkiajo näyttää, mitä käyttäjä syöttää ja mitä ohjelman pitää tulostaa.",
  },
  {
    target: '[data-tour="editor"]',
    title: "Editori",
    text: "Kirjoita ratkaisusi tähän. Rivit, jotka alkavat #-merkillä (tai // ), ovat kommentteja: ne ovat suunnitelma sinulle, eivätkä ne vaikuta ohjelmaan.",
  },
  {
    target: '[data-tour="editor"] .cm-gutters',
    title: "Rivinumerot",
    text: "Vasemman reunan numerot ovat rivinumeroita. Ne eivät ole osa koodia, eikä niitä kirjoiteta. Jos ohjelmassa on virhe, virheilmoitus kertoo rivin numeron.",
  },
  {
    target: '[data-tour="submit"]',
    title: "Palauta",
    text: "Kun ratkaisusi on valmis, paina Palauta. Ohjelmasi ajetaan testeillä ja saat heti palautteen. Voit palauttaa niin monta kertaa kuin haluat, eikä keskeneräinen palautus haittaa.",
  },
  {
    target: '[data-tour="results"]',
    title: "Testitulokset",
    text: "Palautuksen jälkeen tähän tulee jokainen testi. Ensimmäinen testi, joka ei vielä mene läpi, on seuraava tavoitteesi, ja sen kohdalla näet odotetun ja oman tulosteesi. Esittelyn saa uudelleen Esittely-painikkeesta.",
  },
];

export function Tour() {
  const [step, setStep] = useState<number | null>(null);
  const startRef = useRef<HTMLButtonElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const titleId = useId();

  const end = useCallback(() => {
    setStep(null);
    startRef.current?.focus();
  }, []);

  useEffect(() => {
    if (step === null) return;
    const target = document.querySelector<HTMLElement>(TOUR_STEPS[step].target);
    target?.classList.add("kp-tour-target");
    target?.scrollIntoView({ block: "center", behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
    headingRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") end();
    };
    document.addEventListener("keydown", onKey);
    return () => {
      target?.classList.remove("kp-tour-target");
      document.removeEventListener("keydown", onKey);
    };
  }, [step, end]);

  const current = step === null ? null : TOUR_STEPS[step];
  return (
    <>
      <button
        ref={startRef}
        type="button"
        onClick={() => setStep(0)}
        className="w-fit rounded border border-text bg-surface px-3 py-1 text-sm font-medium"
      >
        Esittely: näin teet tehtävän
      </button>
      {current && step !== null && (
        <div
          role="dialog"
          aria-modal="false"
          aria-labelledby={titleId}
          className="kp-tour fixed inset-x-4 bottom-4 z-50 mx-auto grid max-w-xl gap-2 border-2 border-text bg-surface p-4"
        >
          <p className="text-xs font-bold text-muted">
            Vaihe {step + 1} / {TOUR_STEPS.length}
          </p>
          <h2 id={titleId} ref={headingRef} tabIndex={-1} className="text-lg font-bold">
            {current.title}
          </h2>
          <p>{current.text}</p>
          <div className="mt-1 flex flex-wrap justify-between gap-3">
            <button type="button" onClick={end} className="rounded border border-text bg-surface px-3 py-1.5 font-medium">
              Lopeta esittely
            </button>
            <div className="flex gap-3">
              {step > 0 && (
                <button type="button" onClick={() => setStep(step - 1)} className="rounded border border-text bg-surface px-3 py-1.5 font-medium">
                  Edellinen
                </button>
              )}
              {step < TOUR_STEPS.length - 1 ? (
                <button type="button" onClick={() => setStep(step + 1)} className="rounded bg-action px-4 py-1.5 font-bold text-action-text">
                  Seuraava
                </button>
              ) : (
                <button type="button" onClick={end} className="rounded bg-action px-4 py-1.5 font-bold text-action-text">
                  Valmis
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
