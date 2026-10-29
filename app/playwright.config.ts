import { defineConfig, devices } from "@playwright/test";

// Runs against an already running dev stack (see README: dev server, worker, Judge0 or fake).
export default defineConfig({
  testDir: "./e2e",
  timeout: 60_000,
  use: {
    baseURL: process.env.APP_URL ?? "http://localhost:3000",
    trace: "retain-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
