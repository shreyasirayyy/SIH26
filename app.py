from fastapi import FastAPI, Header, HTTPException
from pydantic import BaseModel
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

API_KEY = os.getenv(
    "ML_API_KEY",
    "sahayak-dev-key"
)


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