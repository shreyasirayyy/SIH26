# SAATH API

All responses use `{ success, data, request_id }`; failures use `{ success:false, error:{code,message}, request_id }`.

`POST /cases/verify` and `POST /cases/connect` accept `{ "reference_id":"NHAA-RJ-2026-004821" }`. Connection creates the survivor session and returns only a safe case summary from `src/db/synthetic-cases.json`. There is no OTP authentication.

Protected survivor APIs: `GET /cases/:id`, `GET /cases/:id/timeline`, `POST/GET /consents`, `POST /check-ins/mood|text|voice`, and `GET /monitoring/baseline|distress|recovery|trends`. Consents are independently versioned and revocable: `wellbeing_monitoring`, `text_analysis`, `voice_analysis`, and `behavioural_signals`. A missing check-in returns `state: "insufficient_evidence"`, never a raised distress score.

TAARA uses `POST /ai/taara`; supportive recommendations use `POST /ai/recommend`. A crisis signal creates a P1 human-review alert. The service makes no autonomous clinical, legal, police, hospitalization, or relocation decision.

Staff APIs are role-gated: `GET /alerts`, `POST /alerts/:id/acknowledge|assign|resolve`, and `GET /admin/trends`. Admin output is aggregated only.
