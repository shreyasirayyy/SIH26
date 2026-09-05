# SAATH Implementation Status

Audit date: 2026-09-05

Statuses below describe current evidence, not intent. `DONE` is used only where the end-to-end behavior is verified. No Excel tracker was found in the workspace, so this machine-readable report is the current status source.

| ID | Feature | Current Status | Evidence | Missing Work | Dependency | Priority |
|---|---|---|---|---|---|---|
| A01-A05 | Survivor onboarding, welcome, docket, registered mobile | PARTIALLY DONE | Screens and demo docket/mobile exist; case service validates a docket locally | Remove demo fallback and connect authenticated case flow | Real frontend API integration | P0 |
| A06 | REAL OTP request | BLOCKED | Backend endpoint now always generates a secure random challenge and calls provider abstraction | Configure and verify Twilio-compatible SMS delivery | SMS credentials | P0 |
| A07 | REAL OTP verification | PARTIALLY DONE | JWT session is issued after challenge verification | Enforce challenge phone match and verify through real delivery | A06 | P0 |
| A08-A11 | OTP expiry, resend, attempts, rate limiting | PARTIALLY DONE | Expiry, cooldown, max attempts, and global rate limiter exist in memory | Persist challenges and add per-phone/IP limits and tests | Supabase/repository | P0 |
| A12 | SMS provider integration | BLOCKED | Twilio adapter exists; provider defaults to console | Configure credentials and perform real delivery test | Twilio account | P0 |
| A13-A16 | Session, refresh, logout, route protection | PARTIALLY DONE | JWT bearer token and protected backend routes exist | Refresh/revocation/logout and frontend protected navigation | Auth/session design | P0 |
| A17-A18 | Synthetic case dataset/adapter | PARTIALLY DONE | Synthetic case and adapter exist | Route must use adapter and persistent case/user linkage | Repository | P0 |
| A20-A24 | Case verification, profile, timeline, synchronization | PARTIALLY DONE | Routes and seeded timeline exist | Connect frontend, enforce timeline ownership, persist events | Case persistence | P0 |
| B01-B22 | Consent, privacy, pause/resume/stop, export/deletion, audit | PARTIALLY DONE | Consent and monitoring routes exist; migration has tables | Persist consent history, enforce gates, add export/deletion and audit logs | Supabase and policy | P0 |
| D01-D17 | Check-in modes and history | PARTIALLY DONE | Mood, text, voice, IVRS and history routes exist | Persist observations/signals, connect all screens, handle missing data consistently | Supabase, consent | P0 |
| E01-E99 | AI and TAARA | PARTIALLY DONE | Server-side Groq/Whisper adapters, TAARA safety branch, and dedicated analysis/crisis routes exist | Provider tests, ML response validation, real API verification | Groq key/provider | P0 |
| M01-M09 | Baseline, change detection, fusion, distress, recovery | NOT STARTED | Generic monitoring route always returns `insufficient_evidence` | Implement personal longitudinal pipeline and persistence | Signals/history and methodology | P0 |
| L01-L06 | Alerts, severity, dedupe, human review, audit | PARTIALLY DONE | Crisis paths append in-memory alerts; staff routes exist | Persist and mutate alerts, deduplicate, assignment checks, audit every action | Repository/RBAC | P0 |
| C01-C06 | Counsellor access, detail, interventions, follow-ups | PARTIALLY DONE | Role-gated endpoints and intervention route exist | Assignment-scoped reads and persisted intervention/follow-up actions | Case assignments | P0 |
| AD01-AD05 | District/state/national/trends aggregation | PARTIALLY DONE | Role-gated placeholder endpoint and SQL view exist | Query aggregates, validate scopes, connect admin UI | Supabase aggregate queries | P1 |
| N01-N04 | In-app/SMS notifications and reminders | PARTIALLY DONE | List/read and SMS routes exist | Persist notifications and create them from workflow events | Notifications table/SMS | P1 |
| S01-S08 | CORS, headers, validation, RBAC, secrets, audit | PARTIALLY DONE | Helmet, CORS, rate limit, Zod, JWT/RBAC present | Remove exposed secrets/defaults, staff-token guard, audit middleware | Deployment configuration | P0 |
| T01-T12 | Required regression and integration tests | PARTIALLY DONE | Six backend tests cover basic OTP/security paths | Add persistence, consent, AI, monitoring, alert lifecycle, RBAC tests | Test DB/provider mocks | P0 |
| X01 | Master Excel tracker | BLOCKED | Workbook not found in workspace search | Provide/open existing workbook and update evidence-based statuses | Workbook location | P1 |
