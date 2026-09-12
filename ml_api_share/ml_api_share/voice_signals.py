"""
VOICE SIGNALS PIPELINE  (F16-F22)
===================================
Turns an uploaded voice check-in into structured signals, mirroring how
text_signals.py handles text. Two-tier design:

  - Transcription (F16) prefers a local Whisper model if transformers/torch
    are available; the backend's primary path is actually Groq Whisper
    (see saath-backend/src/services/ml.ts::analyzeVoice) - this module's
    transcribe_audio() is the fallback/offline option, and the
    acoustic/prosodic analysis here runs regardless of which transcript
    source was used, since it only needs the raw audio.
  - Acoustic feature extraction (F17-F20) uses plain numpy/scipy signal
    processing (RMS envelope, autocorrelation pitch estimate) so it never
    depends on a model download - it always works, online or offline.

  F16 - speech-to-text pipeline
  F17 - speaking pace feature
  F18 - pause duration feature
  F19 - pause frequency feature
  F20 - prosodic/acoustic feature extraction
  F21 - voice feature aggregation
  F22 - voice-processing confidence score
"""

from __future__ import annotations

import io
from dataclasses import dataclass, field
from functools import lru_cache
from typing import Optional

import numpy as np

# ------------------------------------------------------------------
# AUDIO LOADING
# ------------------------------------------------------------------

def _load_audio(audio_bytes: bytes) -> tuple[np.ndarray, int]:
    """Returns (mono_samples, sample_rate). Raises ValueError on unreadable audio."""
    import soundfile as sf
    try:
        samples, sample_rate = sf.read(io.BytesIO(audio_bytes), dtype="float32", always_2d=False)
    except Exception as error:
        raise ValueError(f"Could not decode audio: {error}") from error
    if samples.ndim > 1:
        samples = samples.mean(axis=1)  # downmix to mono
    return samples, sample_rate


# ------------------------------------------------------------------
# F16 - SPEECH-TO-TEXT  (local fallback; Groq Whisper is the primary
# path on the backend, see module docstring above)
# ------------------------------------------------------------------

@lru_cache(maxsize=1)
def _get_asr_pipeline():
    try:
        from transformers import pipeline  # type: ignore
        return pipeline("automatic-speech-recognition", model="openai/whisper-tiny")
    except Exception:
        return None


def transcribe_audio(audio_bytes: bytes) -> dict:
    """Returns {transcript: str|None, source: str}. None transcript means
    the caller should fall back to an external STT provider (Groq) rather
    than presenting a blank/failed transcript to the user."""
    pipe = _get_asr_pipeline()
    if pipe is None:
        return {"transcript": None, "source": "unavailable_local_model"}
    try:
        samples, sample_rate = _load_audio(audio_bytes)
        result = pipe({"array": samples, "sampling_rate": sample_rate})
        return {"transcript": result.get("text", "").strip() or None, "source": "local-whisper-tiny"}
    except Exception:
        return {"transcript": None, "source": "transcription_failed"}


# ------------------------------------------------------------------
# SHARED SIGNAL PROCESSING - RMS ENVELOPE + VOICED/SILENT FRAMES
# ------------------------------------------------------------------

_FRAME_MS = 20  # analysis frame size


