from fastapi import FastAPI, Header, HTTPException, UploadFile, Form
from pydantic import BaseModel, Field
import joblib
import pandas as pd
from pathlib import Path
from datetime import datetime, timezone
from collections import defaultdict
import os

from text_signals import build_text_signal
from crisis_safety import screen_message
from construct_signals import build_wellbeing_observation
from baseline_engine import Observation, compute_baseline, compare_to_baseline, CONSTRUCTS
from distress_engine import FusionInput, fuse_signals, compute_priority, compute_trajectory
from voice_signals import build_voice_signal


# ============================================================
# PATHS
# ============================================================

BASE_DIR = Path(__file__).resolve().parent 

DISTRESS_MODEL_FILE = (
    BASE_DIR / "distress_score_model.joblib"
)

RISK_MODEL_FILE = (
    BASE_DIR / "risk_level_model.joblib"
)


# ============================================================
# FASTAPI APP
# ============================================================

app = FastAPI(
    title="SAHAYAK ML API",
    description="Distress and risk prediction API",
    version="1.0"
)


# ============================================================
# LOAD TRAINED MODELS
# ============================================================

distress_model = joblib.load(
    DISTRESS_MODEL_FILE
)

risk_model = joblib.load(
    RISK_MODEL_FILE
)


# ============================================================
# API KEY
# ============================================================

API_KEY = os.getenv("ML_API_KEY")

if not API_KEY:
    raise RuntimeError("ML_API_KEY is not configured")


# ============================================================
# IN-MEMORY CASE HISTORY (hackathon simplification)
# ------------------------------------------------------------
# Production should persist this in the backend's `wellbeing_observations`
# / `baselines` tables (see docs/ML-CONTRACT.md) instead of process memory,
# so history survives restarts and is shared across replicas. Kept here so
# the baseline/trajectory modules have something to compute against
# without requiring a DB wired up during the hackathon.
# ============================================================

_construct_history: dict[str, dict[str, list[Observation]]] = defaultdict(lambda: defaultdict(list))
_distress_history: dict[str, list[int]] = defaultdict(list)


def _record_observation(victim_token: str, construct_values: dict[str, float]) -> None:
    now = datetime.now(timezone.utc)
    for construct, value in construct_values.items():
        _construct_history[victim_token][construct].append(Observation(timestamp=now, value=value))


# ============================================================
# INPUT SCHEMA
# ============================================================

class PredictionRequest(BaseModel):

    case_type: str
    victim_role: str
    target_group: str
    case_stage: str
    language: str

    days_since_complaint: int

    sentiment: str
    emotion: str

    threat_indicator: int
    court_stress: int
    financial_distress: int
    social_isolation: int
    engagement_score: int

    previous_distress_score: float
    distress_change: float
    distress_trend: str


class AnalyzeTextRequest(BaseModel):
    victim_token: str = Field(min_length=1, max_length=200)
    text: str = Field(min_length=1, max_length=4000)
    language: str = Field(default="en", max_length=20)


# ============================================================
# HOME
# ============================================================

@app.get("/")
def home():

    return {
        "status": "ML API is running",
        "service": "SAHAYAK"
    }


# ============================================================
# HEALTH CHECK
# ============================================================

@app.get("/health")
def health():

    return {
        "status": "healthy",
        "models_loaded": True
    }


# ============================================================
# PREDICT
# ============================================================

@app.post("/predict")
def predict(
    data: PredictionRequest,
    x_api_key: str = Header(default=None)
):

    # --------------------------------------------------------
    # API KEY CHECK
    # --------------------------------------------------------

    if x_api_key != API_KEY:

        raise HTTPException(
            status_code=401,
            detail="Invalid API key"
        )


    # --------------------------------------------------------
    # CONVERT REQUEST TO DATAFRAME
    # --------------------------------------------------------

    features = {

        "case_type": data.case_type,
        "victim_role": data.victim_role,
        "target_group": data.target_group,
        "case_stage": data.case_stage,
        "language": data.language,

        "days_since_complaint":
            data.days_since_complaint,

        "sentiment": data.sentiment,
        "emotion": data.emotion,

        "threat_indicator":
            data.threat_indicator,

        "court_stress":
            data.court_stress,

        "financial_distress":
            data.financial_distress,

        "social_isolation":
            data.social_isolation,

        "engagement_score":
            data.engagement_score,

        "previous_distress_score":
            data.previous_distress_score,

        "distress_change":
            data.distress_change,

        "distress_trend":
            data.distress_trend
    }


    X = pd.DataFrame([features])


    # --------------------------------------------------------
    # ML PREDICTION
    # --------------------------------------------------------

    try:

        distress_score = float(
            distress_model.predict(X)[0]
        )

        risk_level = str(
            risk_model.predict(X)[0]
        )

    except Exception as error:

        raise HTTPException(
            status_code=500,
            detail=f"Prediction failed: {error}"
        )


    # --------------------------------------------------------
    # LIMIT SCORE
    # --------------------------------------------------------

    distress_score = round(
        max(
            0,
            min(
                distress_score,
                100
            )
        )
    )


    # --------------------------------------------------------
    # RESPONSE
    # --------------------------------------------------------

    return {

        "success": True,

        "distress_score":
            distress_score,

        "risk_level":
            risk_level
    }


