"use client";

import { python } from "@codemirror/lang-python";
import CodeMirror from "@uiw/react-codemirror";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { PresentedCase, PresentedSubmission } from "@/lib/grading/present";
import { FORMATTING_DIFFERENCE } from "@/lib/grading/status";
import type { RunOutput } from "@/lib/runs/output";

const POLL_MS = 800;
const POLL_TIMEOUT_MS = 90_000;

const LANGUAGE_EXTENSIONS = { python: () => python() } as const;

function statusLabel(c: PresentedCase): string {
  if (c.passed === null) return "Odottaa";
  if (c.passed) return c.judgeStatus === FORMATTING_DIFFERENCE ? "Läpi (pieni muotoiluero)" : "Läpi";
  switch (c.judgeStatus) {
    case "Wrong Answer":
      return "Väärä tuloste";
    case "Time Limit Exceeded":
      return "Aikaraja ylittyi";
    case "Compilation Error":
      return "Käännösvirhe";
    default:
      return c.judgeStatus?.startsWith("Runtime Error") ? "Ajonaikainen virhe" : (c.judgeStatus ?? "Virhe");
  }
}

function runStatusLabel(r: RunOutput): string {
  const time = r.timeMs !== null ? ` (${r.timeMs} ms)` : "";
  if (r.ok) return `Ajo valmis${time}`;
  if (r.statusDescription === "Time Limit Exceeded") return "Aikaraja ylittyi: ohjelma ei päättynyt ajoissa.";
  if (r.statusDescription.startsWith("Runtime Error")) return `Ajonaikainen virhe${time}`;
  return r.statusDescription;
}

function Output({ label, text }: { label: string; text: string | null | undefined }) {
  if (text === undefined || text === null) return null;
  return (
    <div>
      <div className="mb-1 text-xs font-medium text-muted">{label}</div>
      <pre className="overflow-x-auto rounded-md border border-border bg-bg p-2 font-mono text-sm whitespace-pre-wrap">
        {text === "" ? <span className="text-muted">(tyhjä)</span> : text}
      </pre>
    </div>
  );
}

