# Spec: choosing exercises from Moodle with LTI Deep Linking (#24)

## Goal

A teacher adds a Koodipaja activity in Moodle and picks the exercise from Koodipaja's own
list ("Select content"), instead of typing an exercise URL.

## Non-goals

- Exercise sets as one activity (there are no sets yet; each chosen exercise becomes its
  own activity).
- Editing an existing activity's content from Koodipaja.

## Design

- **Request.** `LtiDeepLinkingRequest` arrives at the same `/api/lti/launch` endpoint and
  goes through the same signature and claim checks as a resource link launch (shared
  `validateCommon`). Additionally: the user must have a teaching role, and
  `deep_linking_settings` must have an http(s) `deep_link_return_url` and accept
  `ltiResourceLink`.
- **The pending choice** is an HMAC-signed token (one hour, `SESSION_SECRET`) holding the
  platform, deployment, return URL, `accept_multiple` and the opaque `data`. Moodle shows
  the chooser in an iframe inside the activity form, where the session cookie is a
  third-party cookie, so the token, not the session, authorises finishing the choice. The
  most its holder can do is send exercise links back to the Moodle page that asked.
- **Chooser** `/lti-valitse`: exercises grouped by language as an accessible form
  (fieldset per language, labelled checkboxes, or radio buttons when the platform accepts
  one item). Submitting nothing shows an alert instead of an error.
- **Response.** `POST /api/lti/deep-link` signs an `LtiDeepLinkingResponse` with the tool
  key (`iss` = client id, `aud` = platform issuer, deployment id, `data` echoed) with one
  `ltiResourceLink` content item per exercise: title, URL `/exercises/<id>` and a line
  item (`scoreMaximum: 100`) so Moodle creates a grade item and AGS (#25) works. An
  auto-submitting form (button without JavaScript) posts it to the return URL.

## Known limitation

The OIDC state cookie of the launch is `SameSite=None; Secure`. Inside Moodle's iframe it
is a third-party cookie; browsers that block those (Safari by default) fail the deep
linking launch with "kirjautuminen vanheni". Moodle can open the chooser in a new window
instead, and LTI's client-side OIDC storage (postMessage) is the long-term fix.

## Acceptance criteria

- Unit tests: request validation (teacher only, return URL, accept types, single choice),
  choice token (round trip, expiry, tampering), signed response, HTML escaping.
- Playwright with the fake platform: choosing two exercises posts a verified response
  with both, a single-choice request offers radio buttons, a student is refused, and a
  forged choice token is refused.
- Manual: Moodle 4.5 "Select content" fills the activity's name and URL, and the saved
  activity has a grade item.
