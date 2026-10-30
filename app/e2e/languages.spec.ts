import { expect, test } from "@playwright/test";

async function login(page: import("@playwright/test").Page) {
  const res = await page.request.post("/api/dev-login", { data: { email: `e2e-lang-${Date.now()}@example.test` } });
  expect(res.ok()).toBe(true);
}

async function setCode(page: import("@playwright/test").Page, code: string) {
  const editor = page.locator(".cm-content");
  await editor.click();
  await page.keyboard.press("ControlOrMeta+a");
  await page.keyboard.press("Delete");
  await page.keyboard.insertText(code);
}

test("a Java exercise compiles and runs with Aja", async ({ page }) => {
  await login(page);
  await page.goto("/exercises/java-lukujen-summa");
  await expect(page.locator(".cm-content")).toContainText("public class Main");
  await expect(page.locator(".cm-content")).toContainText("// Suunnitelma:");

  await setCode(
    page,
    [
      "import java.util.Scanner;",
      "public class Main {",
      "public static void main(String[] args) {",
      "Scanner s = new Scanner(System.in);",
      "long t = 0;",
      "while (s.hasNextLong()) { long n = s.nextLong(); if (n == 0) break; t += n; }",
      'System.out.println("Summa: " + t);',
      "}",
      "}",
      "",
    ].join("\n"),
  );
  await page.getByRole("button", { name: "Aja", exact: true }).click();
  await expect(page.locator("pre", { hasText: "Summa: 7" })).toBeVisible({ timeout: 30_000 });
});

test("a TypeScript type error is reported as a compile error, not yet passing", async ({ page }) => {
  await login(page);
  await page.goto("/exercises/typescript-lukujen-summa");
  await setCode(page, 'let total: number = 0;\ntotal = total + "1";\nconsole.log(`Summa: ${total}`);\n');

  await page.getByRole("button", { name: "Palauta" }).click();

  await expect(page.getByText("Ei vielä läpi: koodissa on kirjoitusvirhe").first()).toBeVisible({ timeout: 30_000 });
  await expect(page.getByText(/TS2322|not assignable/).first()).toBeVisible();
});
