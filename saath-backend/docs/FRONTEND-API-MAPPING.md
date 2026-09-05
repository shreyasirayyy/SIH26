# Frontend API Mapping

Audit date: 2026-09-05

This mapping describes the observed integration state. A route or service is marked `PARTIAL` when code exists but the screen still falls back to demo data, local state, or an unverified provider.

| Frontend route | API endpoint | Auth / role | Request | Response used by UI |
|---|---|---|---|---|
| `/welcome` | `POST /api/v1/auth/request-otp` | Anonymous | `{ phone }` | `PARTIAL`: service exists; welcome screen does not own the request |
| `/verify-otp` | `POST /api/v1/auth/verify-otp` | Anonymous | `{ challengeId, phone, otp }` | `PARTIAL`: API call exists; UI still advertises demo OTP and fallback acceptance |
| `/connect-case` | `POST /api/v1/cases/connect` | Survivor | `{ docket, registeredMobile }` | `PARTIAL`: current service checks demo data and requests OTP; authenticated case connect is missing |
| `/case-found` | `GET /api/v1/cases/:id` | Survivor | path id | `PARTIAL`: API attempt falls back to demo case |
| `/consent` | `POST /api/v1/consents` | Survivor | monitoring and tiered consent booleans | `NOT CONNECTED`: only Zustand/local component state |
| `/survivor` | case/monitoring/notifications endpoints | Survivor | none | `PARTIAL`: case call exists; scores and history are demo data |
| `/survivor/check-in` | `POST /api/v1/check-ins/mood` | Survivor | mood, sleep, safety, functioning, connectedness | `PARTIAL`: call exists; backend stores memory-only and does not enforce consent |
| `/survivor/check-in/voice` | `POST /api/v1/check-ins/voice` | Survivor | multipart `audio` | `PARTIAL`: upload call exists; provider and persistence are unverified |
| `/survivor/check-in/ivrs` | `POST /api/v1/check-ins/ivrs` | Survivor | language and responses | `PARTIAL`: simulated API call exists |
| `/survivor/journey` | monitoring endpoints | Survivor | none | `NOT CONNECTED`: trajectory methods return demo data |
| `/survivor/case` | `GET /api/v1/cases/:id`, `/timeline` | Survivor | none | `PARTIAL`: API attempts fall back to demo data |
| `/survivor/taara` | `POST /api/v1/ai/taara` | Survivor | `{message, language}` | `PARTIAL`: backend call exists; provider success is unverified and fallback remains |
| `/survivor/hope-vault` | `GET/POST/DELETE /api/v1/hope-vault` | Survivor | private item payload | private vault items |
| `/survivor/support/safe-circle` | `GET/POST/PATCH/DELETE /api/v1/safe-circle` | Survivor | contact + explicit consent | trusted contacts |
| `/survivor/support/navigator` | `GET /api/v1/support/resources` | Anonymous or Survivor | filters | resources |
| `/survivor/support/community` | `GET/POST /api/v1/community/posts`, report | Authenticated | post/report | moderation-status posts |
| `/survivor/notifications` | `GET /api/v1/notifications`, `PATCH .../:id/read` | Survivor | none | `NOT CONNECTED`: page uses local/static state |
| `/survivor/privacy` | `GET /api/v1/consents`, monitoring endpoints | Survivor | pause/resume/stop | `NOT CONNECTED`: controls update local state only |
| `/counsellor` | `GET /api/v1/counsellor/cases` | Counsellor | none | `PARTIAL`: page uses demo cases and trajectories |
| `/counsellor/cases/[id]` | counsellor case, timeline, distress, recovery, alerts endpoints | Counsellor | none | assigned case view |
| `/counsellor/alerts` | `GET /api/v1/alerts`; action endpoints | Counsellor/admin | acknowledge/assign/resolve payload | `NOT CONNECTED`: page uses local alert constants and acknowledgement state |
| `/admin` | `GET /api/v1/admin/district|state|national|trends|reports` | matching admin role | optional filters | `NOT CONNECTED`: page uses demo aggregates |

## Observed frontend gaps

1. Remove demo OTP text and any fallback that accepts arbitrary six-digit codes.
2. Make case connection call the authenticated backend route and pass the returned case identifier.
3. Persist consent and monitoring changes through the backend before updating local state.
4. Replace demo trajectories, case lists, alerts, admin charts, notifications, and resources with service calls while retaining the existing UI.
5. Add a frontend `.env.example` containing only `NEXT_PUBLIC_API_URL=http://localhost:4000`.
