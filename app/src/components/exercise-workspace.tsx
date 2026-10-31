"use client";

import { cpp } from "@codemirror/lang-cpp";
import { java } from "@codemirror/lang-java";
import { javascript } from "@codemirror/lang-javascript";
import { python } from "@codemirror/lang-python";
import { rust } from "@codemirror/lang-rust";
import CodeMirror, { EditorView } from "@uiw/react-codemirror";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { PresentedCase, PresentedSubmission } from "@/lib/grading/present";
import { FORMATTING_DIFFERENCE } from "@/lib/grading/status";
import type { SubmissionSummary } from "@/lib/progress";
import type { OutputMatchMode } from "@/lib/grading/normalise";
import type { RunOutput } from "@/lib/runs/output";
import { runVerdict, type RunVerdict } from "@/lib/runs/verdict";
import { editorTheme } from "./editor-theme";
import { NextStepsBox } from "./next-steps";
import { nextSteps, type ExerciseState, type PathExercise } from "@/lib/exercises/next-steps";
import { improvementNote, isSolved } from "@/lib/submission-state";
import { ErrorHelp } from "./error-help";

const POLL_MS = 800;
// Line comment per language for the plan template (ADR 0004).
const COMMENT: Record<string, string> = { python: "#" };
const planTemplate = (language: string) => {
  const c = COMMENT[language] ?? "//";
  return `${c} Suunnitelma:\n${c} 1. \n${c} 2. \n${c} 3. \n\n`;
};
const POLL_TIMEOUT_MS = 90_000;

const LANGUAGE_EXTENSIONS = {
  python: () => python(),
  javascript: () => javascript(),
  typescript: () => javascript({ typescript: true }),
  c: () => cpp(),
  cpp: () => cpp(),
  java: () => java(),
  rust: () => rust(),
} as const;

function statusLabel(c: PresentedCase): string {
  if (c.passed === null) return "Odottaa";
  if (c.passed) return c.judgeStatus === FORMATTING_DIFFERENCE ? "Läpi (pieni muotoiluero)" : "Läpi";
  // Principle 1: say what does not work *yet*, never that the student failed.
  switch (c.judgeStatus) {
    case "Wrong Answer":
      return "Ei vielä läpi: tuloste eroaa";
    case "Time Limit Exceeded":
      return "Ei vielä läpi: aikaraja ylittyi";
    case "Compilation Error":
      return "Ei vielä läpi: koodissa on kirjoitusvirhe";
    default:
      return c.judgeStatus?.startsWith("Runtime Error")
        ? "Ei vielä läpi: virhe ajon aikana"
        : `Ei vielä läpi${c.judgeStatus ? ` (${c.judgeStatus})` : ""}`;
  }
}

// A system failure is never the student's fault: say so, and never show technical details.
const SYSTEM_ERROR_MESSAGE =
  "Arviointi ei onnistunut juuri nyt. Vika on palvelussa, ei koodissasi, eikä tätä lasketa yritykseksi. Yritä hetken päästä uudelleen.";

function formatTime(iso: string): string {
  return new Date(iso).toLocaleString("fi-FI", { dateStyle: "short", timeStyle: "short" });
}

function summaryLabel(s: SubmissionSummary): string {
  if (s.status === "queued" || s.status === "running") return "Arvioidaan…";
  if (s.status === "error") return "Järjestelmävirhe (ei johdu koodistasi)";
  if (s.totalCount > 0 && s.passedCount === s.totalCount) return `✓ Kaikki ${s.totalCount} testiä läpi`;
  return `${s.passedCount} / ${s.totalCount} testiä läpi`;
}

function runStatusLabel(r: RunOutput): string {
  const time = r.timeMs !== null ? ` (${r.timeMs} ms)` : "";
  if (r.ok) return `Ajo valmis${time}`;
  if (r.statusDescription === "Time Limit Exceeded")
    return "Aikaraja ylittyi: ohjelma ei päättynyt ajoissa. Onko silmukassa lopetusehto?";
  if (r.statusDescription.startsWith("Runtime Error")) return `Ohjelma pysähtyi virheeseen${time}`;
  return r.statusDescription;
}

