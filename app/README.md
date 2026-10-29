# Koodipaja app

Next.js (App Router) + TypeScript + PostgreSQL (Drizzle).

## Setup

```bash
# 1. Infrastructure (from the repo root): see ../docs/local-dev.md
docker compose up -d

# 2. App
cd app
cp ../.env.example .env.local      # adjust passwords to match ../.env
npm install
npm run db:migrate
npm run import-exercises
npm run worker                     # in a second terminal
npm run dev                        # http://localhost:3000, log in at /login
```

Scripts read `DATABASE_URL` from the environment; `next dev` also reads `.env.local`.
For the CLI scripts, export the variables first (`set -a; source .env.local; set +a`).

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
| `npm run worker` | Grading worker: queue -> Judge0 -> results |
| `npm run fake-judge0` | Fake Judge0 for tests, **no sandbox**, localhost only |
| `npm run smoke` | End-to-end check against a running dev stack |

## Layout

```
src/app/                 Routes (App Router)
src/lib/db/              Drizzle schema and connection
src/lib/exercises/       Loading and validating exercise folders
src/lib/grading/         Normalisation, case evaluation, grading, student-facing results
src/lib/judge0/          Judge0 client
src/lib/auth/            Signed session cookie, development login
src/components/          UI components (editor workspace)
scripts/                 CLI scripts
drizzle/                 Generated SQL migrations (committed, never edited after applying)
```