export function ExerciseWorkspace({
  exerciseId,
  language,
  starterCode,
  initialCode,
  exampleStdin,
}: {
  exerciseId: string;
  language: string;
  starterCode: string;
  initialCode: string;
  exampleStdin: string;
}) {
  const [code, setCode] = useState(initialCode);
  const [stdin, setStdin] = useState(exampleStdin);
  const [runOutput, setRunOutput] = useState<RunOutput | null>(null);
  const [runError, setRunError] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const [submission, setSubmission] = useState<PresentedSubmission | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const pollTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const extensions = useMemo(() => {
    const make = LANGUAGE_EXTENSIONS[language as keyof typeof LANGUAGE_EXTENSIONS];
    return make ? [make()] : [];
  }, [language]);

  useEffect(() => () => {
    if (pollTimer.current) clearTimeout(pollTimer.current);
  }, []);

  const poll = useCallback((id: string, startedAt: number) => {
    pollTimer.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/submissions/${id}`, { cache: "no-store" });
        if (!res.ok) throw new Error("Tuloksen haku epäonnistui.");
        const data = (await res.json()) as PresentedSubmission;
        setSubmission(data);
        if (data.status === "done" || data.status === "error") {
          setBusy(false);
          if (data.errorMessage) setError(data.errorMessage);
        } else if (Date.now() - startedAt > POLL_TIMEOUT_MS) {
          setBusy(false);
          setError("Arviointi kestää tavallista kauemmin. Päivitä sivu hetken päästä.");
        } else {
          poll(id, startedAt);
        }
      } catch (err) {
        setBusy(false);
        setError((err as Error).message);
      }
    }, POLL_MS);
  }, []);

  const submit = useCallback(async () => {
    if (busy) return;
    setBusy(true);
    setError(null);
    setSubmission(null);
    try {
      const res = await fetch("/api/submissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ exerciseId, sourceCode: code }),
      });
      const data = (await res.json()) as { id?: string; error?: string };
      if (res.status === 409 && data.id) return poll(data.id, Date.now());
      if (!res.ok || !data.id) throw new Error(data.error ?? "Palautus epäonnistui.");
      poll(data.id, Date.now());
    } catch (err) {
      setBusy(false);
      setError((err as Error).message);
    }
  }, [busy, code, exerciseId, poll]);

  const run = useCallback(async () => {
    if (running) return;
    setRunning(true);
    setRunError(null);
    try {
      const res = await fetch("/api/runs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ exerciseId, sourceCode: code, stdin }),
      });
      const data = (await res.json()) as RunOutput & { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Ajo epäonnistui.");
      setRunOutput(data);
    } catch (err) {
      setRunOutput(null);
      setRunError((err as Error).message);
    } finally {
      setRunning(false);
    }
  }, [running, exerciseId, code, stdin]);

  const reset = () => {
    if (code === starterCode || window.confirm("Palautetaanko pohjakoodi? Nykyinen koodi häviää editorista.")) {
      setCode(starterCode);
    }
  };

  const allPassed = submission?.status === "done" && submission.passedCount === submission.totalCount;
  const formattingCount =
    submission?.status === "done" ? submission.cases.filter((c) => c.judgeStatus === FORMATTING_DIFFERENCE).length : 0;
  // Open only the first failing visible case so the list stays scannable.
  const firstFailing = submission?.cases.find((c) => c.passed === false && !c.hidden)?.position;

  return (
    <div className="grid gap-4">
      <div
        className="overflow-hidden rounded-xl border border-border bg-surface"
        onKeyDown={(e) => {
          if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
            e.preventDefault();
            void (e.shiftKey ? run() : submit());
          }
        }}
      >
        <label htmlFor="code-editor" className="sr-only">
          Ratkaisun koodi
        </label>
        <CodeMirror
          id="code-editor"
          value={code}
          onChange={setCode}
          extensions={extensions}
          minHeight="18rem"
          basicSetup={{ autocompletion: false }}
          aria-label="Ratkaisun koodi"
        />
      </div>

      <div className="grid gap-3 rounded-xl border border-border bg-surface p-3 sm:grid-cols-2">
        <div className="grid content-start gap-1">
          <label htmlFor="run-stdin" className="text-sm font-medium">
            Syöte <span className="font-normal text-muted">(mitä käyttäjä kirjoittaa, rivi kerrallaan)</span>
          </label>
          <textarea
            id="run-stdin"
            value={stdin}
            onChange={(e) => setStdin(e.target.value)}
            rows={4}
            spellCheck={false}
            className="rounded-md border border-border bg-bg p-2 font-mono text-sm"
          />
        </div>
        <div className="grid content-start gap-1" aria-live="polite">
          <div className="text-sm font-medium">Tuloste</div>
          {runError ? (
            <p className="rounded-md border border-border bg-bg p-2 text-sm">{runError}</p>
          ) : runOutput ? (
            <>
              <pre className="min-h-[5.5rem] overflow-x-auto whitespace-pre-wrap rounded-md border border-border bg-bg p-2 font-mono text-sm">
                {runOutput.stdout === "" ? <span className="text-muted">(ei tulostetta)</span> : runOutput.stdout}
              </pre>
              {runOutput.stderr && <Output label="Virheilmoitus" text={runOutput.stderr} />}
              <p className="text-xs text-muted">{runStatusLabel(runOutput)}</p>
            </>
          ) : (
            <p className="min-h-[5.5rem] rounded-md border border-dashed border-border p-2 text-sm text-muted">
              Kokeile koodiasi painamalla Aja. Ajoja ei arvioida eikä tallenneta.
            </p>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => void run()}
          disabled={running}
          aria-keyshortcuts="Control+Shift+Enter"
          className="rounded-lg border border-accent px-5 py-2 font-medium text-accent disabled:opacity-60"
        >
          {running ? "Ajetaan…" : "Aja"}
        </button>
        <button
          type="button"
          onClick={() => void submit()}
          disabled={busy}
          aria-keyshortcuts="Control+Enter"
          className="rounded-lg bg-accent px-5 py-2 font-medium text-accent-text disabled:opacity-60"
        >
          {busy ? "Arvioidaan…" : "Palauta"}
        </button>
        <button type="button" onClick={reset} disabled={busy} className="rounded-lg border border-border px-4 py-2">
          Pohjakoodi
        </button>
        <span className="text-sm text-muted">Ctrl + Shift + Enter ajaa, Ctrl + Enter palauttaa</span>
      </div>

      <div aria-live="polite" className="grid gap-3">
        {error && <p className="rounded-lg border border-fail bg-fail-bg p-3 text-fail">{error}</p>}

        {submission?.status === "done" && (
          <p
            className={`rounded-lg border p-3 font-medium ${
              allPassed ? "border-ok bg-ok-bg text-ok" : "border-fail bg-fail-bg text-fail"
            }`}
          >
            {allPassed
              ? `Kaikki ${submission.totalCount} testiä meni läpi!`
              : `${submission.passedCount} / ${submission.totalCount} testiä meni läpi.`}
          </p>
        )}

        {formattingCount > 0 && (
          <p className="rounded-lg border border-border bg-surface p-3 text-sm">
            {formattingCount === 1 ? "Yhdessä testissä" : `${formattingCount} testissä`} tulosteesi erosi odotetusta
            vain välimerkeissä, kirjainkoossa tai rivityksessä. Se ei vaikuta tulokseen, eikä sinun tarvitse korjata sitä.
          </p>
        )}

        {submission && submission.cases.length > 0 && (
          <ol className="grid gap-2">
            {submission.cases.map((c) => (
              <li key={c.position} className="rounded-lg border border-border bg-surface">
                <details open={c.position === firstFailing}>
                  <summary className="flex cursor-pointer items-center justify-between gap-3 px-3 py-2">
                    <span>
                      {c.name}
                      {c.hidden && <span className="ml-2 text-xs text-muted">(piilotettu)</span>}
                    </span>
                    <span
                      className={`text-sm font-medium ${
                        c.passed === null ? "text-muted" : c.passed ? "text-ok" : "text-fail"
                      }`}
                    >
                      {c.passed === null ? "…" : c.passed ? "✓ " : "✗ "}
                      {statusLabel(c)}
                    </span>
                  </summary>
                  {!c.hidden ? (
                    <div className="grid gap-2 border-t border-border p-3">
                      <Output label="Syöte" text={c.stdin} />
                      <Output label="Odotettu tuloste" text={c.expectedStdout} />
                      <Output label="Ohjelmasi tuloste" text={c.stdout} />
                      {c.stderr ? <Output label="Virheilmoitus" text={c.stderr} /> : null}
                    </div>
                  ) : (
                    <p className="border-t border-border p-3 text-sm text-muted">
                      Piilotetun testin syötettä ja odotettua tulostetta ei näytetä.
                    </p>
                  )}
                </details>
              </li>
            ))}
          </ol>
        )}
      </div>
    </div>
  );
}
