# CLAUDE.md

Guidance for AI coding agents (Claude Code and others) working in this repository.
Read this file fully before making changes.

## What this project is

Koodipaja is an open, free programming-exercise platform for Finnish universities of
applied sciences (AMK). Students write code in the browser, submit it, and get
automatic feedback from test cases. Teachers assemble courses from an open,
CC BY 4.0-licensed exercise library.

The product itself does **not** call LLMs at runtime. AI agents are used at
development time: to build the software and to draft exercises, which are then
validated automatically and reviewed by a human.

## Repository layout

```
exercises/<language>/<NN-slug>/   One exercise per folder (content-as-code)
  exercise.yaml                   Metadata + test cases (stdin -> expected stdout)
  README.md                       Assignment text shown to students (Finnish)
  starter.<ext>                   Code the student starts from
  solution.<ext>                  Reference solution; MUST pass every case
  wrong/*.<ext>                   Deliberately wrong solutions; each MUST fail >= 1 case
scripts/validate.py               Validates every exercise locally (no Judge0 needed)
docs/                             Architecture and decisions (ADRs)
app/                              (planned) Next.js application
```

## Planned architecture (do not deviate without an ADR in docs/)

- **App:** Next.js (App Router) + TypeScript (strict). One language across the stack.
- **DB:** PostgreSQL with Drizzle ORM. Migrations are committed; never edit an applied migration.
- **Code execution:** self-hosted Judge0 behind a Redis-backed queue (BullMQ).
  The app never executes student code itself. Never.
- **Auth:** LTI 1.3 launch from Moodle first; a development-only email login (DEV_LOGIN, never in production).
  SAML/HAKA later.
- **Editor:** CodeMirror 6 (see docs/adr/0001-codemirror-instead-of-monaco.md).
- **Hosting:** EU only (UpCloud or Hetzner), Docker Compose. GDPR: student data never
  leaves the EU, and no third-party analytics.

## Exercise format rules

- Test cases are stdin/stdout pairs so they map 1:1 to Judge0 submissions
  (`stdin`, `expected_output`).
- Output comparison: trailing whitespace on each line and trailing newlines are ignored.
  Anything else must match exactly.
- Every exercise needs: at least 3 cases, at least 1 edge case, and at least 2 wrong solutions
  that represent *realistic student mistakes* (off-by-one, wrong type, missing edge case),
  not random garbage.
- Assignment text (`README.md`) is in Finnish, plain and concrete, and includes one example
  run. Code identifiers are in English.
- `id` in exercise.yaml must equal the folder name.
- Run `python3 scripts/validate.py` before committing. CI runs the same script.

## Working rules for agents

1. **Spec first.** For any feature, write a short spec (goal, non-goals, acceptance
   criteria) in the PR description or `docs/specs/` before writing code.
2. **Tests are mandatory.** Unit tests for logic, Playwright for user flows. Never mark
   work done with failing or skipped tests. Never weaken a test to make it pass.
3. **Small PRs.** One concern per PR. Use separate git worktrees for parallel work.
4. **Human review required** for anything touching: authentication, LTI, the Judge0
   integration or its sandbox config, personal data, or database migrations.
   Flag these clearly at the top of the PR.
5. **No new dependencies** without stating why in the PR. Prefer the standard library.
6. **Accessibility:** WCAG 2.1 AA. Every interactive element is keyboard-usable and labeled.
7. **Never** commit secrets, real student data, or material copied from commercial
   course platforms. All exercise content must be original.

## Commands

```bash
python3 scripts/validate.py              # validate all exercises
python3 scripts/validate.py exercises/python/01-tervehdys   # validate one
```