@app.post("/ml/analyze-text")
def analyze_text(data: AnalyzeTextRequest, x_api_key: str = Header(default=None)):
    if x_api_key != API_KEY:
        raise HTTPException(status_code=401, detail="Invalid API key")

    # ----------------------------------------------------------
    # Step 1 (N01/N02/E11) - crisis screening ALWAYS runs first and
    # ALWAYS wins. No fusion result is ever allowed to soften or
    # outrank a detected crisis signal.
    # ----------------------------------------------------------
    crisis_screen = screen_message(data.text)
    crisis = crisis_screen["crisisDetected"]

    # ----------------------------------------------------------
    # Step 2 (F01-F13, G01-G08) - text -> construct signals
    # ----------------------------------------------------------
    text_signal = build_text_signal(data.text)
    observation = build_wellbeing_observation(data.victim_token, text_signal, source="text")
    construct_values = {
        "intrusion": observation.intrusion,
        "avoidance": observation.avoidance,
        "hyperarousal": observation.hyperarousal,
        "negative_mood": observation.negative_mood,
        "perceived_safety": observation.perceived_safety,
        "sleep_disturbance": observation.sleep_disturbance,
        "social_isolation": observation.social_isolation,
    }
    _record_observation(data.victim_token, construct_values)

    # ----------------------------------------------------------
    # Step 3 (H01-H13) - baseline retrieval + comparison per construct
    # ----------------------------------------------------------
    history = _construct_history[data.victim_token]
    baselines = {c: compute_baseline(c, history[c]) for c in CONSTRUCTS}
    deviations = {}
    for construct, baseline in baselines.items():
        if baseline is None:
            continue
        recent = [o.value for o in history[construct][-4:]]
        deviations[construct] = compare_to_baseline(construct, construct_values[construct], baseline, recent_values=recent)

    baseline_confidences = [b.confidence for b in baselines.values() if b is not None]
    avg_baseline_confidence = sum(baseline_confidences) / len(baseline_confidences) if baseline_confidences else 0.0

    # ----------------------------------------------------------
    # Step 4 (I01-I15) - fuse everything into the final score
    # ----------------------------------------------------------
    fusion_input = FusionInput(
        victim_token=data.victim_token,
        construct_values=construct_values,
        deviations=deviations,
        construct_confidence=observation.confidence,
        baseline_confidence=avg_baseline_confidence,
        crisis=crisis,
    )
    result = fuse_signals(fusion_input)
    _distress_history[data.victim_token].append(result.distress_score)
    priority = compute_priority(result)
    trajectory = compute_trajectory(_distress_history[data.victim_token][-14:])

    insufficient_evidence = avg_baseline_confidence == 0.0 and not crisis

    return {
        "victimToken": data.victim_token,
        "distressScore": result.distress_score,
        "recoveryScore": result.recovery_score,
        "escalationProbability": result.escalation_probability,
        "confidence": result.confidence,
        "signals": {
            "source": "text",
            "language": data.language,
            "themes": text_signal.themes,
            "sentiment": text_signal.sentiment,
            "emotion": text_signal.emotion,
            "constructValues": construct_values,
        },
        "contributingFactors": [
            {"factor": f["factor"], "direction": "increased_distress", "weight": f["weight"]}
            for f in result.contributing_factors
        ],
        "modelName": "saath-text-fusion-pipeline",
        "modelVersion": "1.0.0",
        "pipelineVersion": "ml-api-analyze-text-v2",
        "crisis": crisis,
        "insufficientEvidence": insufficient_evidence,
        "status": "unavailable" if insufficient_evidence and not crisis else "available",
        # Extra fields beyond the backend's MlResult contract - useful for
        # debugging/demo, harmless if the caller ignores them.
        "explanation": result.explanation,
        "priority": priority.to_dict(),
        "trajectory": trajectory,
        "crisisResponse": crisis_screen["response"],
    }


# ============================================================
# ANALYZE VOICE  (F16-F22 acoustic pipeline + text fusion reuse)
# ============================================================

@app.post("/ml/analyze-voice")
async def analyze_voice(
    file: UploadFile,
    x_api_key: str = Header(default=None),
    language: str = Form(default="en"),
    victim_token: str = Form(...),
):
    if x_api_key != API_KEY:
        raise HTTPException(status_code=401, detail="Invalid API key")

    audio_bytes = await file.read()

    # Step 1 (F16-F22) - acoustic/prosodic features + local transcript
    try:
        voice_signal = build_voice_signal(audio_bytes)
    except ValueError as error:
        raise HTTPException(status_code=400, detail=str(error))

    transcript = voice_signal.transcript
    if not transcript:
        # No usable transcript (local STT unavailable/failed) - the caller
        # (backend) is expected to fall back to Groq Whisper and resubmit
        # the resulting text through /ml/analyze-text instead. We still
        # return the acoustic features since those don't need a transcript.
        return {
            "transcript": None,
            "analysis": {
                "victimToken": victim_token,
                "distressScore": None,
                "recoveryScore": None,
                "escalationProbability": None,
                "confidence": 0.0,
                "signals": {"source": "voice", "language": language, "voiceFeatures": voice_signal.to_dict()},
                "contributingFactors": [],
                "modelName": "saath-voice-pipeline",
                "modelVersion": "1.0.0",
                "pipelineVersion": "ml-api-analyze-voice-v1",
                "crisis": False,
                "insufficientEvidence": True,
                "status": "unavailable",
            },
        }

    # Step 2 - reuse the exact same text->construct->baseline->fusion
    # pipeline as /ml/analyze-text, just with the voice transcript as
    # input and the acoustic features folded into `signals`.
    text_result = analyze_text(
        AnalyzeTextRequest(victim_token=victim_token, text=transcript, language=language),
        x_api_key=x_api_key,
    )
    text_result["signals"]["source"] = "voice"
    text_result["signals"]["voiceFeatures"] = voice_signal.to_dict()
    # Voice-processing confidence and text confidence are both partial
    # views of the same check-in's reliability - use the weaker one.
    text_result["confidence"] = round(min(text_result["confidence"], voice_signal.confidence), 3)

    return {"transcript": transcript, "analysis": text_result}