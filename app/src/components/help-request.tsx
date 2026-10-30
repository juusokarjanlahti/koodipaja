"use client";

import { useState } from "react";
import type { HelpRequestView } from "@/lib/help/requests";

const MAX = 500;

/** "Pyydä apua": always available, one open request per exercise (#49). */
export function HelpRequest({ exerciseId, initial }: { exerciseId: string; initial: HelpRequestView | null }) {
  const [current, setCurrent] = useState<HelpRequestView | null>(initial);
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<"apu" | "kiista">("apu");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      setError(((await res.json().catch(() => null)) as { error?: string } | null)?.error ?? "Lähetys ei onnistunut.");
      return;
    }
    setCurrent({ id: "uusi", kind, message: message.trim() || null, status: "open", reply: null });
    setOpen(false);
  }

  return (
    <section aria-labelledby="help-heading" className="rounded-xl border border-border bg-surface p-4">
      <h2 id="help-heading" className="font-semibold">
        Pyydä apua
      </h2>
      <p className="text-sm text-muted">Avun pyytäminen on ihan tavallista. Opettaja katsoo viimeisimmän palautuksesi.</p>

      <div role="status" className="mt-2 text-sm">
        {current?.status === "open" && <p>Pyyntö on lähetetty. Opettaja näkee sen.</p>}
        {current?.status === "answered" && (
          <p>
            <span className="font-medium">Opettajan vastaus:</span> {current.reply}
          </p>
        )}
      </div>

      {!open ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-expanded={false}
          className="mt-2 rounded border border-border px-3 py-1.5 text-sm font-medium"
        >
          {current?.status === "open" ? "Muokkaa pyyntöä" : "Pyydä apua"}
        </button>
      ) : (
        <form onSubmit={send} className="mt-3 grid gap-3">
          <fieldset className="grid gap-1 text-sm">
            <legend className="font-medium">Mistä on kyse?</legend>
            <label className="flex items-center gap-2">
              <input type="radio" name="kind" checked={kind === "apu"} onChange={() => setKind("apu")} />
              En ymmärrä, miksi tämä ei mene läpi
            </label>
            <label className="flex items-center gap-2">
              <input type="radio" name="kind" checked={kind === "kiista"} onChange={() => setKind("kiista")} />
              Mielestäni vastaukseni on oikein
            </label>
          </fieldset>
          <label className="grid gap-1 text-sm">
            <span className="font-medium">Viesti opettajalle (vapaaehtoinen)</span>
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
            <button type="submit" disabled={busy} className="rounded bg-accent px-3 py-1.5 text-sm font-medium text-white">
              Lähetä opettajalle
            </button>
            <button type="button" onClick={() => setOpen(false)} className="rounded border border-border px-3 py-1.5 text-sm">
              Peruuta
            </button>
          </div>
        </form>
      )}
    </section>
  );
}
