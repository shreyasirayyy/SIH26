# Frontend API contract

Use `POST /api/v1/cases/connect` with `{ "reference_id": "NHAA-RJ-2026-004821" }`, then store the returned bearer token. Do not call or display any OTP flow.

Before submitting a mood, text, or voice check-in, call `POST /api/v1/consents` with `{ consent_type, granted, version }`. Mood requires `wellbeing_monitoring`; text requires `text_analysis`; voice requires `voice_analysis`. ML-unavailable responses are truthful: `insufficient_evidence: true` and no score. Voice uploads use multipart field `audio` and accept MPEG, WAV, WebM, or MP4 up to `UPLOAD_MAX_BYTES`.
