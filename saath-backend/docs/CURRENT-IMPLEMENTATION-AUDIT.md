# SAATH Current Implementation Audit

Audit date: 2026-09-05

This audit is based on repository inspection. Runtime claims are marked verified only when an executable check or external operation provided evidence. The requested Excel tracker was not present in the workspace search, so it was not modified.

## Executive Summary

The repository contains a useful Express/Next.js prototype with synthetic case data, a broad Supabase migration, JWT/RBAC middleware, OTP hashing logic, Groq/Whisper adapters, and a small backend test suite. The end-to-end product flow is not complete. Most backend domain writes and reads use an in-memory store, frontend screens still use demo data or local state, and real SMS/Supabase/Groq behavior could not be verified from the available terminal checkout.

Critical security finding: `saath-backend/.env` contains live-looking provider credentials. They are not reproduced here. Rotate any exposed credentials, remove the file from version control if tracked, and use a secret manager or ignored local environment file.

## Evidence and Status

| Feature | Existing code? | API | Database | Frontend connected? | AI/ML | Auth | Error handling | Test | Demo data | Security | Actual status |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Health and HTTP envelope | Yes | `/health`, `/` | No | Not applicable | No | No | Yes, request IDs and centralized errors | Health test exists | No | Helmet, CORS, rate limit | PARTIALLY DONE |
| Survivor OTP request | Yes | `POST /api/v1/auth/request-otp` | Insert attempted only in Supabase mode | Partially; service calls it | No | Anonymous request | Validation, cooldown | Response secrecy and cooldown tests | No fixed OTP after audit fix | SMS provider is console by default | BLOCKED |
| OTP verification and session | Yes | `POST /api/v1/auth/verify-otp` | User insert attempted | Partially; token stored in localStorage | No | JWT issued | Attempts, expiry, one-use | Basic validation only | No frontend fallback after audit fix | Phone in body is not checked against challenge; default secrets exist | PARTIALLY DONE |
| Real SMS delivery | Twilio adapter | Provider abstraction | `otp_challenges` schema exists | No provider status shown | No | N/A | Provider errors mapped | No Twilio integration test | Console provider in development | Credentials absent from example configuration | BLOCKED |
| Staff authentication | Yes | `POST /api/v1/auth/staff-token` | No | Demo accounts call local state | No | Arbitrary signed role token | Validation only | Role test indirectly exercises it | Demo staff accounts | Public role impersonation endpoint | BLOCKED |
| Synthetic case connection | Yes | `/cases/connect`, `/cases/:id`, timeline | Memory only; SQL schema exists | Not connected to `/cases/connect`; service falls back to demo | No | Case reads require JWT | Validation and ownership partly present | Invalid connection test | Seed/demo case | Timeline ownership gap; route bypasses adapter | PARTIALLY DONE |
| Consent and privacy | Yes | `/consents`, `/monitoring/:action` | Memory only | Local Zustand only | Consent not enforced | JWT | Basic validation | No consent tests | Local state | Pause/stop does not block processing; no audit log | PARTIALLY DONE |
| Mood check-in | Yes | `POST /check-ins/mood` | Memory only | One service call exists | Text analysis of summary | JWT | Zod validation | No behavior test | UI values and demo history | No consent/monitoring gate | PARTIALLY DONE |
| Text check-in | Yes | `POST /check-ins/text` | Memory only | No dedicated frontend call | Groq/fallback analysis | JWT | Provider fallback | No AI failure/schema test | Demo history | Raw text is not stored in result, but consent is absent | PARTIALLY DONE |
| Voice check-in | Yes | `POST /check-ins/voice` | Memory only | Connected upload path exists | Groq Whisper plus text analysis | JWT | Size/MIME checks and 503 mapping | No voice test | Simulated UI | No consent gate; transcript returned to caller | PARTIALLY DONE |
| IVRS | Yes | `/check-ins/ivrs`, webhook | Memory only | Connected simulated call | None | JWT for submit | Validation | No tests | Explicit simulated provider | Production telephony absent | DEFERRED |
| TAARA | Yes | `POST /ai/taara` | No conversation persistence | Connected from TAARA service | Groq or fallback, rule crisis gate | JWT | Safety reply and provider fallback | No safety/malformed-output test | Fallback response | Crisis path creates memory alert only | PARTIALLY DONE |
| Crisis screening | Partial | `POST /ai/crisis-screen` now exists | Memory alert only | No dedicated frontend flow | Regex plus optional Groq | JWT and consent | Crisis response exists | No crisis tests | Rule fallback | No human-review persistence/audit trail | PARTIALLY DONE |
| Baseline | Route pattern only | `/monitoring/:kind` | Schema exists, unused | Frontend uses demo trajectory | No personal baseline | JWT | Returns `insufficient_evidence` always | No tests | Demo scores | No manufactured score, but no implementation | NOT STARTED |
| Distress and recovery | Route pattern only | `/monitoring/:kind` | Schema exists, unused | Demo values | No longitudinal pipeline | JWT | Always insufficient evidence | No tests | Hardcoded trajectories | Internal model fields exposed in response | NOT STARTED |
| Alerts | Partial | `/alerts`, action route | Memory only | Counsellor page uses local constants | AI can create memory alerts | Role middleware | Action response exists | No lifecycle tests | Demo alerts | Actions do not mutate records; no deduplication/audit | PARTIALLY DONE |
| Counsellor cases/interventions | Partial | `/counsellor/*`, `/interventions` | Memory only | Pages use demo cases/trajectories | Reads demo AI data | Role middleware | Basic not-found and validation | No assignment tests | Demo queue | Case list is not assignment scoped | PARTIALLY DONE |
| Admin aggregation | Partial | `/admin/:scope` | Aggregate view exists but unused | Admin page uses demo arrays | No | Admin role middleware | Basic | No aggregation tests | Hardcoded charts | Route accepts arbitrary scopes and returns placeholder trends | PARTIALLY DONE |
| Notifications | Partial | `/notifications`, SMS route | Memory only | Page does not load/read API | No | JWT | SMS provider errors | No tests | Local UI | No persisted notification creation or audit | PARTIALLY DONE |
| Hope Vault/Safe Circle/community/resources | Partial | Routes exist | Memory only except schema fragments | Mostly local/static UI | No/optional | JWT on private actions | Validation varies | No tests | Demo resources/posts | Ownership and persistence incomplete | PARTIALLY DONE |
| Supabase schema | Yes | Client helpers exist | Broad migration with RLS and aggregate view | No end-to-end persistence | No | Service key intended server-side | Insert/select helper errors | No DB connectivity test | Seed exists | Service key must not reach frontend | PARTIALLY DONE |
| Security/audit | Partial | Middleware and limits exist | `audit_logs` table exists | No | No | JWT/RBAC | Central error envelope | Limited tests | Development defaults | Exposed `.env`, public staff token, localStorage token | PARTIALLY DONE |

