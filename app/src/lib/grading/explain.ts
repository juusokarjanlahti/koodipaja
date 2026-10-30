/**
 * Finnish explanations for the most common Python errors (#52). Rules are predefined and
 * tested, never generated at runtime. Teachers can improve them by editing
 * explanations.python.json through a pull request. The original error is always shown too.
 */
import rules from "./explanations.python.json";

export interface ErrorExplanation {
  id: string;
  title: string;
  text: string;
  line: number | null;
}

interface Rule {
  id: string;
  match: string;
  title: string;
  text: string;
}

const compiled = (rules as Rule[]).map((r) => ({ ...r, re: new RegExp(r.match) }));

/** The last "File ..., line N" in a traceback is where the error happened. */
function lastLine(stderr: string): number | null {
  const matches = [...stderr.matchAll(/File "[^"]*", line (\d+)/g)];
  const last = matches.at(-1);
  return last ? Number(last[1]) : null;
}

export function explainError(stderr: string | null | undefined, language = "python"): ErrorExplanation | null {
  if (!stderr || language !== "python") return null;
  // Rules are ordered from specific to generic; the first match wins.
  for (const rule of compiled) {
    const m = rule.re.exec(stderr);
    if (!m) continue;
    const groups = m.groups ?? {};
    const text = rule.text.replace(/\{(\w+)\}/g, (_, name: string) => groups[name] ?? "");
    return { id: rule.id, title: rule.title, text, line: lastLine(stderr) };
  }
  return null;
}