function RunResultBox({ verdict, output }: { verdict: RunVerdict; output: RunOutput }) {
  if (verdict.kind === "matches-example") {
    return (
      <div className="kp-flash rounded-lg border border-ok bg-ok-bg p-3 text-ok">
        <p className="font-medium">
          ✓ Tuloste vastaa tehtävänannon esimerkkiä{verdict.formattingDifference ? " (pieniä muotoilueroja, ne eivät haittaa)" : ""}.
        </p>
        <p className="mt-1 text-sm">Palauta, niin ohjelmasi tarkistetaan myös muilla syötteillä.</p>
      </div>
    );
  }
  if (verdict.kind === "differs-from-example") {
    return (
      <div className="kp-flash grid gap-2 rounded-lg border border-border bg-surface p-3">
        <p className="font-medium">○ Tuloste ei vielä vastaa tehtävänannon esimerkkiä.</p>
        <Output label="Esimerkin tuloste samalla syötteellä" text={verdict.expected} />
      </div>
    );
  }
  return (
    <div className="kp-flash rounded-lg border border-border bg-surface p-3">
      <p className="font-medium">{runStatusLabel(output)}</p>
      {verdict.kind === "finished" && (
        <p className="mt-1 text-sm text-muted">
          Tällä syötteellä ei ole esimerkkiä, joten tulostetta ei verrata. Palauta tarkistaa ohjelman.
        </p>
      )}
    </div>
  );
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
  exampleStdout,
  outputMatch,
  initialHistory,
  path,
  initialStates,
  conceptTitles,
}: {
  exerciseId: string;
  language: string;
  starterCode: string;
  initialCode: string;
  exampleStdin: string;
  /** Expected output of the first visible case, or null when there is none. */
  exampleStdout: string | null;
  outputMatch: OutputMatchMode;
  initialHistory: SubmissionSummary[];
  /** The exercises of this language in course order, for "next exercise" suggestions. */
  path: PathExercise[];
  initialStates: Record<string, ExerciseState>;
  conceptTitles: Record<string, string>;
}) {
  const [code, setCode] = useState(initialCode);
  const [history, setHistory] = useState<SubmissionSummary[]>(initialHistory);
  const [historyOpen, setHistoryOpen] = useState(false);
  // When the student reopens an earlier submission: its id, time and code.
  const [viewing, setViewing] = useState<{ id: string; createdAt: string; sourceCode: string } | null>(null);
  const [stdin, setStdin] = useState(exampleStdin);
  const [runOutput, setRunOutput] = useState<RunOutput | null>(null);
  // The input the last run used (the field may change afterwards) and a counter that
  // re-mounts the result box, so every run visibly produces a fresh result.
  const [ranWithStdin, setRanWithStdin] = useState("");
  const [runCount, setRunCount] = useState(0);
  const [runError, setRunError] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const [submission, setSubmission] = useState<PresentedSubmission | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const pollTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const extensions = useMemo(() => {
    const make = LANGUAGE_EXTENSIONS[language as keyof typeof LANGUAGE_EXTENSIONS];
    // The editable element itself needs the name and the keyboard help (WCAG 4.1.2, 2.1.2).
    const a11y = EditorView.contentAttributes.of({ "aria-label": "Ratkaisun koodi", "aria-describedby": "editor-help" });
    return make ? [make(), a11y] : [a11y];
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
        setHistory((h) =>
          h.map((item) =>
            item.id === data.id
              ? { ...item, status: data.status, passedCount: data.passedCount, totalCount: data.totalCount }
              : item,
          ),
        );
        if (data.status === "done" || data.status === "error") {
          setBusy(false);
          if (data.status === "error") setError(SYSTEM_ERROR_MESSAGE);
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
      const newId = data.id;
      setViewing(null);
      setHistory((h) => [
        { id: newId, createdAt: new Date().toISOString(), status: "queued", passedCount: 0, totalCount: 0 },
        ...h,
      ]);
      poll(newId, Date.now());
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
      if (res.status >= 500) throw new Error("Ajo ei onnistunut juuri nyt. Vika on palvelussa, ei koodissasi. Yritä hetken päästä uudelleen.");
      if (!res.ok) throw new Error(data.error ?? "Ajo epäonnistui.");
      setRunOutput(data);
      setRanWithStdin(stdin);
    } catch (err) {
      setRunOutput(null);
      setRunError((err as Error).message);
    } finally {
      setRunning(false);
      setRunCount((n) => n + 1);
    }
  }, [running, exerciseId, code, stdin]);

  const verdict: RunVerdict | null = runOutput
    ? runVerdict(runOutput, ranWithStdin, exampleStdout === null ? null : { stdin: exampleStdin, stdout: exampleStdout }, outputMatch)
    : null;

  const openSubmission = async (item: SubmissionSummary) => {
    setError(null);
    try {
      const res = await fetch(`/api/submissions/${item.id}?includeSource=1`, { cache: "no-store" });
      if (!res.ok) throw new Error("Palautuksen haku epäonnistui.");
      const data = (await res.json()) as PresentedSubmission & { sourceCode: string };
      setSubmission(data);
      setViewing({ id: item.id, createdAt: item.createdAt, sourceCode: data.sourceCode });
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const restoreViewedCode = () => {
    if (!viewing) return;
    if (code === viewing.sourceCode || window.confirm("Korvataanko editorin koodi tämän palautuksen koodilla?")) {
      setCode(viewing.sourceCode);
    }
  };

  // ADR 0004: the student may break the task down themselves with numbered plan comments.
  const hasPlan = /^\s*(?:#|\/\/)\s*Suunnitelma/m.test(code);
  const addPlan = () => {
    if (!hasPlan) setCode(`${planTemplate(language)}${code}`);
  };

  const reset = () => {
    if (code === starterCode || window.confirm("Palautetaanko pohjakoodi? Nykyinen koodi häviää editorista.")) {
      setCode(starterCode);
    }
  };

  const allPassed = submission?.status === "done" && submission.passedCount === submission.totalCount;

  // This exercise's state follows the submissions made on this page; the others come from the server.
  const solvedHere = history.some(isSolved);
  const failedHere = history.filter((h) => h.status === "done" && !isSolved(h)).length;
  const states = new Map(Object.entries(initialStates));
  if (solvedHere) states.set(exerciseId, "ratkaistu");
  else if (history.length > 0) states.set(exerciseId, "yritetty");
  const steps = nextSteps(path, states, exerciseId, failedHere);
  const latestDone = history.find((h) => h.status === "done");
  const submissionIndex = submission ? history.findIndex((h) => h.id === submission.id) : -1;
  const improvement =
    submission?.status === "done" && submissionIndex >= 0
      ? improvementNote(submission, history.slice(submissionIndex + 1).find((h) => h.status === "done"))
      : null;
  // Stuck: the latest result still does not pass after several tries.
  const stuck = !solvedHere && !!latestDone && !isSolved(latestDone) && failedHere >= 3;
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
        <CodeMirror
          id="code-editor"
          value={code}
          onChange={setCode}
          extensions={extensions}
          minHeight="18rem"
          basicSetup={{ autocompletion: false }}
          theme={editorTheme}
        />
        <div className="border-t border-border px-3 py-1.5 text-xs text-muted">
          {/* Always visible and the editor's description: how to leave it (WCAG 2.1.2). */}
          <p id="editor-help">
            Pois editorista: <kbd>Esc</kbd> ja sitten <kbd>Tab</kbd>.
          </p>
          <details className="mt-1">
            <summary className="cursor-pointer">Näppäinohjeet</summary>
            <p className="mt-1">
              <kbd>Tab</kbd> sisentää. <kbd>Ctrl</kbd> + <kbd>Shift</kbd> + <kbd>Enter</kbd> ajaa, <kbd>Ctrl</kbd> +{" "}
              <kbd>Enter</kbd> palauttaa.
            </p>
          </details>
        </div>
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
        <div className="grid content-start gap-1">
          <div className="text-sm font-medium">Tuloste</div>
          {runOutput ? (
            <>
              <pre
                key={runCount}
                className="kp-flash min-h-[5.5rem] overflow-x-auto whitespace-pre-wrap rounded-md border border-border bg-bg p-2 font-mono text-sm"
              >
                {runOutput.stdout === "" ? <span className="text-muted">(ei tulostetta)</span> : runOutput.stdout}
              </pre>
              {runOutput.stderr && <ErrorHelp stderr={runOutput.stderr} language={language} />}
              {runOutput.stderr && <Output label="Virheilmoitus" text={runOutput.stderr} />}
            </>
          ) : (
            <p className="min-h-[5.5rem] rounded-md border border-dashed border-border p-2 text-sm text-muted">
              Paina Aja nähdäksesi tulosteen.
            </p>
          )}
        </div>
        {/* Always rendered so screen readers announce each run's result (WCAG 4.1.3). */}
        <div aria-live="polite" className="sm:col-span-2">
          {runError ? (
            <p key={runCount} className="kp-flash rounded-lg border border-fail bg-fail-bg p-3 text-fail">
              {runError}
            </p>
          ) : runOutput && verdict ? (
            <RunResultBox key={runCount} verdict={verdict} output={runOutput} />
          ) : null}
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
        <button
          type="button"
          onClick={addPlan}
          disabled={hasPlan}
          title={hasPlan ? "Koodissa on jo suunnitelma" : "Lisää koodin alkuun numeroitu suunnitelmapohja"}
          className="rounded-lg border border-border px-4 py-2 disabled:opacity-50"
        >
          Suunnittele
        </button>
        <button type="button" onClick={reset} disabled={busy} className="rounded-lg border border-border px-4 py-2">
          Pohjakoodi
        </button>
      </div>

      <div aria-live="polite" className="grid gap-3">
        {error && <p className="rounded-lg border border-fail bg-fail-bg p-3 text-fail">{error}</p>}

        {submission?.status === "done" && (
          <p
            className={`rounded-lg border p-3 font-medium ${
              allPassed ? "border-ok bg-ok-bg text-ok" : "border-border bg-surface"
            }`}
          >
            {allPassed
              ? `Kaikki ${submission.totalCount} testiä meni läpi!`
              : `${submission.passedCount} / ${submission.totalCount} testiä läpi. Avoinna on ensimmäinen testi, joka ei vielä mene läpi.`}
          </p>
        )}

        {improvement && !allPassed && <p className="rounded-lg border border-ok bg-ok-bg p-3 text-ok">{improvement}</p>}

        {!busy && (
          <NextStepsBox steps={steps} solved={solvedHere} stuck={stuck} conceptTitles={conceptTitles} />
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
                        c.passed === null ? "text-muted" : c.passed ? "text-ok" : "text-text"
                      }`}
                    >
                      <span aria-hidden="true">{c.passed === null ? "… " : c.passed ? "✓ " : "○ "}</span>
                      {statusLabel(c)}
                    </span>
                  </summary>
                  {!c.hidden ? (
                    <div className="grid gap-2 border-t border-border p-3">
                      {c.stderr ? <ErrorHelp stderr={c.stderr} language={language} /> : null}
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

      {viewing && (
        <div className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-surface p-3 text-sm" role="status">
          <span>Näytät aiempaa palautusta ({formatTime(viewing.createdAt)}).</span>
          <button type="button" onClick={restoreViewedCode} className="rounded-md border border-border px-3 py-1">
            Palauta tämä koodi editoriin
          </button>
        </div>
      )}

      {history.length > 0 && (
        <section className="rounded-xl border border-border bg-surface">
          <button
            type="button"
            aria-expanded={historyOpen}
            aria-controls="submission-history"
            onClick={() => setHistoryOpen((o) => !o)}
            className="flex w-full items-center justify-between px-4 py-3 text-left font-medium"
          >
            <span>Aiemmat palautukset ({history.length})</span>
            <span aria-hidden="true">{historyOpen ? "−" : "+"}</span>
          </button>
          {historyOpen && (
            <ol id="submission-history" className="grid border-t border-border">
              {history.map((item) => (
                <li key={item.id} className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-2 last:border-b-0">
                  <span className="text-sm">
                    <span className="text-muted">{formatTime(item.createdAt)}</span>
                    <span className="ml-3">{summaryLabel(item)}</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => void openSubmission(item)}
                    disabled={item.status === "queued" || item.status === "running"}
                    className="rounded-md border border-border px-3 py-1 text-sm disabled:opacity-50"
                  >
                    Näytä
                  </button>
                </li>
              ))}
            </ol>
          )}
        </section>
      )}
    </div>
  );
}
