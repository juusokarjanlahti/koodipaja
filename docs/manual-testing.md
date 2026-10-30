# Manual testing guide

A click-through checklist for features that automated tests only cover in part, or where
the feel matters (wording, tone, layout, keyboard use). Tick what works, write what does
not. Dates are when the feature was merged.

**Setup:** `./scripts/dev-setup.sh`, then `cd app && npm run dev:all` and open
<http://localhost:3000> ([local-dev.md](local-dev.md)). Student features work with the
development login (any email). Teacher features and help requests need a **course**, which
only exists after an LTI launch from Moodle ([product/moodle-lti.md](product/moodle-lti.md),
`tools/moodle/lti-setup.php`).

## A. Student, development login (no Moodle needed)

- [ ] **Numbering (#94):** the front page shows "1. Tervehdys", "2. Lukujen summa" and so on
      in order. Java, Rust etc. exercises show no number. Screen reader (or the accessibility
      tree) reads the number as part of the title.
- [ ] **Start here (#94):** a new student sees "Aloita tästä: 1. Tervehdys" above the Python
      list. After solving 1, it says "Jatka tästä: 2. ..." and points at the first unsolved
      exercise. When everything is solved the link disappears.
- [ ] **Previous/next links:** on an exercise page the links between exercises show numbers.
- [ ] **Progress note (#95):** on an exercise with several tests, submit code that passes 1
      test, then code that passes 2. A green note says "Yksi testi enemmän kuin viime kerralla"
      (and "N testiä enemmän" for bigger jumps). It must **not** appear when the count is the
      same or lower, or when everything passes. Judge the tone: encouraging, not patronising?
- [ ] **Existing flows still fine:** Aja shows output, Palauta gives per-test feedback, the
      "next exercise" box appears after solving.

## B. Teacher view (needs a Moodle course)

- [ ] **Grade transfers (#99):** the course progress table has a footer row "Arvosanat
      Moodleen" with "N siirretty" per exercise. Solve an exercise as a student and check the
      count goes up after the worker has sent the grade.
- [ ] **Failures:** make a transfer fail (for example stop Moodle or break the line item).
      The row shows a red "N epäonnistui" and a box "N arvosanan siirto Moodleen ei
      onnistunut" with a **Lähetä epäonnistuneet uudelleen** button. After fixing the cause,
      pressing it gets the grades through.
- [ ] **Student page:** open one student's submissions. Under each exercise a line says the
      last grade sent ("Moodleen siirretty 3 / 4 (pvm)") or that the transfer failed.
- [ ] **Access:** a teacher of another course gets a 404 for this course's pages; a student
      cannot open `/opettaja/...` at all.

## C. Help requests (#49, needs a Moodle course)

As a student launched from a course activity:

- [ ] A "Pyydä apua" panel is on the exercise page. It says asking for help is ordinary.
      It is **not** shown for exercises outside the course or without Moodle.
- [ ] Choose a kind, add a message, send. The panel confirms "Pyyntö on lähetetty". Sending
      again edits the same request (only one open request per exercise).
- [ ] **Peruuta pyyntö** withdraws it at once; the teacher's list no longer shows it.

As the teacher:

- [ ] The course page lists open requests (student, exercise, kind, message) with a link to
      that student's submissions, and a reply form. Sending a reply removes it from the list.

As the student again:

- [ ] After reload, the teacher's reply is shown on the panel. Another student never sees it.

Judge: is the wording shaming anywhere? Is the form usable with the keyboard only and
announced by a screen reader (status line, labelled fields)?

## D. Accessibility spot check (#30)

- [ ] Tab through the front page, an exercise page and the teacher course page: focus is
      always visible, the order is logical, nothing is a mouse-only control.
- [ ] Zoom to 200 % and use a narrow window: nothing overlaps or is cut off.
- [ ] Dark mode (system setting): text and the new notes/buttons stay readable.
- [ ] One pass with a screen reader (NVDA/VoiceOver) on the help panel and the teacher
      course table.

## E. Notes

Write findings as issues, one per problem, with the page and what you expected. Anything
about wording or tone is as valuable as a bug.
