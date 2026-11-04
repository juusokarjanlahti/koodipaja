# Spec: demo mode, signing in as a student or a teacher without Moodle (#126)

> **Touches authentication.** A new sign-in path, separate from LTI and `DEV_LOGIN`.

## Goal

A visitor to the public demo (a recruiter or a teacher) signs in with one click, either as
a student or as a teacher, without Moodle and without an account, and sees the app at once.

## Non-goals

- The demo course's three weeks of history (#127), the teacher's guided tour (#128).
- Rate limits, the nightly reset and monitoring (#129), deployment (#130).

## Design

- **`DEMO_MODE=true`** is its own setting. It is *not* `DEV_LOGIN`: `DEV_LOGIN` trusts any
  email and stays off whenever `NODE_ENV=production`. `DEMO_MODE` works in production,
  because the visitor never chooses an identity: the server creates it.
- **`/demo`** has two buttons, *Kokeile opiskelijana* and *Kokeile opettajana*. Both post
  `role` to **`POST /api/demo-login`**. Without `DEMO_MODE` both return 404.
- **Every visitor gets a fresh user** (`Demo-opiskelija 7F3A` / `Demo-opettaja 7F3A`, no
  email), so visitors never see each other's code or settings. The user is added to the
  demo course with the chosen role. The only input is `role`; anything else is rejected.
- **The demo course** lives on a made-up LTI platform (`https://demo.koodipaja.invalid`)
  so the existing teacher pages work unchanged. Its URLs cannot be reached, so no LTI
  launch or grade passback can ever succeed against it; real Moodle platforms are still
  registered only with `npm run lti:register`. The course's exercises are the Python
  exercises in course order. It is created on the first demo sign-in (idempotent).
- **After sign-in** a student lands on the exercise list, a teacher on the demo course.
- **A banner on every page** while `DEMO_MODE` is on: "Demo: kaikki tiedot ovat keksittyjä
  ja nollautuvat yöllä. Älä kirjoita omia tietojasi." It is text with a "Demo" label, not
  colour alone, and it is a landmark-free `role="note"` above the header.
- In demo mode the header's *Kirjaudu* link and `/login` point to `/demo`.

## Acceptance criteria

- [ ] `DEMO_MODE` and `DEV_LOGIN` are separate; `DEV_LOGIN` stays off in production.
- [ ] Demo users are created on the server; the visitor cannot pick an id or an email.
- [ ] The banner is on every page and is accessible.
- [ ] e2e: sign in as a student and as a teacher from `/demo`.
- [ ] Without `DEMO_MODE`, `/demo` and `/api/demo-login` return 404 (unit test).
