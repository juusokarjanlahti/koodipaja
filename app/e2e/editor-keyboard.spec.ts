import { expect, test } from "@playwright/test";

// WCAG 2.1.2 (no keyboard trap) and 4.1.2 (name, role): issue #29.
test("the editor is named, explains its keys, and Esc then Tab leaves it", async ({ page }) => {
  const res = await page.request.post("/api/dev-login", { data: { email: `e2e-kbd-${Date.now()}@example.test` } });
  expect(res.ok()).toBe(true);
  await page.goto("/exercises/01-tervehdys");

  const editor = page.getByRole("textbox", { name: "Ratkaisun koodi" });
  await expect(editor).toHaveAccessibleDescription(/Pois editorista: Esc ja sitten Tab/);

  await editor.click();
  await page.keyboard.press("ControlOrMeta+End");
  // Tab indents inside the editor and keeps the focus there.
  const before = await editor.textContent();
  await page.keyboard.press("Tab");
  await expect(editor).toBeFocused();
  expect((await editor.textContent())!.length).toBeGreaterThan(before!.length);

  // Escape, then Tab, moves on to the next control: the key help right under the editor,
  // then the input field.
  await page.keyboard.press("Escape");
  await page.keyboard.press("Tab");
  await expect(page.getByText("Näppäinohjeet")).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(page.getByLabel(/^Syöte/)).toBeFocused();

  // And Shift+Tab comes back.
  await page.keyboard.press("Shift+Tab");
  await page.keyboard.press("Shift+Tab");
  await expect(editor).toBeFocused();
});
