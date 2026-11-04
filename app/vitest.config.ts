import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  // Pages are .tsx; tsconfig keeps jsx: "preserve" for Next, so compile JSX here.
  oxc: { jsx: { runtime: "automatic" } },
  resolve: { alias: { "@": path.resolve(__dirname, "src") } },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts", "scripts/**/*.test.ts"],
  },
});
