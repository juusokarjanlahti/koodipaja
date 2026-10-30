"use client";

import Link from "next/link";
import { useId, useMemo, useState } from "react";
import type { CheatsheetCard } from "@/lib/concepts/queries";
import { Assignment } from "./assignment";
import { BlockSnippet } from "./snippet";

function matches(card: CheatsheetCard, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return [card.title, card.explanationMarkdown, card.exampleCode, card.note, card.topicLabel]
    .join("\n")
    .toLowerCase()
    .includes(q);
}

function NoteEditor({ card }: { card: CheatsheetCard }) {
  const [note, setNote] = useState(card.note);
  const [saved, setSaved] = useState(card.note);
  const [status, setStatus] = useState<string | null>(null);
  const id = useId();

  const save = async () => {
    setStatus("Tallennetaan…");
    const res = await fetch("/api/notes", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ language: card.language, conceptId: card.id, note }),
    });
    const data = (await res.json().catch(() => ({}))) as { error?: string };
    if (res.ok) {
      setSaved(note);
      setStatus("Tallennettu");
    } else {
      setStatus(data.error ?? "Tallennus epäonnistui.");
    }
  };

  return (
    <div className="grid gap-1 print:hidden">
      <label htmlFor={id} className="text-xs font-medium text-muted">
        Oma muistiinpano <span className="font-normal">(näkyy vain sinulle)</span>
      </label>
      <textarea
        id={id}
        value={note}
        onChange={(e) => {
          setNote(e.target.value);
          setStatus(null);
        }}
        maxLength={500}
        rows={2}
        className="rounded-md border border-border bg-bg p-2 text-sm"
        placeholder="Esim. muista int() ennen laskemista"
      />
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => void save()}
          disabled={note === saved}
          className="rounded-md border border-border px-3 py-1 text-sm disabled:opacity-50"
        >
          Tallenna
        </button>
        <span className="text-xs text-muted" role="status">
          {status}
        </span>
      </div>
    </div>
  );
}

function Card({ card }: { card: CheatsheetCard }) {
  return (
    <article className="grid gap-2 rounded-xl border border-border bg-surface p-4 break-inside-avoid" data-concept={card.id}>
      <h3 className="font-semibold">{card.title}</h3>
      <div className="prose-exercise text-sm">
        <Assignment markdown={card.explanationMarkdown} />
      </div>
      <div className="prose-exercise text-sm">
        <BlockSnippet text={card.exampleCode.replace(/\n$/, "")} />
      </div>
      {card.exampleStdout && (
        <details className="text-sm">
          <summary className="cursor-pointer text-muted">Esimerkin tuloste</summary>
          <pre className="mt-1 overflow-x-auto rounded-md border border-border bg-bg p-2 font-mono">
            {card.exampleStdin && (
              <span className="text-muted">
                {"# syöte:\n"}
                {card.exampleStdin}
                {"# tuloste:\n"}
              </span>
            )}
            {card.exampleStdout}
          </pre>
        </details>
      )}
      {card.note && <p className="hidden text-sm print:block">Muistiinpano: {card.note}</p>}
      <NoteEditor card={card} />
      <p className="text-xs text-muted">
        Opittu tehtävässä{" "}
        <Link href={`/exercises/${card.learnedIn.exerciseId}`} className="underline">
          {card.learnedIn.title}
        </Link>
      </p>
    </article>
  );
}

function toMarkdown(cards: CheatsheetCard[]): string {
  const lines = ["# Oma muistilista", ""];
  for (const card of cards) {
    lines.push(`## ${card.title}`, "", card.explanationMarkdown.trim(), "", "```python", card.exampleCode.trimEnd(), "```", "");
    if (card.note) lines.push(`> Oma muistiinpano: ${card.note}`, "");
  }
  return lines.join("\n");
}

/** Search box + cards. `grouped` shows topic headings (the full cheat sheet page). */
export function CheatsheetView({ cards, grouped = false }: { cards: CheatsheetCard[]; grouped?: boolean }) {
  const [query, setQuery] = useState("");
  const searchId = useId();
  const visible = useMemo(() => cards.filter((c) => matches(c, query)), [cards, query]);

  const groups = useMemo(() => {
    const map = new Map<string, CheatsheetCard[]>();
    for (const card of visible) map.set(card.topicLabel, [...(map.get(card.topicLabel) ?? []), card]);
    return [...map.entries()];
  }, [visible]);

  const download = () => {
    const url = URL.createObjectURL(new Blob([toMarkdown(cards)], { type: "text/markdown;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "muistilista.md";
    a.click();
    URL.revokeObjectURL(url);
  };

  if (cards.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-border p-3 text-sm text-muted">
        Muistilista täyttyy itsestään, kun teet tehtäviä: jokainen palautettu tehtävä lisää tänne asiat, joita se
        opettaa.
      </p>
    );
  }

  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap items-center gap-2 print:hidden">
        <label htmlFor={searchId} className="sr-only">
          Hae muistilistasta
        </label>
        <input
          id={searchId}
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Hae, esim. print tai silmukka"
          className="min-w-0 flex-1 rounded-lg border border-border bg-bg px-3 py-2 text-sm"
        />
        {grouped && (
          <>
            <button type="button" onClick={() => window.print()} className="rounded-lg border border-border px-3 py-2 text-sm">
              Tulosta
            </button>
            <button type="button" onClick={download} className="rounded-lg border border-border px-3 py-2 text-sm">
              Lataa Markdownina
            </button>
          </>
        )}
      </div>
      <p className="sr-only" role="status">
        {visible.length} korttia
      </p>
      {visible.length === 0 && <p className="text-sm text-muted">Ei osumia haulle.</p>}
      {grouped
        ? groups.map(([topic, group]) => (
            <section key={topic} className="grid gap-3">
              <h2 className="text-lg font-semibold">{topic}</h2>
              <div className="grid gap-3 md:grid-cols-2">
                {group.map((card) => (
                  <Card key={`${card.language}/${card.id}`} card={card} />
                ))}
              </div>
            </section>
          ))
        : visible.map((card) => <Card key={`${card.language}/${card.id}`} card={card} />)}
    </div>
  );
}

/**
 * Collapsed by default on the exercise page: recalling from memory is itself effective
 * practice, so the cheat sheet is one click away but does not replace it.
 */
export function CheatsheetPanel({ cards }: { cards: CheatsheetCard[] }) {
  const [open, setOpen] = useState(false);
  const regionId = useId();
  return (
    <section className="rounded-xl border border-border bg-surface">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={regionId}
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between px-4 py-3 text-left font-medium"
      >
        <span>Muistilista ({cards.length})</span>
        <span aria-hidden="true">{open ? "−" : "+"}</span>
      </button>
      {open && (
        <div id={regionId} className="grid gap-3 border-t border-border p-4">
          <CheatsheetView cards={cards} />
          <Link href="/muistilista" className="text-sm font-medium text-accent">
            Avaa koko muistilista
          </Link>
        </div>
      )}
    </section>
  );
}
