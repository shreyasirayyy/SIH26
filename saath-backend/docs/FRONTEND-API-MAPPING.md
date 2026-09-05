# Frontend API Mapping

The UI route names below are taken from the attached ZIP. Loading and error states should remain in the existing components; service wrappers should throw normalized API errors so screens can render their current inline messages.

| Frontend route | API endpoint | Auth / role | Request | Response used by UI |
|---|---|---|---|---|
| `/welcome` | `POST /api/v1/auth/request-otp` | Anonymous | `{ phone }` | `{ challengeId, expiresInSeconds }` |
| `/verify-otp` | `POST /api/v1/auth/verify-otp` | Anonymous | `{ challengeId, phone, otp }` | `{ accessToken, user }` |
| `/connect-case` | `POST /api/v1/cases/connect` | Survivor | `{ docket, registeredMobile }` | `CaseRecord` |
| `/case-found` | no additional call if connect response cached; otherwise `GET /api/v1/cases/:id` | Survivor | path id | `CaseRecord` |
| `/consent` | `POST /api/v1/consents` | Survivor | monitoring and tiered consent booleans | consent record |
| `/survivor` | `GET /api/v1/cases/:id`, `GET /api/v1/monitoring/distress`, `GET /api/v1/monitoring/recovery`, `GET /api/v1/notifications` | Survivor | none | dashboard cards |
| `/survivor/check-in` | `POST /api/v1/check-ins/mood` | Survivor | mood, sleep, safety, functioning, connectedness | observation and analytical state |
| `/survivor/check-in/voice` | `POST /api/v1/check-ins/voice` | Survivor | multipart `audio` | processing receipt |
| `/survivor/check-in/ivrs` | `POST /api/v1/check-ins/ivrs` | Survivor | language and responses | IVRS record |
| `/survivor/journey` | `GET /api/v1/monitoring/baseline`, `/distress`, `/recovery`, `/trends` | Survivor | none | model-versioned outputs |
| `/survivor/case` | `GET /api/v1/cases/:id`, `/timeline` | Survivor | none | case and timeline |
| `/survivor/taara` | add `POST /api/v1/ai/taara` | Survivor | `{message, language}` | constrained supportive reply and crisis metadata |
| `/survivor/hope-vault` | `GET/POST/DELETE /api/v1/hope-vault` | Survivor | private item payload | private vault items |
| `/survivor/support/safe-circle` | `GET/POST/PATCH/DELETE /api/v1/safe-circle` | Survivor | contact + explicit consent | trusted contacts |
| `/survivor/support/navigator` | `GET /api/v1/support/resources` | Anonymous or Survivor | filters | resources |
| `/survivor/support/community` | `GET/POST /api/v1/community/posts`, report | Authenticated | post/report | moderation-status posts |
| `/survivor/notifications` | `GET /api/v1/notifications`, `PATCH .../:id/read` | Survivor | none | notifications |
| `/survivor/privacy` | `GET /api/v1/consents`, monitoring endpoints | Survivor | pause/resume/stop | consent/monitoring state |
| `/counsellor` | `GET /api/v1/counsellor/cases` | Counsellor | none | assigned case summaries |
| `/counsellor/cases/[id]` | counsellor case, timeline, distress, recovery, alerts endpoints | Counsellor | none | assigned case view |
| `/counsellor/alerts` | `GET /api/v1/alerts`; action endpoints | Counsellor/admin | acknowledge/assign/resolve payload | alert rows |
| `/admin` | `GET /api/v1/admin/district|state|national|trends|reports` | matching admin role | optional filters | aggregate charts only |

## Minimal frontend files to change

1. Add `lib/api.ts` with `NEXT_PUBLIC_API_BASE_URL`, JSON envelope parsing, bearer-token injection, and 401 handling.
2. Replace implementations of `services/case`, `services/ai`, and `services/notifications` with calls to the backend; keep their exported method names so visual pages do not need redesign.
3. Update `app/welcome/page.tsx` and `app/verify-otp/page.tsx` to use request/verify OTP and persist `accessToken` and `challengeId`; never display or infer an OTP.
4. Update `app/connect-case/page.tsx` to call `/cases/connect` with the real authenticated token and pass the returned case id/docket to the next route.
5. Update `app/consent/page.tsx` and `app/survivor/privacy/page.tsx` to persist changes rather than only changing Zustand state.
6. Replace hardcoded case, score, alert, chart, resource, notification, and community arrays with service calls while retaining existing components and styling.
7. Add the backend base URL to the frontend's local `.env.example` as `NEXT_PUBLIC_API_BASE_URL=http://localhost:4000` without committing secrets.
