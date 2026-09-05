# SAATH Remaining Backend and AI Work

Audit date: 2026-09-05

## P0 - Must Finish For Demo

### Real OTP and authentication
- **Why needed:** The demo's identity boundary must be real and must not expose or accept a hardcoded OTP.
- **Current state:** Backend challenge logic now always generates a random OTP and the frontend no longer displays or accepts a demo code; the console provider still does not deliver a real SMS.
- **Exact files:** `src/services/otp.ts`, `src/config/env.ts`, `src/app.ts`, `../saath-frontend/services/case/index.ts`, `../saath-frontend/app/verify-otp/page.tsx`, `../saath-frontend/app/connect-case/page.tsx`.
- **Exact API:** `POST /api/v1/auth/request-otp`, `POST /api/v1/auth/verify-otp`.
- **DB dependency:** Durable `otp_challenges`, UUID `users`, identity linkage, and audit records.
- **AI dependency:** None.
- **Blocker:** SMS provider credentials and real phone test.
- **Acceptance criteria:** No OTP in source/UI/logs/response; real phone receives code; wrong, expired, reused, and over-attempt codes fail; resend and per-phone/IP limits work; session is issued only after matching challenge phone.

### Case connection and frontend session
- **Why needed:** Synthetic case must be connected after authenticated verification.
- **Current state:** Backend route exists, but frontend checks demo data first and does not call `/cases/connect`; route bypasses adapter and memory store is not durable.
- **Exact files:** `src/app.ts`, `src/services/case.ts`, `src/db/store.ts`, `../saath-frontend/services/case/index.ts`, `../saath-frontend/app/connect-case/page.tsx`, `../saath-frontend/app/case-found/page.tsx`.
- **Exact API:** `POST /api/v1/cases/connect`, `GET /api/v1/cases/:id`, `GET /api/v1/cases/:id/timeline`.
- **DB dependency:** `users`, `cases`, `case_events`, `case_assignments`.
- **AI dependency:** None.
- **Blocker:** UUID identity mapping and repository choice.
- **Acceptance criteria:** Valid docket/mobile returns a case from the synthetic adapter; invalid pair fails; survivor can only read the linked case and timeline; frontend uses the response without fallback.

### Consent and monitoring gates
- **Why needed:** Sensitive signals must be voluntary and processing must stop when consent is paused/stopped.
- **Current state:** Consent persistence and backend signal gates are now wired, but records remain memory-only and the privacy screen still updates local state only.
- **Exact files:** `src/app.ts`, `src/db/store.ts`, `../saath-frontend/app/consent/page.tsx`, `../saath-frontend/app/survivor/privacy/page.tsx`, `../saath-frontend/store/useAppStore.ts`.
- **Exact API:** `POST/GET /api/v1/consents`, `POST /api/v1/monitoring/pause|resume|stop`.
- **DB dependency:** `consents`, `monitoring_profiles`, `audit_logs`.
- **AI dependency:** Consent must be checked before text/voice analysis.
- **Blocker:** Durable repository and consent policy decisions.
- **Acceptance criteria:** Every signal route rejects absent/revoked consent; pause/stop prevents analysis; resume is explicit; consent changes are auditable.

### Persisted check-ins and safe AI boundary
- **Why needed:** The demo chain must persist a check-in, invoke backend AI, and expose a safe outcome.
- **Current state:** Mood/text/voice routes and dedicated analysis/crisis endpoints exist but store results in memory; fallback AI is allowed and external success is unverified.
- **Exact files:** `src/app.ts`, `src/services/ml.ts`, `src/db/store.ts`, `../saath-frontend/services/ai/index.ts`, check-in pages.
- **Exact API:** `POST /api/v1/check-ins/mood`, `/text`, `/voice`, `GET /api/v1/check-ins/history`, `POST /api/v1/ai/analyze-text`, `POST /api/v1/ai/crisis-screen`, `POST /api/v1/ai/taara`.
- **DB dependency:** `wellbeing_observations`, `text_signals`, `voice_signals`, `audit_logs`.
- **AI dependency:** Configured Groq or an authenticated ML provider; schema validation and timeout.
- **Blocker:** Groq credential verification and persistence implementation.
- **Acceptance criteria:** Pseudonymous input only; raw text/audio retention is minimized; malformed/provider failures are safe; low confidence returns `insufficient_evidence`; crisis creates a deduplicated human-review alert and audit event.

