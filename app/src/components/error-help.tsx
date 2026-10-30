import { explainError } from "@/lib/grading/explain";

/**
 * A short Finnish explanation of a Python error, shown above the original error message
 * (which is always shown too, so students learn to read it). Renders nothing when no
 * predefined explanation matches.
 */
export function ErrorHelp({ stderr, language }: { stderr: string | null | undefined; language: string }) {
  const help = explainError(stderr, language);
  if (!help) return null;
  return (
    <div className="rounded-md border border-border bg-bg p-3 text-sm" data-error-help={help.id}>
      <div className="font-medium">
        {help.title}
        {help.line !== null && <span className="font-normal text-muted"> · rivi {help.line}</span>}
      </div>
      <p className="mt-1 leading-relaxed">{help.text}</p>
    </div>
  );
}
