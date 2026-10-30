# Spec: course progress and a student's submissions for the teacher (#27, #28)

## Goal

A teacher who opened Koodipaja from Moodle sees, per course, how every student is doing on
every exercise, spots who is falling behind and which exercises are hard, and opens one
student's submissions to help them concretely.

## Non-goals

- Building the course or sets in Koodipaja (#26). A course's exercises are the ones its
  Moodle activities open (LTI resource links, chosen with Deep Linking #24).
- Manual approval (#50), grouping near-misses (#51), help requests (#49).
- Grades: Moodle keeps the gradebook (epic #5 non-goal).

## Design

- **Who is a teacher of a course:** a `course_memberships` row with role `teacher`, set
  by the LTI launch (#23). Every page and query checks it; a teacher of course A sees
  nothing of course B, and a student sees nothing at all (404, so course ids leak nothing).
- **Course exercises:** distinct exercises of `lti_resource_links` with the course id,
  ordered by language and exercise id. **Students:** memberships with role `student`.
- **`/opettaja`:** the teacher's courses with student and exercise counts.
- **`/opettaja/kurssit/<id>`:** a table, students × exercises. Each cell says its state in
  text, not just colour: "Ratkaistu", "Yritetty (n)" or "Ei aloitettu". A footer row gives
  each exercise's solve rate (solved / students). Rows sort by name or by fewest solved
  (`?jarjestys=ratkaistu`), which brings the students falling behind to the top.
  One aggregate query (`GROUP BY user, exercise`) serves 100 students × 60 exercises.
- **`/opettaja/kurssit/<id>/opiskelijat/<userId>`:** the student's submissions for the
  course's exercises, newest first per exercise, each with its code and every test's
  result. Unlike the student's own view, hidden tests show their input and output too:
  the exercise library is public (ADR 0002) and the teacher needs them to help.
- **Accessibility:** a real `<table>` with a caption, column and row headers; the wide
  table scrolls inside a focusable, labelled region (WCAG 2.1.1, 1.3.1, 1.4.1).
- A "Opettajan näkymä" link in the header for users who teach at least one course.

## Acceptance criteria

- Unit tests: the progress matrix (states, attempt counts, solve rates, sorting).
- Playwright with the fake LTI platform: two students and a teacher launch into the same
  course; one student solves the exercise. The teacher sees both rows with the right
  states and 50 % solve rate, opens the student's submissions and sees the code and test
  results. A student gets 404 for the teacher pages, and a teacher of another course too.
