# Spec: the demo course's three weeks of history (#127)

## Goal

A visitor who tries the teacher role sees the teacher view as it would look in the middle
of a real course: students at different stages, some stuck, some asking for help, several
with the same answer. That is what daily use looks like.

## Non-goals

- The teacher's guided tour (#128), rate limits and the nightly reset (#129).
- Calling Moodle: the grade transfer states are stored, never sent.

## Design

- **`npm run seed-demo`** fills the shared demo course (docs/specs/demo-mode.md).
  `lib/demo/history.ts` makes a deterministic plan, and `scripts/seed-demo.ts` carries it out.
- **Everything is invented.** 25 students named from programming words (*Aino Silmukka*,
  *Eero Muuttuja*) and a teacher, *Kaisa Koodari*. The code is the exercises' own model,
  `wrong/` and `accepted/` answers, plus two hand-written answers in `history.ts`.
- **Nothing is made up by hand.** Every distinct code variant runs once through the real
  runner and grading (`RUNNER`, as the worker uses), and those results are stored for each
  submission. The seed fails if a variant grades differently from what the plan assumes.
- **The story** (students by index):
  - 0-4 ahead, all 15 exercises done. Student 1 wrote the unit out in *Lämpötilamuunnos*
    and the teacher approved it with a reason: one earlier approval (#50).
  - 5-9 solved 01-09 and then printed `2.0` instead of `2.00` in *Lukujen keskiarvo*.
    Each has an open "my answer is right" request on the same output: one group (#51).
  - 10-16 in the middle, 7-12 exercises done.
  - 17-19 behind, 2-3 done over a week ago; one asked for help and got an answer.
  - 20-22 stuck on *Parillinen vai pariton* after 4-6 tries; two of them have open requests.
  - 23-24 enrolled, not started.
  - Grade transfers: sent for everything tried, failed for three, so the resend button shows.
- **Times are relative to now.** The plan stores minutes before now, so a nightly run keeps
  the demo looking current. Everything else is the same on every run (seeded PRNG).
- **Re-runnable.** The seed first removes what an earlier seed wrote (users with a `seed-`
  id on the demo platform and the course's approvals); visitors' users stay.
- **Safe.** It refuses to run without `DEMO_MODE=true` and when the database knows a real
  LTI platform (any issuer other than the demo's and localhost test platforms).
- **Visitors stay apart.** A visiting student gets a private copy of the course, so a
  visitor trying the teacher role sees only the invented students, never another visitor.

## Acceptance criteria

- [ ] Deterministic apart from the relative times (unit test of the plan).
- [ ] Runs again from scratch in under a minute (about 3 s locally, 252 runs).
- [ ] The teacher view shows every situation above (e2e `demo-history.spec.ts`).
- [ ] Names and data are invented, and the script says so at the top.
- [ ] Runs only with `DEMO_MODE=true`, never next to a real Moodle platform.
