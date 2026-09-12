

from __future__ import annotations

import re
from dataclasses import dataclass, field
from functools import lru_cache
from typing import Optional

# ------------------------------------------------------------------
# F01 - PREPROCESSING
# ------------------------------------------------------------------

_WHITESPACE_RE = re.compile(r"\s+")
_URL_RE = re.compile(r"https?://\S+")
_FIRST_PERSON_RE = re.compile(r"\b(i|me|my|mine|myself)\b", re.IGNORECASE)
_EXCLAIM_RE = re.compile(r"!")
_QUESTION_RE = re.compile(r"\?")


def preprocess(text: str) -> str:
    """Normalize whitespace, strip URLs, keep punctuation (it carries signal)."""
    cleaned = _URL_RE.sub(" ", text)
    cleaned = _WHITESPACE_RE.sub(" ", cleaned).strip()
    return cleaned


# ------------------------------------------------------------------
# F02 - SENTIMENT  (+ F03 - EMOTION)
# ------------------------------------------------------------------

# Small, well-known models. Swapped for a lexicon fallback if unavailable.
_SENTIMENT_MODEL_NAME = "distilbert-base-uncased-finetuned-sst-2-english"
_EMOTION_MODEL_NAME = "j-hartmann/emotion-english-distilroberta-base"

_POSITIVE_WORDS = {
    "good", "better", "okay", "fine", "hope", "hopeful", "calm", "safe",
    "grateful", "relieved", "happy", "peace", "peaceful", "supported",
    "strong", "proud", "improving", "managed", "coping",
}
_NEGATIVE_WORDS = {
    "bad", "worse", "scared", "afraid", "fear", "anxious", "anxiety",
    "panic", "hopeless", "alone", "lonely", "tired", "exhausted", "numb",
    "angry", "ashamed", "guilty", "worthless", "unsafe", "threat",
    "threatened", "crying", "cry", "hurt", "pain", "sad", "sleepless",
    "nightmare", "nightmares", "flashback", "flashbacks",
}


@lru_cache(maxsize=1)
def _get_sentiment_pipeline():
    try:
        from transformers import pipeline  # type: ignore
        return pipeline("sentiment-analysis", model=_SENTIMENT_MODEL_NAME)
    except Exception:
        return None


@lru_cache(maxsize=1)
def _get_emotion_pipeline():
    try:
        from transformers import pipeline  # type: ignore
        return pipeline(
            "text-classification",
            model=_EMOTION_MODEL_NAME,
            top_k=None,
        )
    except Exception:
        return None


def _lexicon_sentiment(text: str) -> tuple[float, float]:
    """Fallback sentiment: returns (score in [-1,1], confidence in [0,1])."""
    tokens = re.findall(r"[a-zA-Z']+", text.lower())
    if not tokens:
        return 0.0, 0.0
    pos = sum(1 for t in tokens if t in _POSITIVE_WORDS)
    neg = sum(1 for t in tokens if t in _NEGATIVE_WORDS)
    hits = pos + neg
    if hits == 0:
        return 0.0, 0.15  # low confidence, neutral
    score = (pos - neg) / hits
    confidence = min(1.0, 0.3 + 0.1 * hits)
    return score, confidence


def analyze_sentiment(text: str) -> dict:
    """Returns {score: -1..1 (negative..positive), confidence: 0..1, source: str}"""
    pipe = _get_sentiment_pipeline()
    if pipe is not None:
        try:
            result = pipe(text[:512])[0]
            label = result["label"].upper()
            conf = float(result["score"])
            score = conf if label == "POSITIVE" else -conf
            return {"score": round(score, 3), "confidence": round(conf, 3), "source": "model"}
        except Exception:
            pass
    score, confidence = _lexicon_sentiment(text)
    return {"score": round(score, 3), "confidence": round(confidence, 3), "source": "lexicon-fallback"}


_EMOTION_LEXICON = {
    "fear": {"scared", "afraid", "fear", "terrified", "panic", "anxious", "anxiety", "threat", "threatened"},
    "sadness": {"sad", "cry", "crying", "hopeless", "lonely", "alone", "numb", "empty", "worthless"},
    "anger": {"angry", "furious", "rage", "hate", "resent"},
    "joy": {"happy", "hopeful", "calm", "peaceful", "grateful", "relieved", "proud"},
    "disgust": {"disgusted", "ashamed", "guilty", "dirty"},
    "surprise": {"shocked", "surprised", "startled"},
}


