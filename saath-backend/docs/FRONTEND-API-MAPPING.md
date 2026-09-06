# Frontend mapping

The survivor starts at `/connect-case`, which calls `POST /api/v1/cases/connect` using a canonical synthetic `reference_id` such as `NHAA-RJ-2026-004821`. The returned bearer token authorizes consent, voluntary check-ins, monitoring views, TAARA, and interventions.

Staff surfaces use the role-gated alerts, counsellor, and aggregate admin endpoints. The backend provides synthetic demo records only; no production NHAA integration is claimed.
