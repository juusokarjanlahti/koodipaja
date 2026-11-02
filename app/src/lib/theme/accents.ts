/**
 * Accent colours a user can pick in Asetukset (#92). The accent is the theme's one bold
 * colour: filled squares, solved marks and the wordmark. Each is a curated pair, checked
 * for contrast in both modes (accents.test.ts), so no choice can make the app unreadable.
 * globals.css holds the same values as `[data-accent=…]` rules; a test keeps them in sync.
 */
export type Swatch = {
  fill: string;
  fillText: string;
  action?: string;
  actionText?: string;
};
export type Accent = { label: string; light: Swatch; dark: Swatch };

export const ACCENTS = {
  turkoosi: {
    label: "Turkoosi",
    light: { fill: "#0b7a70", fillText: "#ffffff" },
    dark: { fill: "#5fd3c4", fillText: "#13201c" },
  },
  violetti: {
    label: "Violetti",
    light: { fill: "#5b3fbf", fillText: "#ffffff" },
    dark: { fill: "#b9a7ff", fillText: "#13201c" },
  },
  pullonvihrea: {
    label: "Pullonvihreä",
    light: { fill: "#1d6b47", fillText: "#ffffff" },
    dark: { fill: "#8fd6b0", fillText: "#13201c" },
  },
  viininpunainen: {
    label: "Viininpunainen",
    light: { fill: "#8c2f5a", fillText: "#ffffff" },
    dark: { fill: "#f2a7c8", fillText: "#13201c" },
  },
  // Graphite fill would look like the graphite Palauta button, so the button turns violet.
  grafiitti: {
    label: "Grafiitti",
    light: {
      fill: "#2f343c",
      fillText: "#ffffff",
      action: "#5b3fbf",
      actionText: "#ffffff",
    },
    dark: {
      fill: "#e6ebe4",
      fillText: "#13201c",
      action: "#b9a7ff",
      actionText: "#13201c",
    },
  },
} as const satisfies Record<string, Accent>;

export type AccentId = keyof typeof ACCENTS;
export const DEFAULT_ACCENT: AccentId = "turkoosi";
export const ACCENT_IDS = Object.keys(ACCENTS) as AccentId[];

export function isAccentId(value: unknown): value is AccentId {
  return typeof value === "string" && Object.hasOwn(ACCENTS, value);
}
