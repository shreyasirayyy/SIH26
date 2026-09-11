
from __future__ import annotations

from dataclasses import dataclass, field
from typing import Optional

from text_signals import TextSignal, extract_themes


_CONSTRUCT_THEME_MAP = {
    "intrusion": "intrusion",
    "avoidance": "avoidance",
    "hyperarousal": "hyperarousal",
    "negative_mood": "negative_mood",
    "sleep": "sleep",
    "social_connectedness": "social_connectedness",
    "perceived_safety": "safety",
}

_CONSTRUCT_EMOTION_BOOST = {
    "intrusion": {"fear", "sadness"},
    "avoidance": {"disgust", "sadness"},
    "hyperarousal": {"fear", "anger"},
    "negative_mood": {"sadness", "disgust"},
    "perceived_safety": {"fear"},
}


def _score_construct(construct: str, themes: list[str], emotion: dict, sentiment: dict) -> float:
    theme_key = _CONSTRUCT_THEME_MAP[construct]
    score = 0.0
    if theme_key in themes:
        score += 0.55
    if emotion.get("label") in _CONSTRUCT_EMOTION_BOOST.get(construct, set()):
        score += 0.25 * emotion.get("confidence", 0.0)
    # negative sentiment adds weak supporting evidence to distress-leaning
    # constructs; positive sentiment pulls the score down slightly.
    if construct in ("intrusion", "avoidance", "hyperarousal", "negative_mood", "perceived_safety"):
        score += max(0.0, -sentiment.get("score", 0.0)) * 0.2
    return round(min(1.0, score), 3)


def score_constructs(signal: TextSignal) -> dict:
    """F06-F09 + F10,F13 - returns a 0..1 score per construct.
    social_connectedness is inverted (high score = more isolated), matching
    how the other constructs read as "more of this = more distress"."""
    themes = signal.themes
    emotion = signal.emotion
    sentiment = signal.sentiment

    scores = {
        c: _score_construct(c, themes, emotion, sentiment)
        for c in ("intrusion", "avoidance", "hyperarousal", "negative_mood", "perceived_safety")
    }
    scores["sleep_disturbance"] = 0.6 if "sleep" in themes else 0.0
    scores["social_isolation"] = 0.6 if "social_connectedness" in themes else 0.0
    return scores




@dataclass
class WellbeingObservation:
    victim_token: str
    source: str  # "text" | "voice" | "checkin_form"
    intrusion: float = 0.0
    avoidance: float = 0.0
    hyperarousal: float = 0.0
    negative_mood: float = 0.0
    sleep_disturbance: float = 0.0
    social_isolation: float = 0.0
    daily_functioning: Optional[float] = None  # F12 - needs check-in form input, not text-derivable alone
    perceived_safety: float = 0.0
    confidence: float = 0.0
    contributing_themes: list[str] = field(default_factory=list)

    def to_dict(self) -> dict:
        return {
            "victimToken": self.victim_token,
            "source": self.source,
            "intrusion": self.intrusion,
            "avoidance": self.avoidance,
            "hyperarousal": self.hyperarousal,
            "negativeMood": self.negative_mood,
            "sleepDisturbance": self.sleep_disturbance,
            "socialIsolation": self.social_isolation,
            "dailyFunctioning": self.daily_functioning,
            "perceivedSafety": self.perceived_safety,
            "confidence": self.confidence,
            "contributingThemes": self.contributing_themes,
        }


def build_wellbeing_observation(victim_token: str, signal: TextSignal, source: str = "text") -> WellbeingObservation:
    scores = score_constructs(signal)
    # confidence tracks how much lexical evidence we actually found, not
    # how "certain" we are of a clinical state - low text length or no
    # theme hits should not pretend to be a confident signal.
    evidence_hits = len(signal.themes)
    confidence = min(1.0, 0.25 + 0.15 * evidence_hits) if evidence_hits else 0.1
    return WellbeingObservation(
        victim_token=victim_token,
        source=source,
        intrusion=scores["intrusion"],
        avoidance=scores["avoidance"],
        hyperarousal=scores["hyperarousal"],
        negative_mood=scores["negative_mood"],
        sleep_disturbance=scores["sleep_disturbance"],
        social_isolation=scores["social_isolation"],
        perceived_safety=scores["perceived_safety"],
        confidence=round(confidence, 3),
        contributing_themes=signal.themes,
    )


# ------------------------------------------------------------------
# G09-G13 - STANDARD INSTRUMENT ITEM MAPPING (documentation only)
# ------------------------------------------------------------------
# IMPORTANT: this mapping exists so a future clinician-reviewed screening
# flow can reuse construct scores as a starting point. It must NEVER be
# surfaced to a user as a score, a diagnosis, or "you scored X on PCL-5" -
# that would be an unlicensed clinical claim. It documents which construct
# roughly corresponds to which validated-instrument concept, nothing more.

INSTRUMENT_CONSTRUCT_MAP = {
    "PC-PTSD-5": ["intrusion", "avoidance", "hyperarousal", "negative_mood"],
    "PCL-5": ["intrusion", "avoidance", "negative_mood", "hyperarousal"],
    "IES-R": ["intrusion", "avoidance", "hyperarousal"],
    "PHQ-9": ["negative_mood", "sleep_disturbance", "daily_functioning"],
    "GAD-7": ["hyperarousal", "perceived_safety"],
}
# Screening support only - never presented as a diagnostic score (G09-G13
# acceptance criteria: "mapping documented for future use").


# ------------------------------------------------------------------
# PUBLIC ENTRYPOINT
# ------------------------------------------------------------------

def build_construct_signal(victim_token: str, text: str, source: str = "text") -> dict:
    from text_signals import build_text_signal
    signal = build_text_signal(text)
    observation = build_wellbeing_observation(victim_token, signal, source)
    return {
        "textSignal": signal.to_dict(),
        "wellbeingObservation": observation.to_dict(),
    }