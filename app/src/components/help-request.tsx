"use client";

import { useState } from "react";
import type { HelpRequestView } from "@/lib/help/requests";

const MAX = 500;

/** "Pyydä apua": always available, one open request per exercise (#49). */
export function HelpRequest({
  exerciseId,
  initial,
}: {
  exerciseId: string;
  initial: HelpRequestView | null;
}) {
  const [current, setCurrent] = useState<HelpRequestView | null>(initial);
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<"apu" | "kiista">("apu");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Whether the same answer is already with the teacher, or already decided (#51).
  const [same, setSame] = useState<{ pending: boolean; rejectedReason: string | null } | null>(null);

  async function openForm() {
    setOpen(true);
    const res = await fetch(`/api/help-requests?exerciseId=${encodeURIComponent(exerciseId)}`, { cache: "no-store" }).catch(
      () => null,
    );
    if (res?.ok) setSame(await res.json());
  }

  async function send(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    const res = await fetch("/api/help-requests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ exerciseId, kind, message }),
    });
    setBusy(false);
    if (!res.ok) {
      setError(
        ((await res.json().catch(() => null)) as { error?: string } | null)
          ?.error ?? "Lähetys ei onnistunut.",
      );
      return;
    }
    setCurrent({
      id: "uusi",
      kind,
      message: message.trim() || null,
      status: "open",
      reply: null,
    });
    setOpen(false);
  }

  async function withdraw() {
    setBusy(true);
    const res = await fetch(
      `/api/help-requests?exerciseId=${encodeURIComponent(exerciseId)}`,
      { method: "DELETE" },
    );
    setBusy(false);
    if (res.ok) setCurrent(null);
    else setError("Peruminen ei onnistunut.");
  }

  return (
    <section
      aria-labelledby="help-heading"
      className="rounded-xl border border-border bg-surface p-4"
    >
      <h2 id="help-heading" className="font-semibold">
        Pyydä apua
      </h2>
      <p className="text-sm text-muted">
        Avun pyytäminen on ihan tavallista. Opettaja katsoo viimeisimmän
        palautuksesi.
      </p>

      <div role="status" className="mt-2 text-sm">
        {current?.status === "open" && (
          <p>Pyyntö on lähetetty. Opettaja näkee sen.</p>
        )}
        {current?.status === "answered" && (
          <p>
            <span className="font-medium">Opettajan vastaus:</span>{" "}
            {current.reply}
          </p>
        )}
      </div>

      {!open ? (
        <>
          <div className="mt-2 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void openForm()}
              aria-expanded={false}
              className="rounded border border-border px-3 py-1.5 text-sm font-medium"
            >
              {current?.status === "open" ? "Muokkaa pyyntöä" : "Pyydä apua"}
            </button>
            {current?.status === "open" && (
              <button
                type="button"
                onClick={withdraw}
                disabled={busy}
                className="rounded border border-border px-3 py-1.5 text-sm"
              >
                Peruuta pyyntö
              </button>
            )}
          </div>
          {error && <p className="mt-2 text-sm text-fail">{error}</p>}
        </>
      ) : (
        <form onSubmit={send} className="mt-3 grid gap-3">
          <fieldset className="grid gap-1 text-sm">
            <legend className="font-medium">Mistä on kyse?</legend>
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name="kind"
                checked={kind === "apu"}
                onChange={() => setKind("apu")}
              />
              En ymmärrä, miksi tämä ei mene läpi
            </label>
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name="kind"
                checked={kind === "kiista"}
                onChange={() => setKind("kiista")}
              />
              Mielestäni vastaukseni on oikein
            </label>
          </fieldset>
          {kind === "kiista" && same?.pending && (
            <p role="status" className="rounded border border-border bg-bg p-2 text-sm">
              Opettaja katsoo jo täsmälleen samaa vastausta toiselta opiskelijalta. Sinun ei tarvitse lähettää omaa
              pyyntöä: jos opettaja hyväksyy vastauksen, se hyväksytään myös sinulle.
            </p>
          )}
          {kind === "kiista" && same?.rejectedReason && (
            <p role="status" className="rounded border border-border bg-bg p-2 text-sm">
              <span className="font-medium">Opettaja on jo katsonut saman vastauksen ja vastasi:</span>{" "}
              {same.rejectedReason}
            </p>
          )}
          <label className="grid gap-1 text-sm">
            <span className="font-medium">
              Viesti opettajalle (vapaaehtoinen)
            </span>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              maxLength={MAX}
              rows={3}
              className="rounded border border-border bg-bg p-2"
            />
          </label>
          {error && <p className="text-sm text-fail">{error}</p>}
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={busy}
              className="rounded bg-action px-3 py-1.5 text-sm font-bold text-action-text"
            >
              Lähetä opettajalle
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded border border-border px-3 py-1.5 text-sm"
            >
              Peruuta
            </button>
          </div>
        </form>
      )}
    </section>
  );
}