## OTP Determination

**Status: PARTIALLY DONE and BLOCKED for real delivery.**

The backend has secure random OTP generation only in production mode, peppered hashing, expiry, attempt limits, one-use invalidation, timing-safe comparison, normalization, and resend cooldown. Development mode uses `DEMO_OTP`, the default provider is a console provider, and the frontend visibly displays `482913` and accepts any six digits when no challenge exists. Real SMS cannot be claimed because provider credentials and an actual delivery were not verified. The verify route also accepts a phone field without comparing it to the challenge phone.

## Supabase Determination

**Status: PARTIALLY DONE; runtime connectivity NOT VERIFIED.**

The migration defines identity separation, cases, consents, observations, signals, baselines, scores, alerts, interventions, follow-ups, contacts, resources, notifications, audit logs, and an aggregate view. The runtime store remains `memoryStore`; only selected inserts are attempted when `DATA_MODE=supabase`. Reads and most writes never reach Supabase. OTP verification generates a non-UUID user ID while `users.id` is UUID, so the current user insert is incompatible with the migration.

## Groq/AI Determination

**Status: PARTIALLY DONE; external success NOT VERIFIED.**

Groq text analysis, TAARA generation, and Whisper voice transcription are server-side adapters with timeouts and output validation for Groq responses. Analysis failures fall back to a low-confidence rule result, and no dedicated crisis-screen endpoint exists. `ML_SERVICE_URL` responses are not schema-validated and have no request authentication. No actual Groq API call was verified in this audit.

## Runtime Verification Gaps

The terminal available to this session resolved to `C:\Users\yadav` and did not contain the workspace checkout, so `npm test` and `npm run build` could not be run there; both failed before npm could find a `package.json`. No frontend/backend servers were started from the correct checkout, no real SMS was observed, no Supabase read/write was performed, and no Groq request was verified. These are recorded as unverified rather than successful.

## Highest-Priority Findings

1. Remove the frontend demo OTP display and fallback acceptance; require the backend challenge path.
2. Configure and test a real SMS provider, or keep the flow explicitly BLOCKED.
3. Remove or protect public staff-token issuance before any non-local deployment.
4. Replace memory-only domain persistence with a consistent repository layer and fix UUID identity mapping.
5. Enforce consent and monitoring state before text, voice, or behavioural processing.
6. Implement personal baseline, distress/recovery, alert mutation/deduplication, assignment checks, and audit logging.
7. Rotate exposed credentials and add secret scanning/ignore rules.
8. Connect frontend case, consent, monitoring, staff, alert, admin, notification, and history screens to real API responses.
