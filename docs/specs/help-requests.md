# Spec: Pyydä apua and manual approval (#49, #50, #51)

Draft for the owner's review before any code. It stores a student's free-text message and
changes how submissions are graded, so the PR must flag personal data, a database migration
and the grading path.

## Goal

A student who is convinced their answer is right, but the system interprets it too strictly,
presses one button and asks the teacher to look at it. If the teacher agrees, that kind of
answer counts as correct for **every** student of the course, equally and automatically. If
the teacher does not agree, the answer stays wrong. A student can also simply ask for help
with an answer that really is wrong; the teacher replies privately.

## Non-goals

- Chat or threads: one request, at most one reply per request.
- Notifications by email or Moodle messages (the teacher sees requests in the course view).
- Any AI at runtime, including to judge whether an answer is "close enough" (CLAUDE.md).
- Changing the exercise library from the UI. Approvals live in the database, scoped to a
  course. A teacher can propose the variant upstream as an `accepted/` file separately.
- Help requests for students outside a Moodle course (no teacher): the button is hidden.

## Design

### Request

- **Table `help_requests`:** `id`, `user_id`, `exercise_id`, `course_id`, `submission_id`
  (latest submission when asked), `message` (optional, max 500), `kind` (`apu` for "I do
  not understand" or `kiista` for "my answer is right"), `status` (`open` | `answered`),
  `reply` (max 1000, visible only to the asking student), `created_at`, `answered_at`.
  One open request per student and exercise; asking again updates it.
- **Student side:** the button "Pyydä apua" is always visible on the exercise page, with
  "Avun pyytäminen on ihan tavallista." The student picks "En ymmärrä, miksi tämä ei mene
  läpi" or "Mielestäni vastaukseni on oikein", and may add a message. The page then shows
  the status and the teacher's reply.

### Approval (the dispute path)

- **Table `approved_outputs`:** `course_id`, `exercise_id`, `case_position`,
  `output_hash` (hash of the output after the exercise's `output_match` normalisation, so
  it is exact for `exact` exercises and lenient for `lenient` ones), `approved_by`,
  `reason` (required; #50), `created_at`. Unique on the first four columns.
- **Teacher decides on a `kiista` request:** "Hyväksy" adds an `approved_outputs` row for
  every case where the student's output differs from the expected one, with the reason.
  "Älä hyväksy" only sends the reply. Approval is reversible (delete the row); the reply
  to the student says so either way.
- **Grading:** after the normal comparison, a failing case still passes when its
  normalised output hash is in `approved_outputs` for a course the student belongs to and
  the exercise. The check lives in `app/src/lib/grading/` next to the comparison, with
  unit tests for both directions, and never relaxes the comparison for anyone else.
- **Already submitted work:** approving also re-evaluates that course's earlier
  submissions for the exercise against the new rule, so students who gave up earlier become
  correct without resubmitting; grade passback (#25) is queued for them.

### Stopping a flood of identical requests (#51)

- Identical wrong-but-plausible answers produce the same output hash. The teacher view
  **groups open `kiista` requests by exercise, case and output hash**, shows how many
  students sent it, and one decision answers the whole group (approve: all become
  correct; reject: all get the same reply).
- **Before sending**, the student is told if their output is already approved ("Tämä
  vastaus on jo hyväksytty, aja uudelleen") or already waiting ("Opettaja katsoo jo samaa
  vastausta, sinun ei tarvitse lähettää uutta pyyntöä"). That removes most duplicate
  requests without adding a rule the teacher has to maintain.
- A reject reason is shown to later students who hit the same output, so they do not ask
  again.

### Access and accessibility

- Only the student sees their own request and reply; only a teacher of the course sees,
  answers and approves (same membership check as #27/#28, 404 otherwise). Approval applies
  only within that course.
- Native `<button>` and labelled `<textarea>`, status text in a `role="status"` region, no
  colour-only state (WCAG 2.1 AA).
- **Withdrawing:** the student can withdraw their own open request at any time; it is
  deleted. Requests never expire on a timer.
- **Personal data:** submissions and help messages are linked to an identifiable student,
  so they are personal data. `approved_outputs` stores only a hash, the approving teacher
  and the reason, never the student; the reason field warns teachers not to quote a
  student's code. Requests and approvals are deleted with the course data under the
  retention rules (#33).

## Acceptance criteria

Those of #49, #50 and #51, plus, in Playwright: a student cannot read or answer another
student's request; a teacher of course A cannot see or approve in course B; after approval a
second student with the same output passes without asking; a rejected group stays failing.

## Order of work

1. `help_requests`, student button, teacher list and reply (#49). No grading change.
2. `approved_outputs`, the grading check, approval action and re-evaluation (#50).
3. Grouping and the "already approved or waiting" notices (#51).
4. "Ehdota kirjastoon" suggestions and the owner's review list.

## Three levels: course, suggestion, library

The library's defaults are maintained by the owner. Teachers shape their own course and
feed improvements back, so the project improves from the inside out (see also #39):

1. **Course rule (teacher, immediate):** a teacher approves an output for their course.
   It applies to every student of that course and nowhere else.
2. **Library suggestion (teacher, optional):** when approving, the teacher can tick
   "Ehdota kirjastoon". That stores a `library_suggestions` row (exercise, case, the
   approved output, the reason, the course's teacher) and nothing about the student. It
   does not change any other course.
3. **Library default (owner):** the owner reviews suggestions (a list on an owner-only
   page, or an exported `accepted/<name>.<ext>` candidate with the reason) and merges them
   through a normal pull request, so CI still checks that the new accepted variant passes
   and every `wrong/` solution still fails. The course rule can then be dropped as
   redundant. The owner can also reject a suggestion with a reason, which the suggesting
   teacher sees.

Open design point for step 4: a suggestion needs a real source file for `accepted/`, and
we only store an output hash. The suggestion therefore also keeps the **approved output
text** (not the student's code), and the owner writes the accepted solution, or asks the
teacher for one. No student code leaves the course.

## Decisions by the owner

- The teacher's reply is private to the student by default.
- One open request per student and exercise; the student may withdraw it; no expiry.
- Library defaults are maintained by the owner. Teachers approve course-specific rules and
  can suggest solutions for the library (see "Three levels").
