import { expect, test } from "@playwright/test";

// The editor followed the light theme in dark mode, so code was dark text on a dark
// background. Every highlighted token must stay readable (WCAG 1.4.3: 4.5:1).
for (const colorScheme of ["dark", "light"] as const) {
  test(`editor code is readable in ${colorScheme} mode`, async ({ page }) => {
    await page.emulateMedia({ colorScheme });
    const res = await page.request.post("/api/dev-login", { data: { email: `e2e-${colorScheme}-${Date.now()}@example.test` } });
    expect(res.ok()).toBe(true);
    await page.goto("/exercises/01-tervehdys");
    await page.locator(".cm-content").click();
    await page.keyboard.press("ControlOrMeta+a");
    await page.keyboard.press("Delete");
    await page.keyboard.insertText('# kommentti\nname = input("Nimi? ")\nif len(name) > 3:\n    print(f"Hei, {name}!", 42)\n');

    const ratios = await page.evaluate(() => {
      const parse = (c: string) => (c.match(/[\d.]+/g) ?? []).slice(0, 3).map(Number);
      const lum = (c: string) => {
        const [r, g, b] = parse(c).map((v) => v / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
        return 0.2126 * r + 0.7152 * g + 0.0722 * b;
      };
      const contrast = (a: string, b: string) => {
        const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
        return (x + 0.05) / (y + 0.05);
      };
      const background = getComputedStyle(document.querySelector(".cm-editor")!).backgroundColor;
      const nodes = [...document.querySelectorAll(".cm-line, .cm-line span")] as HTMLElement[];
      return nodes
        .filter((n) => n.textContent?.trim())
        .map((n) => ({ text: n.textContent!.trim().slice(0, 20), ratio: contrast(getComputedStyle(n).color, background) }));
    });
    expect(ratios.length).toBeGreaterThan(5);
    for (const r of ratios) expect(r.ratio, `"${r.text}"`).toBeGreaterThanOrEqual(4.5);
  });
}
