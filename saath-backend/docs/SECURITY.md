# Security Notes

The backend uses Helmet, restricted CORS, JSON size limits, multipart size and MIME validation, global rate limiting, Zod validation, parameterized Supabase client queries, JWT verification, RBAC, ownership checks, and centralized safe errors. Sessions are created only after an eligible synthetic docket/reference is connected. Provider credentials and model keys are server-only environment variables.

The identity boundary is explicit: direct identity belongs in `identity_vault`; wellbeing, signal, score, and model tables use `victim_token`. Counsellors receive only assigned cases. Admin endpoints are aggregate-only. Audit records cover case access, consent change, monitoring change, alert operation, counsellor note, admin access, and data export/deletion request.

Crisis screening is a safety workflow, not an autonomous action workflow. A crisis signal creates a P1 human-review alert and supportive resource response. It never invokes police, hospitalization, relocation, or legal decisions. ML explanations are structured factors returned by a model/rule pipeline and are not free-form clinical claims.

For production, move rate limiting to a shared store, use an authenticated ML service, add Supabase Storage lifecycle policies for voice artifacts, encrypt sensitive vault payloads, configure centralized redacted logs, rotate secrets, and conduct a privacy/security review before handling real survivor data.
