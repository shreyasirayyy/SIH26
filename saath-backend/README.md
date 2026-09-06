# SAATH Backend

This is a separate Node.js 20+ / TypeScript / Express REST backend for the attached SAATH Next.js frontend. It deliberately does not redesign or rewrite the frontend. Express was chosen over NestJS because this hackathon API is modular but small enough for explicit route/service boundaries, and the resulting deployment has fewer framework-specific conventions.

## What is real and what is demo

Authentication is docket/reference-based: `POST /api/v1/cases/connect` accepts a synthetic `reference_id`, validates it through the replaceable mock NHAA adapter, and returns a survivor session. The authoritative demo source is `src/db/synthetic-cases.json` (11 synthetic cases). There is no OTP, SMS authentication, OTP table, or OTP configuration in this product. The optional SMS boundary is only for future notifications.

Case records use a synthetic adapter and the canonical docket `NHAA-RJ-2026-004821` for the hackathon. No production NHAA or government integration is claimed. IVRS has a clearly labeled simulated endpoint until a telephony provider is configured. The ML client delegates to `ML_SERVICE_URL` when present and otherwise returns a controlled unavailable state; it never fabricates an inference.

## Quick start

```bash
cp .env.example .env
npm install
npm run build
npm test
npm run dev
```

The API listens on `http://localhost:4000`. Health is available at `/health`. For Supabase, apply `supabase/migrations/001_initial_schema.sql`, then `supabase/seed/demo.sql`. Use the Supabase secret/service key only on the server. Never put it in the frontend or commit `.env`.


## Configuration and data boundary

`DATA_MODE=memory` is useful for tests and local UI integration. The repository includes a Supabase client and SQL schema; set `DATA_MODE=supabase` and the server key to wire database operations into the Supabase project. The service-role key bypasses RLS and must be kept server-side. RLS is deny-by-default for direct client access, while backend routes enforce JWT, role, survivor ownership, and counsellor assignment checks.

Identity is separated from wellbeing data. `identity_vault` is for direct identifiers, while analytical tables use `victim_token`. ML requests must contain `victim_token` and consented signals, never name, phone number, address, or docket. Raw audio is not retained by the upload route; production object storage should use short-lived paths and purge metadata.

## API shape

Successful responses use `{ success: true, data, request_id }`. Errors use `{ success: false, error: { code, message }, request_id }`. See `docs/API.md` for the endpoint inventory, `docs/FRONTEND-API-MAPPING.md` for the attached UI mapping, `docs/FRONTEND-BACKEND-GAP-ANALYSIS.md` for the audit, and `docs/ML-CONTRACT.md` for the model boundary.

## Project structure

`src/app.ts` defines HTTP composition and route contracts. `src/services/case` contains the synthetic, replaceable NHAA adapter; `src/services/taara` is the provider-neutral TAARA boundary. `src/middleware` contains JWT/RBAC. `src/db/store.ts` provides local demo storage plus a Supabase client. `supabase/migrations` contains relational schema, indexes, constraints, aggregate view, and RLS.

## Production checklist

Use a managed secret store, a random `JWT_SECRET`, HTTPS, a real ML service with request authentication, Supabase backups, structured log redaction, object-storage lifecycle deletion, alert escalation runbooks, and a human review process for crisis signals. The backend never makes autonomous medical, police, legal, relocation, or hospitalization decisions.
