# Architecture

```
Browser (CodeMirror) ──────┐
                           ├──> Next.js app ──> PostgreSQL (users, courses, results)
Moodle (LTI 1.3 launch) ───┘         │
                                     └──> Redis queue ──> Judge0 (isolated execution)

exercises/ (Git) ──> CI validation (scripts/validate.py) ──> imported into the app
```

## Key decisions

| Decision | Choice | Why |
|---|---|---|
| App framework | Next.js + TypeScript | One language end to end; agents are most reliable on this stack |
| Database | PostgreSQL + Drizzle | Boring, well-known, typed schema in code |
| Code execution | Self-hosted Judge0 | Proven sandbox, 60+ languages; building our own is the riskiest possible choice |
| Queue | Redis + BullMQ | Absorbs exam-time submission spikes |
| Editor | CodeMirror 6 | Mobile support, no CDN; see ADR 0001 |
| Auth | LTI 1.3 first | Moodle handles identity; HAKA/SAML can wait |
| Content | Git folders, CC BY 4.0 | Reviewable, versioned, forkable by any teacher |
| Hosting | EU VPS, Docker Compose | GDPR, low cost, simple operations |

## Submission flow

1. Student submits code from the editor.
2. App stores the submission and enqueues one grading job per submission.
3. Worker sends each case to Judge0 (`source_code`, `language_id`, `stdin`,
   `expected_output`, CPU/memory limits, network disabled).
4. Worker normalises output with the same rules as `scripts/validate.py` and stores results.
5. Student sees per-case pass/fail; hidden cases show only pass/fail, not the expected output.
