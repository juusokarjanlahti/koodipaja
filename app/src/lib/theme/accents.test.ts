import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { ACCENTS, ACCENT_IDS, DEFAULT_ACCENT, isAccentId } from "./accents";

const css = readFileSync(
  new URL("../../app/globals.css", import.meta.url),
  "utf8",
);

function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}
/**
 * The value of `--name` for an accent (or the :root default). Each rule is written first for
 * light mode and later again inside the dark-mode media query, so first = light, last = dark.
 */
function token(
  mode: "light" | "dark",
  name: string,
  accent?: string,
): string | undefined {
  const selector = accent ? `:root[data-accent="${accent}"] {` : ":root {";
  const start =
    mode === "light" ? css.indexOf(selector) : css.lastIndexOf(selector);
  if (start < 0) return undefined;
  const body = css.slice(start, css.indexOf("}", start));
  return body.match(new RegExp(`--${name}:\\s*(#[0-9a-f]{6})`))?.[1];
}

const SURFACE = { light: "#ffffff", dark: "#24332e" };
const BG = { light: "#fdfdfb", dark: "#1e2b27" };

describe("accents", () => {
  it("recognises only the curated ids", () => {
    expect(isAccentId("violetti")).toBe(true);
    expect(isAccentId("toString")).toBe(false);
    expect(isAccentId("#ff0000")).toBe(false);
    expect(ACCENT_IDS).toContain(DEFAULT_ACCENT);
  });

  for (const id of ACCENT_IDS) {
    const accent = ACCENTS[id];
    for (const mode of ["light", "dark"] as const) {
      const swatch = accent[mode];
      it(`${id} (${mode}) is readable and distinct from the page`, () => {
        expect(contrast(swatch.fill, swatch.fillText)).toBeGreaterThanOrEqual(
          4.5,
        );
        // Filled squares and the swatch itself must stand out from the paper (WCAG 1.4.11).
        expect(contrast(swatch.fill, SURFACE[mode])).toBeGreaterThanOrEqual(3);
        expect(contrast(swatch.fill, BG[mode])).toBeGreaterThanOrEqual(3);
        if ("action" in swatch)
          expect(
            contrast(swatch.action, swatch.actionText),
          ).toBeGreaterThanOrEqual(4.5);
      });

      it(`${id} (${mode}) matches globals.css`, () => {
        const accentId = id === DEFAULT_ACCENT ? undefined : id;
        expect(token(mode, "fill", accentId)).toBe(swatch.fill);
        expect(token(mode, "fill-text", accentId)).toBe(swatch.fillText);
        if ("action" in swatch) {
          expect(token(mode, "action", accentId)).toBe(swatch.action);
          expect(token(mode, "action-text", accentId)).toBe(swatch.actionText);
        }
      });
    }
  }
});
