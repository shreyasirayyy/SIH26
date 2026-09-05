# SAATH API

Base URL: `/api/v1`. All protected routes use `Authorization: Bearer <accessToken>`. Every response is wrapped in the standard envelope documented in the README.

## Authentication and cases

`POST /auth/request-otp` accepts `{ phone }` and returns a challenge id and expiry. `POST /auth/verify-otp` accepts `{ challengeId, phone, otp }` and returns a bearer token and safe user object. `POST /auth/staff-token` is a development-only convenience for seeded staff UI integration and must be removed or protected by an admin provisioning flow before production. `POST /cases/connect` accepts `{ docket, registeredMobile }`. `GET /cases/:id` and `GET /cases/:id/timeline` return own-case data for survivors and authorized data for assigned counsellors.

## Consent, monitoring, and check-ins

`POST/GET /consents` manages tiered consent. `POST /monitoring/pause`, `/resume`, and `/stop` update monitoring state. `POST /check-ins/mood`, `/text`, `/voice`, and `/ivrs` accept voluntary signals. Voice uses multipart field `audio` and validates MIME and size. `POST /check-ins/ivrs/webhook` is the provider callback. `GET /check-ins/history` returns the caller's history. `GET /monitoring/baseline`, `/distress`, `/recovery`, and `/trends` return model-versioned results or `insufficient_evidence`.

## Human support and staff operations

`GET /alerts` and `POST /alerts/:id/acknowledge|assign|resolve` support human review. Counsellors use `GET /counsellor/cases`, case detail/timeline/distress/recovery/alerts endpoints, and `POST /counsellor/interventions`, `/follow-ups`, and `/notes`. Interventions use `GET /interventions/recommendations`, `POST /interventions`, and `POST /interventions/:id/feedback`.

## Private and community features

Hope Vault uses `GET/POST /hope-vault` and `DELETE /hope-vault/:id`. Safe Circle uses `GET/POST/PATCH/DELETE /safe-circle` and requires explicit contact consent. Support Navigator uses `GET /support/resources` and `GET /support/resources/:id`. Community uses `GET/POST /community/posts` and `POST /community/posts/:id/report`; moderation remains server-controlled and direct messaging is intentionally absent. Notifications use `GET /notifications` and `PATCH /notifications/:id/read`.

## Administration

`GET /admin/district`, `/state`, `/national`, `/trends`, and `/reports` are role-gated aggregate endpoints. They must never return survivor-level mental-health records.