def _rms_envelope(samples: np.ndarray, sample_rate: int) -> tuple[np.ndarray, int]:
    frame_len = max(1, int(sample_rate * _FRAME_MS / 1000))
    n_frames = max(1, len(samples) // frame_len)
    trimmed = samples[: n_frames * frame_len]
    frames = trimmed.reshape(n_frames, frame_len)
    rms = np.sqrt(np.mean(frames.astype(np.float64) ** 2, axis=1) + 1e-12)
    return rms, frame_len


def _voiced_mask(rms: np.ndarray) -> np.ndarray:
    """A frame is 'voiced' (speech present) if its energy is above a small
    fraction of the loudest frame in the clip - adaptive per-clip rather
    than a fixed absolute threshold, since recording volume varies a lot
    between devices."""
    if rms.max() <= 1e-8:
        return np.zeros_like(rms, dtype=bool)
    threshold = 0.08 * rms.max()
    return rms > threshold


# ------------------------------------------------------------------
# F18 - PAUSE DURATION   /   F19 - PAUSE FREQUENCY
# ------------------------------------------------------------------

def _pause_stats(voiced: np.ndarray, frame_len: int, sample_rate: int) -> dict:
    frame_seconds = frame_len / sample_rate
    min_pause_frames = max(1, int(0.25 / frame_seconds))  # ignore gaps < 250ms (not a real pause)

    pause_lengths: list[float] = []
    run = 0
    for is_voiced in voiced:
        if not is_voiced:
            run += 1
        else:
            if run >= min_pause_frames:
                pause_lengths.append(run * frame_seconds)
            run = 0
    if run >= min_pause_frames:
        pause_lengths.append(run * frame_seconds)

    total_seconds = len(voiced) * frame_seconds
    total_minutes = max(total_seconds / 60, 1e-6)

    return {
        "pause_count": len(pause_lengths),
        "avg_pause_duration_sec": round(float(np.mean(pause_lengths)), 3) if pause_lengths else 0.0,
        "pause_frequency_per_min": round(len(pause_lengths) / total_minutes, 2),
    }


# ------------------------------------------------------------------
# F17 - SPEAKING PACE
# ------------------------------------------------------------------

def _speaking_pace(word_count: Optional[int], voiced_seconds: float) -> Optional[float]:
    """Words per minute of actual VOICED time (excludes pauses), which is
    a more meaningful pace signal than words-per-minute-of-total-clip."""
    if word_count is None or voiced_seconds <= 0:
        return None
    return round(word_count / (voiced_seconds / 60), 1)


# ------------------------------------------------------------------
# F20 - PROSODIC / ACOUSTIC FEATURES (pitch via autocorrelation, energy)
# ------------------------------------------------------------------

def _estimate_pitch(frame: np.ndarray, sample_rate: int, fmin: int = 75, fmax: int = 400) -> Optional[float]:
    """Simple autocorrelation pitch estimate for one frame. Good enough to
    capture RELATIVE pitch variability across a clip without needing a
    trained pitch-tracking model."""
    frame = frame - frame.mean()
    if np.allclose(frame, 0):
        return None
    corr = np.correlate(frame, frame, mode="full")[len(frame) - 1:]
    min_lag = int(sample_rate / fmax)
    max_lag = int(sample_rate / fmin)
    if max_lag >= len(corr) or min_lag >= max_lag:
        return None
    segment = corr[min_lag:max_lag]
    if segment.size == 0 or segment.max() <= 0:
        return None
    peak_lag = min_lag + int(np.argmax(segment))
    if peak_lag == 0:
        return None
    return sample_rate / peak_lag


def _prosodic_features(samples: np.ndarray, sample_rate: int, voiced: np.ndarray, frame_len: int) -> dict:
    # Use a slightly wider window for pitch estimation than the pause
    # detection frame, since autocorrelation needs enough samples to
    # resolve low pitches reliably.
    pitch_window = max(frame_len * 2, int(sample_rate * 0.04))
    pitches: list[float] = []
    for i, is_voiced in enumerate(voiced):
        if not is_voiced:
            continue
        start = i * frame_len
        end = min(start + pitch_window, len(samples))
        if end - start < pitch_window // 2:
            continue
        pitch = _estimate_pitch(samples[start:end], sample_rate)
        if pitch is not None:
            pitches.append(pitch)

    rms_all = np.sqrt(np.mean(samples.astype(np.float64) ** 2) + 1e-12)

    return {
        "pitch_mean_hz": round(float(np.mean(pitches)), 1) if pitches else None,
        "pitch_variance": round(float(np.var(pitches)), 2) if len(pitches) > 1 else None,
        "energy_rms": round(float(rms_all), 4),
    }


# ------------------------------------------------------------------
# F22 - VOICE-PROCESSING CONFIDENCE SCORE
# ------------------------------------------------------------------

def _processing_confidence(voiced_ratio: float, duration_sec: float, transcript: Optional[str]) -> float:
    """Low confidence for very short clips, mostly-silent clips, or a
    missing transcript - all situations where the extracted features are
    unreliable even though the code ran without errors."""
    if duration_sec < 2:
        return 0.1
    confidence = 0.4
    confidence += min(0.3, voiced_ratio * 0.4)
    confidence += 0.2 if transcript else 0.0
    confidence += min(0.1, duration_sec / 300)  # slightly more confidence for longer clips, caps quickly
    return round(min(1.0, confidence), 3)


# ------------------------------------------------------------------
# F21 - AGGREGATION + PUBLIC ENTRYPOINT
# ------------------------------------------------------------------

@dataclass
class VoiceSignal:
    transcript: Optional[str]
    transcript_source: str
    duration_sec: float
    voiced_ratio: float
    speaking_pace_wpm: Optional[float]
    pause_count: int
    avg_pause_duration_sec: float
    pause_frequency_per_min: float
    pitch_mean_hz: Optional[float]
    pitch_variance: Optional[float]
    energy_rms: float
    confidence: float

    def to_dict(self) -> dict:
        return {
            "transcript": self.transcript,
            "transcriptSource": self.transcript_source,
            "durationSec": round(self.duration_sec, 2),
            "voicedRatio": round(self.voiced_ratio, 3),
            "speakingPaceWpm": self.speaking_pace_wpm,
            "pauseCount": self.pause_count,
            "avgPauseDurationSec": self.avg_pause_duration_sec,
            "pauseFrequencyPerMin": self.pause_frequency_per_min,
            "pitchMeanHz": self.pitch_mean_hz,
            "pitchVariance": self.pitch_variance,
            "energyRms": self.energy_rms,
            "confidence": self.confidence,
        }


def build_voice_signal(audio_bytes: bytes, external_transcript: Optional[str] = None) -> VoiceSignal:
    """F21 entrypoint. Pass `external_transcript` when the caller already
    has one from Groq Whisper (the primary backend path) - this function
    will use it for pace calculation instead of trying local STT again."""
    samples, sample_rate = _load_audio(audio_bytes)
    duration_sec = len(samples) / sample_rate if sample_rate else 0.0

    rms, frame_len = _rms_envelope(samples, sample_rate)
    voiced = _voiced_mask(rms)
    voiced_ratio = float(voiced.mean()) if len(voiced) else 0.0

    pause_stats = _pause_stats(voiced, frame_len, sample_rate)
    prosodic = _prosodic_features(samples, sample_rate, voiced, frame_len)

    if external_transcript is not None:
        transcript, transcript_source = external_transcript, "external"
    else:
        stt = transcribe_audio(audio_bytes)
        transcript, transcript_source = stt["transcript"], stt["source"]

    word_count = len(transcript.split()) if transcript else None
    voiced_seconds = voiced_ratio * duration_sec
    pace = _speaking_pace(word_count, voiced_seconds)

    confidence = _processing_confidence(voiced_ratio, duration_sec, transcript)

    return VoiceSignal(
        transcript=transcript,
        transcript_source=transcript_source,
        duration_sec=duration_sec,
        voiced_ratio=voiced_ratio,
        speaking_pace_wpm=pace,
        pause_count=pause_stats["pause_count"],
        avg_pause_duration_sec=pause_stats["avg_pause_duration_sec"],
        pause_frequency_per_min=pause_stats["pause_frequency_per_min"],
        pitch_mean_hz=prosodic["pitch_mean_hz"],
        pitch_variance=prosodic["pitch_variance"],
        energy_rms=prosodic["energy_rms"],
        confidence=confidence,
    )