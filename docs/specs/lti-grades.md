# Spec: grades back to Moodle with LTI Assignment and Grade Services (#25)

## Goal

When a student launched from a Moodle activity submits that exercise, their result appears
in the Moodle gradebook without the teacher copying anything.

## Non-goals

- Creating or managing line items from Koodipaja (Moodle creates one per activity).
- Exercise sets as one activity (comes with Deep Linking, #24).
- A teacher or admin UI for sync status (a CLI now; the teacher view comes later).

## Design

- **Which activity gets the grade.** The launch stores the resource link: its platform
  id, the exercise its `target_link_uri` points to (`/exercises/<id>`), and the AGS
  endpoint claim (`lineitem`, scopes). A row per (resource link, user) records that this
  user launched from it and tracks the grade sync status.
- **When.** After a submission is graded, the worker enqueues one `grades` job if the
  user has an activity for that exercise that takes grades. Every job sends the current
  best score, so a job per submission is harmless and never misses the latest result.
- **What.** The **best** submission so far: highest passed/total, earliest on ties.
  `scoreGiven` = passed cases, `scoreMaximum` = cases, `activityProgress: Completed`,
  `gradingProgress: FullyGraded`. Moodle keeps the last score it receives, so always
  sending the best one means a later worse attempt never lowers the grade.
- **How.** OAuth 2 client credentials with a JWT client assertion signed by the tool key
  (IMS Security Framework 4.1), scope `.../lti-ags/scope/score`, token cached until shortly
  before it expires. `POST <lineitem>/scores` (the path segment goes before any query
  string) with `application/vnd.ims.lis.v1.score+json`.
- **Failures.** BullMQ retries 5 times with exponential backoff (about 1 minute in total).
  Each attempt updates the row: `pending`, `sent` (with the score and time) or `failed`
  (with the last error). `npm run lti:grades` lists failed and pending rows for the admin,
  and `npm run lti:grades -- --retry` enqueues them again.
- **Privacy.** Only the platform user id and the score go to the platform: nothing it does
  not already have.

## Acceptance criteria

- Unit tests: best score selection, score URL building, token request and caching, score
  payload, status updates on success and failure.
- Playwright with the fake platform: a launched student submits, the fake platform's token
  endpoint receives a valid signed assertion and its score endpoint the best score; a later
  worse submission still sends the best score.
- Manual: a real Moodle 4.5 gradebook shows the grade.
