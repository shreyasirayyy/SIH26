# Architecture

The backend is an independently runnable Express/TypeScript service. HTTP composition lives in `src/app.ts`; validation is applied before route handlers; services isolate OTP/SMS and ML provider concerns; middleware handles request IDs, auth, roles, and safe errors; the data layer exposes Supabase plus a memory mode for tests and local development.

The runtime boundary is Frontend → REST API → service layer → Supabase/ML/SMS providers. The frontend never receives Supabase secret keys, SMS credentials, AI keys, or JWT signing material. The synthetic case adapter is represented by seeded database records and the memory store demo fixture; it can later be replaced with a real NHAA adapter without changing controller contracts.

Identity is intentionally separated from analytical data. Authentication maps a phone to a user and pseudonymous `victim_token`; signal and score tables use that token. Consent is checked before model processing. Crisis signals are routed to human review and safe resources. Administrative reporting uses server-side aggregate views.
