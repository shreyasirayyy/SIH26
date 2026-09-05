# ML Service Contract

The backend owns authentication, consent enforcement, data minimisation, persistence, version metadata, and human-review routing. Model inference is replaceable through `ML_SERVICE_URL`; the frontend never receives provider credentials.

All requests use JSON and include a pseudonymous `victim_token`, not name, phone, address, or docket. The service must not invent clinical explanations. Every response must include `model_name`, `model_version`, `pipeline_version`, and `confidence`.

## Endpoints

- `POST /ml/analyze-text`: `{ victim_token, text, language }` → `{ signals, distress_score, recovery_score, crisis, confidence, contributing_factors, model_name, model_version, pipeline_version }`
- `POST /ml/analyze-voice`: `{ victim_token, audio_uri, language }` → transcript/features/signals with no raw audio in the response.
- `POST /ml/crisis-screening`: `{ victim_token, signals }` → `{ crisis, urgency, evidence, confidence, model metadata }`
- `POST /ml/baseline-update`: `{ victim_token, observations, prior_baseline }` → baseline window, normal range, confidence, trends.
- `POST /ml/distress-score`: `{ victim_token, signals, baseline }` → 0–100 score, uncertainty, contributing factors, model metadata.
- `POST /ml/recovery-score`: `{ victim_token, signals, baseline }` → 0–100 score, uncertainty, factors, model metadata.
- `POST /ml/escalation-probability`: `{ victim_token, distress, crisis, history }` → probability, horizon, uncertainty, metadata.
- `POST /ml/recommendation`: `{ victim_token, distress, recovery, consented_interventions }` → safe recommendation candidates.
- `POST /ml/explainability`: `{ victim_token, score, features }` → only factors derived from actual features/rules.

`insufficient_evidence` is a valid analytical state. A missing check-in must not become a high-risk score. Crisis outputs create an alert for human review and supportive resources; they do not autonomously hospitalize, contact police, relocate, or make legal decisions.
