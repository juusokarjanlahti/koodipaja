import { demoModeEnabled } from "@/lib/demo/mode";

/** Shown on every page of the public demo (docs/specs/demo-mode.md). Text, not colour alone. */
export function DemoBanner() {
  if (!demoModeEnabled()) return null;
  return (
    <div role="note" className="border-b-2 border-accent bg-surface print:hidden">
      <p className="mx-auto max-w-6xl px-4 py-2 text-sm">
        <strong>Demo:</strong> kaikki tiedot ovat keksittyjä ja nollautuvat yöllä. Älä kirjoita omia tietojasi.
      </p>
    </div>
  );
}
