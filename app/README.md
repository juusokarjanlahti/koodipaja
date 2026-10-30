# Koodipaja app

Next.js (App Router) + TypeScript + PostgreSQL (Drizzle).

## Setup

From the repo root: `./scripts/dev-setup.sh`, then `npm run dev:all` here. See
[../docs/local-dev.md](../docs/local-dev.md).

Every npm script reads `.env.local` (created by the setup script); variables already set
in the environment win.

## Scripts

| Script | What it does |
|---|---|
| `npm run dev` | Development server |
| `npm run build` | Production build |
| `npm test` | Unit tests (Vitest) |
| `npm run typecheck` | TypeScript check |
| `npm run db:generate` | Create a migration from `src/lib/db/schema.ts` |
| `npm run db:migrate` | Apply migrations |
| `npm run import-exercises` | Import `../exercises` into the database (idempotent) |
| `npm run worker` | Grading worker: queue -> code runner (`RUNNER`, default go-judge) -> results |
| `npm run runner-check` | Every exercise and sandbox security probes through the configured runner |
| `npm run fake-judge0` | Fake Judge0 for tests, **no sandbox**, localhost only |
| `npm run smoke` | End-to-end check against a running dev stack |
| `npm run e2e` | Playwright user-flow tests against a running dev stack (`APP_URL`) |

## Layout

```
src/app/                 Routes (App Router)
src/lib/db/              Drizzle schema and connection
src/lib/exercises/       Loading and validating exercise folders
src/lib/grading/         Normalisation, case evaluation, grading, student-facing results
src/lib/runner/          Code runner interface and go-judge client (ADR 0006)
src/lib/judge0/          Legacy Judge0 client (RUNNER=judge0)
src/lib/auth/            Signed session cookie, development login
src/components/          UI components (editor workspace)
scripts/                 CLI scripts
drizzle/                 Generated SQL migrations (committed, never edited after applying)
```
