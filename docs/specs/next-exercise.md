# Spec: next exercise, and other ways forward when stuck

## Goal

A student who solves an exercise moves on in one click. A student who is stuck is offered
other ways forward instead of being left facing the same red test: an exercise that does
not need what this one teaches, a review of where the needed concepts were taught, and,
later, a way back to what they left unfinished. All of it is suggestion; nothing is locked.

## Design

- **No AI.** The suggestions follow the exercise order (by id within a language) and two
  author-written lists in `exercise.yaml`: `concepts` (what the exercise teaches) and the
  new optional `requires` (concepts it uses but does not teach). `validate.py` checks that
  every id exists and none is in both lists. The author decides; nothing is inferred
  from code.
- **Dependency.** A concept is *introduced* by the first exercise that lists it in
  `concepts`. Exercise B depends on A when B's `concepts` or `requires` include a concept
  A introduces.
- **Solved:** "Seuraava tehtävä: <title> →", the next unsolved exercise (wrapping to an
  earlier unsolved one). If an earlier exercise was left unfinished (attempted, not
  solved), also "<title> jäi aiemmin kesken. Nyt voi olla hyvä hetki palata siihen."
- **Stuck:** the latest result does not pass and the exercise has at least 3 failed
  submissions (`STUCK_AFTER_FAILED`). Shown, in a calm tone:
  - *Skip to* the first later unsolved exercise that does not depend on this one.
  - *Review* the closest earlier exercise that introduced a concept this one needs
    (solved ones first), naming the concepts.
  - *Come back* to an earlier unfinished exercise.
- Previous and next links above the assignment, always.
- Computed by a pure function (`lib/exercises/next-steps.ts`) on the client from the
  exercise list, the student's statuses and this page's submissions, so the suggestion
  appears as soon as a result arrives, without another request.

## Acceptance criteria

- Unit tests for dependencies and every suggestion, on a slice of the real course.
- Playwright: solve 01 → next is 02; fail 02 three times → skip to 12 and review 01; solve
  12 → back to 02; previous/next links.
