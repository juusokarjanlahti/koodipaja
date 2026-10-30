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

function Card({ card, open, onToggle }: { card: CheatsheetCard; open: boolean; onToggle: (open: boolean) => void }) {
  return (
    <details
      open={open}
      onToggle={(e) => {
        const next = (e.currentTarget as HTMLDetailsElement).open;
        if (next !== open) onToggle(next);
      }}
      className="rounded-xl border border-border bg-surface break-inside-avoid"
      data-concept={card.id}
    >
      <summary className="flex cursor-pointer items-center justify-between gap-3 px-4 py-2.5 font-medium">
        <span>{card.title}</span>
        {card.note && (
          <span className="shrink-0 text-xs font-normal text-muted" title="Kortissa on oma muistiinpano">
            ✎ <span className="sr-only">oma muistiinpano</span>
          </span>
        )}
      </summary>
      <div className="grid gap-2 border-t border-border p-4">
        <div className="prose-exercise text-sm">
          <Assignment markdown={card.explanationMarkdown} />
        </div>
        <div className="prose-exercise text-sm">
          <BlockSnippet text={card.exampleCode.replace(/\n$/, "")} />
        </div>
        <p className="text-xs text-muted print:hidden">
          Vedä esimerkki tai koodisana editoriin, tai kopioi napauttamalla.
        </p>
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
      </div>
    </details>
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

const cardKey = (card: CheatsheetCard) => `${card.language}/${card.id}`;
const topicAnchor = (topic: string) =>
  `aihe-${topic.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-")}`;

/**
 * Search box + cards grouped by topic. Cards are closed, so the student scans titles and
 * opens only what they need; a search opens the matching cards. `full` is the whole cheat
 * sheet page: a topic menu, open/close all, print and download.
 */
export function CheatsheetView({ cards, full = false }: { cards: CheatsheetCard[]; full?: boolean }) {
  const [query, setQuery] = useState("");
  const [openKeys, setOpenKeys] = useState<Set<string>>(new Set());
  const searchId = useId();
  const visible = useMemo(() => cards.filter((c) => matches(c, query)), [cards, query]);
  const searching = query.trim() !== "";

  const groups = useMemo(() => {
    const map = new Map<string, CheatsheetCard[]>();
    for (const card of visible) map.set(card.topicLabel, [...(map.get(card.topicLabel) ?? []), card]);
    return [...map.entries()];
  }, [visible]);

  const isOpen = (card: CheatsheetCard) => searching || openKeys.has(cardKey(card));
  const toggle = (card: CheatsheetCard, open: boolean) =>
    setOpenKeys((keys) => {
      const next = new Set(keys);
      if (open) next.add(cardKey(card));
      else next.delete(cardKey(card));
      return next;
    });
  const setAll = (open: boolean) => setOpenKeys(open ? new Set(cards.map(cardKey)) : new Set());

  const print = () => {
    setAll(true);
    // Let React open every card before the print dialog takes its snapshot.
    setTimeout(() => window.print(), 50);
  };

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

  const Heading = full ? "h2" : "h3";
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
        {full && (
          <>
            <button type="button" onClick={() => setAll(true)} className="rounded-lg border border-border px-3 py-2 text-sm">
              Avaa kaikki
            </button>
            <button type="button" onClick={() => setAll(false)} className="rounded-lg border border-border px-3 py-2 text-sm">
              Sulje kaikki
            </button>
            <button type="button" onClick={print} className="rounded-lg border border-border px-3 py-2 text-sm">
              Tulosta
            </button>
            <button type="button" onClick={download} className="rounded-lg border border-border px-3 py-2 text-sm">
              Lataa Markdownina
            </button>
          </>
        )}
      </div>
      {full && !searching && (
        <nav aria-label="Aiheet" className="print:hidden">
          <ul className="flex flex-wrap gap-2 text-sm">
            {groups.map(([topic, group]) => (
              <li key={topic}>
                <a href={`#${topicAnchor(topic)}`} className="inline-block rounded-full border border-border px-3 py-1 hover:border-accent">
                  {topic} <span className="text-muted">({group.length})</span>
                </a>
              </li>
            ))}
          </ul>
        </nav>
      )}
      <p className="sr-only" role="status">
        {searching ? `${visible.length} korttia` : ""}
      </p>
      {visible.length === 0 && <p className="text-sm text-muted">Ei osumia haulle.</p>}
      {groups.map(([topic, group]) => (
        <section key={topic} aria-labelledby={topicAnchor(topic)} className="grid gap-2">
          <Heading id={topicAnchor(topic)} className={`scroll-mt-4 font-semibold ${full ? "text-lg" : "text-sm text-muted"}`}>
            {topic}
          </Heading>
          <div className="grid gap-2">
            {group.map((card) => (
              <Card key={cardKey(card)} card={card} open={isOpen(card)} onToggle={(open) => toggle(card, open)} />
            ))}
          </div>
        </section>
      ))}
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
