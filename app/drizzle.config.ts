import { existsSync } from "node:fs";
import { defineConfig } from "drizzle-kit";

// Same as the npm scripts: .env.local fills in what the environment does not set.
if (existsSync(".env.local")) process.loadEnvFile(".env.local");

export default defineConfig({
  schema: "./src/lib/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: { url: process.env.DATABASE_URL ?? "" },
  strict: true,
});