def analyze_emotion(text: str) -> dict:
    """Returns {label: str, confidence: 0..1, source: str}"""
    pipe = _get_emotion_pipeline()
    if pipe is not None:
        try:
            scores = pipe(text[:512])[0]
            top = max(scores, key=lambda x: x["score"])
            return {"label": top["label"], "confidence": round(float(top["score"]), 3), "source": "model"}
        except Exception:
            pass
    tokens = set(re.findall(r"[a-zA-Z']+", text.lower()))
    best_label, best_hits = "neutral", 0
    for label, words in _EMOTION_LEXICON.items():
        hits = len(tokens & words)
        if hits > best_hits:
            best_label, best_hits = label, hits
    confidence = 0.0 if best_hits == 0 else min(1.0, 0.3 + 0.15 * best_hits)
    return {"label": best_label, "confidence": round(confidence, 3), "source": "lexicon-fallback"}


# ------------------------------------------------------------------
# F04 - LINGUISTIC FEATURES
# ------------------------------------------------------------------

def linguistic_features(text: str) -> dict:
    words = re.findall(r"[a-zA-Z']+", text)
    word_count = len(words)
    sentence_count = max(1, len(re.split(r"[.!?]+", text.strip())) - 1) or 1
    first_person_count = len(_FIRST_PERSON_RE.findall(text))
    return {
        "word_count": word_count,
        "sentence_count": sentence_count,
        "avg_sentence_length": round(word_count / sentence_count, 2) if sentence_count else 0.0,
        "first_person_ratio": round(first_person_count / word_count, 3) if word_count else 0.0,
        "exclamation_count": len(_EXCLAIM_RE.findall(text)),
        "question_count": len(_QUESTION_RE.findall(text)),
    }


# ------------------------------------------------------------------
# F05 - PSYCHOLOGICAL THEME EXTRACTION
# (feeds directly into F06-F09 construct signals in the next module)
# ------------------------------------------------------------------

_THEME_LEXICON = {
    "intrusion": {"flashback", "flashbacks", "nightmare", "nightmares", "reliving", "intrusive", "memories", "memory"},
    "avoidance": {"avoid", "avoiding", "avoided", "can't talk about", "don't want to think", "skip", "skipping"},
    "hyperarousal": {"jumpy", "startled", "on edge", "can't relax", "alert", "watching", "panic", "racing"},
    "negative_mood": {"hopeless", "worthless", "numb", "guilty", "ashamed", "blame", "blaming"},
    "sleep": {"insomnia", "sleepless", "can't sleep", "tired", "exhausted", "nightmares"},
    "social_connectedness": {"alone", "lonely", "isolated", "withdrawn", "friends", "family", "support"},
    "safety": {"unsafe", "threat", "threatened", "danger", "scared", "afraid"},
}


def extract_themes(text: str) -> list[str]:
    lowered = text.lower()
    tokens = set(re.findall(r"[a-zA-Z']+", lowered))
    themes = []
    for theme, words in _THEME_LEXICON.items():
        for w in words:
            if " " in w:
                if w in lowered:
                    themes.append(theme)
                    break
            elif w in tokens:
                themes.append(theme)
                break
    return themes


# ------------------------------------------------------------------
# PUBLIC ENTRYPOINT - combines F01-F05 into one text_signal record
# ------------------------------------------------------------------

@dataclass
class TextSignal:
    raw_text: str
    cleaned_text: str
    sentiment: dict
    emotion: dict
    linguistic: dict
    themes: list[str] = field(default_factory=list)

    def to_dict(self) -> dict:
        return {
            "cleanedText": self.cleaned_text,
            "sentiment": self.sentiment,
            "emotion": self.emotion,
            "linguisticFeatures": self.linguistic,
            "themes": self.themes,
        }


def build_text_signal(text: str) -> TextSignal:
    cleaned = preprocess(text)
    return TextSignal(
        raw_text=text,
        cleaned_text=cleaned,
        sentiment=analyze_sentiment(cleaned),
        emotion=analyze_emotion(cleaned),
        linguistic=linguistic_features(cleaned),
        themes=extract_themes(cleaned),
    )