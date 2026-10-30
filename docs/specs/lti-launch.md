# Spec: LTI 1.3 launch from Moodle (#23)

## Goal

A student or teacher clicks a Koodipaja activity on a Moodle course and lands in Koodipaja,
signed in, without a separate account. Koodipaja learns their course role from Moodle.

## Non-goals (separate PRs)

- Deep Linking: choosing an exercise from Moodle's activity picker (#24).
- Grade passback with Assignment and Grade Services (#25).
- Names and Role Provisioning, dynamic registration, HAKA/SAML.
- Teacher views (they will read the course memberships stored here).

## Design

- **Standard library only.** The OIDC flow and RS256 verification are about 150 lines on top
  of `node:crypto`; a library (ltijs, jose) would add a large dependency and its own database
  layer for something we must understand anyway. No new dependencies.
- **Flow** (IMS Security Framework 1.0, LTI Core 1.3):
  1. `GET|POST /api/lti/login`: third-party initiated login. Look up the platform by
     `iss` (+ `client_id`), store a single-use `state` and `nonce` in the database (10 min),
     set a `kp_lti_<state>` cookie binding the state to this browser, and redirect to the
     platform's OIDC auth endpoint.
  2. `POST /api/lti/launch`: the platform posts `id_token` and `state`. Check the state row
     and cookie, verify the JWT signature against the platform's JWKS (RS256 only, `kid`
     match, keys cached for 10 minutes and refetched once on an unknown `kid`), then the
     claims: `iss`, `aud`/`azp`, `exp`/`iat` (60 s skew), `nonce`, `deployment_id`,
     `message_type = LtiResourceLinkRequest`, `version = 1.3.0`, non-empty `sub`. The state
     row is deleted before validation, so a token can be used once.
  3. Create or update the user, the course (context) and the membership, set the normal
     session cookie and redirect to `target_link_uri` if it is on this site, otherwise `/`.
  4. `GET /api/lti/jwks`: the tool's public key (from `LTI_PRIVATE_KEY`), needed by Moodle at
     registration and later for grade passback.
- **Data minimisation (GDPR art. 5(1)(c)):** stored are the platform's opaque user id
  (`sub`) and the display name. Email is not stored, so `users.email` becomes nullable.
  Course: the platform's context id and title. Membership: user, course, role.
- **Roles:** `membership#Instructor`, `#ContentDeveloper` and `Instructor#TeachingAssistant`
  map to `teacher`, everything else to `student`. The role is stored per course; the
  global `users.role` is only ever raised to `teacher`, never lowered by a later launch.
- **Errors** go to a Finnish error page that says what to do (open the activity again from
  Moodle; contact the teacher), never a stack trace.
- **Cookies:** the state cookie and the session cookie set during the launch are
  `SameSite=None; Secure` in production because the launch is a cross-site POST. Moodle
  should open the tool in a new window; inside an iframe, browsers that block third-party
  cookies break any LTI tool's session.
- **Platforms** are registered with `npm run lti:register` (a row per Moodle); the tool's key
  is generated with `npm run lti:keygen`.

## Acceptance criteria

- Unit tests: JWT parsing, signature verification (valid, tampered, wrong alg, unknown kid),
  every claim check, role mapping, target link handling.
- Playwright: a fake platform (in the test) runs the full browser flow; the user lands on
  the target exercise signed in, a replayed `id_token` is rejected, and a missing state
  cookie is rejected.
- Manual: a real launch from Moodle 4.5 as a student and as a teacher.
- The migration is additive except for dropping `NOT NULL` from `users.email`.
- The PR is flagged as touching authentication, personal data and a migration.
