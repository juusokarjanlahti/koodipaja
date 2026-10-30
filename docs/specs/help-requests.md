# Spec: Pyydä apua -painike (#49)

Draft for the owner's review before any code. The feature stores a student's free-text
message, so it touches personal data and needs a database migration (flag both in the PR).

## Goal

A student asks the teacher to look at their solution with one press, at any time, without
it feeling embarrassing. The teacher sees the request with the latest submission attached
and can answer; the student sees the status and the answer.

## Non-goals

- Chat or threads: one request, at most one answer per request.
- Notifications by email or Moodle messages (the teacher sees requests in the course view).
- Automatic hints or any AI at runtime (CLAUDE.md).
- Help requests for students outside a Moodle course (no teacher to send them to): the
  button is hidden when the student has no course whose teacher could see the exercise.

## Design

- **Table `help_requests`:** `id` (uuid), `user_id`, `exercise_id`, `course_id`,
  `submission_id` (latest submission when asked; null if none yet), `message` (text, max
  500 chars, optional), `status` (`open` | `answered`), `reply` (text, max 1000, nullable),
  `created_at`, `answered_at`. One open request per student and exercise; asking again
  updates the message.
- **Student side:** the button "Pyydä apua" is always visible on the exercise page, with
  the line "Avun pyytäminen on ihan tavallista." An optional message field. After sending,
  the page shows "Opettaja näkee pyyntösi" (open) or the teacher's reply (answered).
- **Teacher side:** the course view lists open requests (student, exercise, message, link
  to that student's submissions page #28, where the attached submission is open). A reply
  form closes the request.
- **Access:** only the student sees their own requests; only a teacher of the course sees
  and answers its requests (same membership check as #27/#28; 404 otherwise).
- **Accessibility:** native `<button>` and labelled `<textarea>`, status text in a
  `role="status"` region, no colour-only state.
- **Retention:** requests are deleted with the course data under the retention rules
  (#33).

## Acceptance criteria

Those of #49, plus: a student cannot read or answer another student's request, and a
teacher of course A cannot see course B's requests (Playwright, as in teacher-progress).

## Open questions for the owner

1. Should the reply be visible only to the asking student (assumed), or also to the course?
2. Is one open request per exercise right, or should a student be able to send several?