### Personal monitoring pipeline
- **Why needed:** A missing check-in must not become a high distress score, and scores must use personal history.
- **Current state:** `/monitoring/:kind` always returns `insufficient_evidence` with raw records; no baseline/fusion/persistence exists.
- **Exact files:** `src/app.ts`, new or existing monitoring service under `src/services/`, `src/db/store.ts`, frontend monitoring services/pages.
- **Exact API:** `GET /api/v1/monitoring/baseline|distress|recovery|trends`.
- **DB dependency:** `baselines`, `distress_scores`, `recovery_scores`, `risk_forecasts`.
- **AI dependency:** Versioned rule/ML pipeline with confidence and factors.
- **Blocker:** Approved scoring methodology and historical test fixtures.
- **Acceptance criteria:** Insufficient history returns `insufficient_evidence`; adequate history returns baseline, deviation, confidence, factors, trend, and pipeline version; no raw internal AI details leak to survivors.

### Alert lifecycle and staff access
- **Why needed:** AI recommends while counsellors review and decide.
- **Current state:** Alerts are in memory, actions do not mutate records, dedupe is absent, counsellor list is not assignment-scoped, and staff tokens are publicly forgeable.
- **Exact files:** `src/app.ts`, `src/middleware/auth.ts`, `src/services/case.ts`, `src/db/store.ts`, counsellor/alert frontend pages.
- **Exact API:** `GET /api/v1/alerts`, `POST /api/v1/alerts/:id/acknowledge|assign|resolve`, counsellor cases/interventions/follow-ups.
- **DB dependency:** `alerts`, `priority_records`, `case_assignments`, `audit_logs`, `interventions`, `follow_ups`.
- **AI dependency:** Only signal generation; no autonomous resolution.
- **Blocker:** Staff identity/provisioning and repository implementation.
- **Acceptance criteria:** Alerts are durable, deduplicated, assignment-scoped, auditable, and critical alerts require human action; staff-token endpoint is local-only or removed.

## P1 - Important

- Implement Supabase repository reads/writes for cases, consents, check-ins, monitoring, alerts, notifications, interventions, and admin aggregates. Validate UUID mapping and perform safe read/write smoke tests.
- Connect survivor dashboard, journey, privacy, notifications, case, counsellor, alerts, and admin pages to service calls, preserving existing UI.
- Implement persisted notification creation, in-app read state, reminders, and provider failure handling.
- Add filtered support resources, Safe Circle ownership checks, Hope Vault persistence, and community moderation persistence.
- Add refresh/revocation/logout semantics and avoid long-lived bearer tokens in browser localStorage where the deployment supports secure cookies.
- Add integration tests for consent gates, case ownership, AI provider failure/malformed output, monitoring, alerts, assignment RBAC, and admin aggregation.

## P2 - Enhancement

- Production IVRS/telephony adapter and callback signature verification.
- Object storage lifecycle for temporary voice artifacts and retention deletion jobs.
- Accessibility preference sync, richer resource filtering, and survivor export workflow.
- Provider-agnostic observability, dashboards, and operational alert escalation.

## FUTURE

- Authorized NHAA/government adapter; current case data remains synthetic and must not be represented as a real NHAA integration.
- Clinical/human review operations, escalation runbooks, and formal model governance.
- Multi-region deployment, backups, disaster recovery, and privacy retention automation.

## Required Environment Variables

Backend: `NODE_ENV`, `PORT`, `CORS_ORIGINS`, `DATA_MODE`, `SUPABASE_URL`, `SUPABASE_SECRET_KEY` (server only), `SUPABASE_JWKS_URL`, `SMS_PROVIDER`, `SMS_ACCOUNT_SID`, `SMS_AUTH_TOKEN`, `SMS_FROM_NUMBER`, `AI_PROVIDER`, `AI_API_KEY`, `GROQ_MODEL`, `JWT_SECRET`, `OTP_PEPPER`, OTP TTL/cooldown/attempt settings, and upload limit.

Frontend: `NEXT_PUBLIC_API_URL` pointing to the backend. No Supabase secret, Groq key, SMS credential, OTP, or JWT signing secret belongs in frontend environment variables.
