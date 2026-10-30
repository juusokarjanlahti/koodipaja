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
validated automatically. The owner reviews merged work when they choose to.

## Repository layout

```
exercises/<language>/<NN-slug>/   One exercise per folder (content-as-code)
  exercise.yaml                   Metadata + test cases (stdin -> expected stdout)
  README.md                       Assignment text shown to students (Finnish)
  starter.<ext>                   Code the student starts from
  solution.<ext>                  Reference solution; MUST match every case exactly
  wrong/*.<ext>                   Conceptually wrong solutions; each MUST fail >= 1 case
  accepted/*.<ext>                (optional) Formatting-only differences; each MUST pass
scripts/validate.py               Validates every exercise locally (no Judge0 needed)
scripts/output-match-cases.json   Shared comparison vectors (Python and TypeScript)
docs/                             Architecture and decisions (ADRs)
app/                              Next.js application
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
- Output comparison follows `docs/adr/0003-joustava-tulosteen-vertailu.md`:
  - `output_match: lenient` (default): only words (case-insensitive) and numbers are compared,
    in order. Punctuation, spacing and line breaks are ignored. Students must never have to
    polish punctuation that has no teaching value.
  - `output_match: exact`: use ONLY when formatting is the learning goal (f-strings,
    alignment, a fixed number of decimals). Say so in the assignment text.
  - The Python (`scripts/validate.py`) and TypeScript (`app/src/lib/grading/normalise.ts`)
    implementations MUST stay identical; add a vector to `scripts/output-match-cases.json`
    whenever you change either.
- Every exercise needs: at least 3 cases, at least 1 edge case, and at least 2 wrong solutions
  that represent *conceptual* student mistakes (off-by-one, wrong type, missing edge case,
  hardcoded answer), not formatting slips and not random garbage. Put realistic formatting
  slips that should be accepted in `accepted/`.
- Keep required output minimal: do not demand exact prompt texts unless they matter.
- Follow the pedagogical principles in `docs/product/visio.md`: exercises target algorithms
  and telling data types apart, not syntax trivia. Student-facing text never shames:
  say what does not work *yet* ("Ei vielä läpi"), not that the student failed.
- Assignment text (`README.md`) is in Finnish, plain and concrete, and includes one example
  run. Code identifiers are in English.
- Set `level: perus | soveltava | haaste` in exercise.yaml (default `perus`). `perus`
  exercises must test core skills (variables, conditions, loops, data types); `haaste`
  exercises are graded on algorithmic correctness, not output formatting.
  See `docs/product/oppimispolku.md`.
- Set `scaffold: full | outline | none` (default `none`, see
  `docs/adr/0004-suunnitelma-kommentteina.md`). Early exercises get `full`: the starter
  code begins with `# Suunnitelma:` and numbered plan comments (`# 1. ...`) in Finnish.
  Fade to `outline` and then `none` as the course progresses. The plan describes steps,
  not code, and must not give away the key insight the exercise is meant to teach.
  Never use AI at runtime to check plans or break tasks down.
- `id` in exercise.yaml must equal the folder name.
- Run `python3 scripts/validate.py` before committing. CI runs the same script.

## Working rules for agents

1. **Spec first.** For any feature, write a short spec (goal, non-goals, acceptance
   criteria) in the PR description or `docs/specs/` before writing code.
2. **Tests are mandatory.** Unit tests for logic, Playwright for user flows. Never mark
   work done with failing or skipped tests. Never weaken a test to make it pass.
3. **Small PRs.** One concern per PR. Use separate git worktrees for parallel work.
4. **Merge when CI is green.** Agents may merge their own PRs, including exercise
   content, without waiting for a human review; the owner reviews afterwards when they
   choose to. PRs touching authentication, LTI, the Judge0 integration or its sandbox
   config, personal data, or database migrations must still be flagged clearly at the top
   of the PR so the owner can find them later. Never merge with failing or skipped checks,
   and never weaken a validation rule to get content through.
5. **No new dependencies** without stating why in the PR. Prefer the standard library.
6. **Accessibility:** WCAG 2.1 AA. Every interactive element is keyboard-usable and labeled.
7. **Never** commit secrets, real student data, or material copied from commercial
   course platforms. All exercise content must be original.

## Commands

```bash
python3 scripts/validate.py              # validate all exercises
python3 scripts/validate.py exercises/python/01-tervehdys   # validate one
```
