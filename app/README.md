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
npm run dev                        # http://localhost:3000
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

## Layout

```
src/app/                 Routes (App Router)
src/lib/db/              Drizzle schema and connection
src/lib/exercises/       Loading and validating exercise folders
src/lib/grading/         Output normalisation (must match scripts/validate.py)
scripts/                 CLI scripts
drizzle/                 Generated SQL migrations (committed, never edited after applying)
```
