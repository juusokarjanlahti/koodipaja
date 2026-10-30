# Architecture

```
Browser (CodeMirror) ──────┐
                           ├──> Next.js app ──> PostgreSQL (users, courses, results)
Moodle (LTI 1.3 launch) ───┘         │
                                     └──> Redis queue ──> go-judge (isolated execution)

exercises/ (Git) ──> CI validation (scripts/validate.py) ──> imported into the app
```

## Key decisions

| Decision | Choice | Why |
|---|---|---|
| App framework | Next.js + TypeScript | One language end to end; agents are most reliable on this stack |
| Database | PostgreSQL + Drizzle | Boring, well-known, typed schema in code |
| Code execution | Self-hosted go-judge | Actively maintained sandbox, cgroup v1 and v2, REST API; building our own is the riskiest possible choice; see ADR 0006 (Judge0 still selectable) |
| Queue | Redis + BullMQ | Absorbs exam-time submission spikes |
| Editor | CodeMirror 6 | Mobile support, no CDN; see ADR 0001 |
| Languages | Python, JS, TS, C, C++, Java, Rust | Build and run steps in `infra/languages.json`, current versions in the go-judge image; see ADR 0005 and 0006 |
| Auth | LTI 1.3 first | Moodle handles identity; HAKA/SAML can wait |
| Content | Git folders, CC BY 4.0 | Reviewable, versioned, forkable by any teacher |
| Hosting | EU VPS, Docker Compose | GDPR, low cost, simple operations |

## Moodle launch (LTI 1.3)

1. Moodle sends the browser to `/api/lti/login`; the app stores a single-use state and
   nonce and redirects to Moodle's OIDC endpoint.
2. Moodle posts a signed `id_token` to `/api/lti/launch`. The app verifies it against
   Moodle's key set (RS256, `node:crypto`), checks every claim, stores only the platform
   user id, name, course and course role, and sets the normal session cookie.
3. Platforms are rows in `lti_platforms` (`npm run lti:register`). See
   `docs/specs/lti-launch.md` and `docs/product/moodle-lti.md`.

## Submission flow

1. Student submits code from the editor.
2. App stores the submission and enqueues one grading job per submission.
3. Worker compiles the code once in the sandbox (compiled languages), then runs each case
   with its stdin under CPU, memory and process limits, with no network (`app/src/lib/runner`).
4. Worker normalises output with the same rules as `scripts/validate.py` and stores results.
5. Student sees per-case pass/fail; hidden cases show only pass/fail, not the expected output.
