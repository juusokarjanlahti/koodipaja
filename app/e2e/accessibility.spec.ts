import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

// Automatic WCAG 2.1 A/AA checks (#30). They catch roughly a third of the problems; manual
// screen reader testing is still needed for the audit.
const WCAG = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"];

async function violations(page: import("@playwright/test").Page) {
  const result = await new AxeBuilder({ page }).withTags(WCAG).analyze();
  return result.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`);
}

test.beforeEach(async ({ page }) => {
  const res = await page.request.post("/api/dev-login", { data: { email: `a11y-${Date.now()}@example.test` } });
  expect(res.ok()).toBe(true);
});

for (const [name, path] of [
  ["front page", "/"],
  ["exercise page", "/exercises/01-tervehdys"],
  ["cheat sheet", "/muistilista"],
] as const) {
  test(`${name} has no automatic WCAG A/AA violations`, async ({ page }) => {
    await page.goto(path);
    await page.waitForLoadState("networkidle");
    expect(await violations(page)).toEqual([]);
  });
}
