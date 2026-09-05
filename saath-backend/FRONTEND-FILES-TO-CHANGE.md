# Frontend Files Requiring Tiny Integration Changes

The frontend visual design and route structure do not need to be rewritten. The following targeted changes are sufficient to connect it to this backend:

| File or new file | Change |
|---|---|
| `lib/api.ts` (new) | Add a small typed fetch wrapper using `NEXT_PUBLIC_API_BASE_URL`, bearer token injection, envelope parsing, and normalized error handling. |
| `services/case/index.ts` | Replace local/demo lookup with `POST /api/v1/cases/connect`, `GET /api/v1/cases/:id`, and timeline calls. |
| `services/ai/index.ts` | Replace canned TAARA and score responses with backend endpoints. |
| `services/notifications/index.ts` | Replace prototype status with notifications API calls. |
| `app/welcome/page.tsx` | Call OTP request endpoint and store `challengeId`; do not generate or display a fake OTP. |
| `app/verify-otp/page.tsx` | Call OTP verify endpoint and persist returned access token. |
| `app/connect-case/page.tsx` | Send docket and registered mobile to the authenticated case-connect endpoint. |
| `app/consent/page.tsx` | Persist consent to `/api/v1/consents` before navigating. |
| `app/survivor/check-in/page.tsx` | Submit mood/check-in payload instead of only local state. |
| `app/survivor/check-in/voice/page.tsx` | Upload recorded audio as multipart `audio` to the voice endpoint. |
| `app/survivor/check-in/ivrs/page.tsx` | Post the simulated IVRS result; retain the current UI steps. |
| `app/survivor/privacy/page.tsx` | Call monitoring pause/resume/stop endpoints. |
| Dashboard, journey, case, alerts, admin, support, community, Hope Vault, Safe Circle, and notifications pages | Replace hardcoded arrays with the corresponding service calls while keeping existing layout/components. |
| frontend `.env.example` (new line) | `NEXT_PUBLIC_API_BASE_URL=http://localhost:4000` |

No backend files should be moved into the frontend repository.
