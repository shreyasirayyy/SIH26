from fastapi import FastAPI, Header, HTTPException
from pydantic import BaseModel, Field
import joblib
import pandas as pd
from pathlib import Path
import os


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


def crisis_detected(text: str) -> bool:
    lowered = text.lower()
    return any(term in lowered for term in (
        "suicide", "kill myself", "end my life", "self-harm", "hurt myself", "immediate danger",
        "don't want to live", "do not want to live",
    ))


@app.post("/ml/analyze-text")
def analyze_text(data: AnalyzeTextRequest, x_api_key: str = Header(default=None)):
    if x_api_key != API_KEY:
        raise HTTPException(status_code=401, detail="Invalid API key")

    crisis = crisis_detected(data.text)
    # The tabular models require structured signals. Text alone must not be
    # presented as a confident clinical score, so this endpoint returns an
    # explicit insufficient-evidence result until enough check-in features exist.
    return {
        "victimToken": data.victim_token,
        "distressScore": None,
        "recoveryScore": None,
        "escalationProbability": None,
        "confidence": 0.0,
        "signals": {"source": "text", "language": data.language},
        "contributingFactors": ([{"factor": "explicit_safety_language", "direction": "increased_distress", "weight": 1.0}] if crisis else []),
        "modelName": "tabular-text-adapter",
        "modelVersion": "1.0.0",
        "pipelineVersion": "ml-api-analyze-text-v1",
        "crisis": crisis,
        "insufficientEvidence": True,
        "status": "unavailable",
    }