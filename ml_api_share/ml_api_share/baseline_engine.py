"""
BASELINE ENGINE  (H01-H13)
===========================
Computes a per-person "normal range" for each construct (from Module 3)
and compares new observations against it. This is what lets the system say
"this is unusual FOR THIS PERSON" instead of comparing everyone to one
fixed threshold - important because baseline distress varies a lot person
to person.

  H01 - baseline initialization job
  H02 - minimum data requirement rule
  H03 - baseline calculation logic
  H04 - rolling baseline update
  H05 - personal normal range
  H06 - baseline confidence score
  H08 - baseline comparison function
  H09 - sudden deviation detection
  H10 - persistent deviation detection
  H11 - trend detection
  H12 - recovery trend detection
  H13 - baseline reset/adjustment logic

All functions here are pure (take history in, return values out) so the
backend can persist `baselines` rows however it wants (Supabase table per
the schema doc) without this module needing DB access itself.
"""

from __future__ import annotations

import statistics
from dataclasses import dataclass, field
from datetime import datetime, timedelta, timezone
from typing import Optional

CONSTRUCTS = [
    "intrusion", "avoidance", "hyperarousal", "negative_mood",
    "sleep_disturbance", "social_isolation", "perceived_safety",
]

# ------------------------------------------------------------------
# H02 - MINIMUM DATA REQUIREMENT RULE
# ------------------------------------------------------------------

MIN_OBSERVATIONS_FOR_BASELINE = 5  # need at least 5 check-ins before trusting a baseline
ROLLING_WINDOW_SIZE = 30           # baseline recalculated over the last 30 observations
SUDDEN_DEVIATION_Z = 1.5           # z-score threshold for a single-point spike
PERSISTENT_DEVIATION_COUNT = 3     # consecutive elevated points to call it "persistent"
TREND_MIN_POINTS = 4               # need at least this many points to fit a trend


@dataclass
class Observation:
    """One historical data point for a single construct."""
    timestamp: datetime
    value: float


@dataclass
class ConstructBaseline:
    construct: str
    mean: float
    std_dev: float
    range_low: float   # H05 - personal normal range
    range_high: float
    confidence: float  # H06
    sample_size: int
    computed_at: datetime

    def to_dict(self) -> dict:
        return {
            "construct": self.construct,
            "mean": round(self.mean, 3),
            "stdDev": round(self.std_dev, 3),
            "rangeLow": round(self.range_low, 3),
            "rangeHigh": round(self.range_high, 3),
            "confidence": round(self.confidence, 3),
            "sampleSize": self.sample_size,
            "computedAt": self.computed_at.isoformat(),
        }


# ------------------------------------------------------------------
# H01 / H03 / H04 - BASELINE CALCULATION (initial + rolling update
# use the same function; "rolling" just means calling this again with
# a newer window of observations)
# ------------------------------------------------------------------

def compute_baseline(construct: str, observations: list[Observation]) -> Optional[ConstructBaseline]:
    """H01/H03/H04. Returns None if there isn't enough data yet (H02)."""
    if len(observations) < MIN_OBSERVATIONS_FOR_BASELINE:
        return None

    window = sorted(observations, key=lambda o: o.timestamp)[-ROLLING_WINDOW_SIZE:]
    values = [o.value for o in window]
    mean = statistics.fmean(values)
    std_dev = statistics.pstdev(values) if len(values) > 1 else 0.0
    # a personal normal range that's too tight (near-zero std_dev) would
    # flag every tiny fluctuation as a deviation, so floor it slightly.
    effective_std = max(std_dev, 0.05)

    return ConstructBaseline(
        construct=construct,
        mean=mean,
        std_dev=std_dev,
        range_low=max(0.0, mean - effective_std),
        range_high=min(1.0, mean + effective_std),
        confidence=_baseline_confidence(len(window)),  # H06
        sample_size=len(window),
        computed_at=datetime.now(timezone.utc),
    )


def _baseline_confidence(sample_size: int) -> float:
    """H06 - more observations = more confidence, caps out at 1.0.
    Deliberately conservative: even a full window doesn't hit 1.0 unless
    it's well past the minimum, since real-world check-ins are noisy."""
    if sample_size < MIN_OBSERVATIONS_FOR_BASELINE:
        return 0.0
    return round(min(1.0, (sample_size - MIN_OBSERVATIONS_FOR_BASELINE + 1) / 15), 3)


def compute_all_baselines(history_by_construct: dict[str, list[Observation]]) -> dict[str, ConstructBaseline]:
    """H01 entrypoint - run once per case to (re)build every construct's baseline."""
    result = {}
    for construct in CONSTRUCTS:
        baseline = compute_baseline(construct, history_by_construct.get(construct, []))
        if baseline is not None:
            result[construct] = baseline
    return result


# ------------------------------------------------------------------
# H08 - BASELINE COMPARISON FUNCTION
# ------------------------------------------------------------------

@dataclass
class DeviationResult:
    construct: str
    current_value: float
    baseline_mean: float
    z_score: float
    deviation: float  # current - mean, signed
    is_sudden_deviation: bool   # H09
    is_persistent_deviation: bool  # H10 (caller must pass recent history)

    def to_dict(self) -> dict:
        return {
            "construct": self.construct,
            "currentValue": self.current_value,
            "baselineMean": round(self.baseline_mean, 3),
            "zScore": round(self.z_score, 3),
            "deviation": round(self.deviation, 3),
            "isSuddenDeviation": self.is_sudden_deviation,
            "isPersistentDeviation": self.is_persistent_deviation,
        }


def compare_to_baseline(
    construct: str,
    current_value: float,
    baseline: ConstructBaseline,
    recent_values: Optional[list[float]] = None,
) -> DeviationResult:
    """H08. `recent_values` should be the last PERSISTENT_DEVIATION_COUNT
    observations (most recent last) if you want H10 evaluated too."""
    effective_std = max(baseline.std_dev, 0.05)
    z_score = (current_value - baseline.mean) / effective_std
    is_sudden = abs(z_score) >= SUDDEN_DEVIATION_Z  # H09

    is_persistent = False  # H10
    if recent_values and len(recent_values) >= PERSISTENT_DEVIATION_COUNT:
        window = recent_values[-PERSISTENT_DEVIATION_COUNT:]
        is_persistent = all(
            abs((v - baseline.mean) / effective_std) >= 1.0 and
            (v - baseline.mean) * (current_value - baseline.mean) > 0  # same direction
            for v in window
        )

    return DeviationResult(
        construct=construct,
        current_value=current_value,
        baseline_mean=baseline.mean,
        z_score=z_score,
        deviation=current_value - baseline.mean,
        is_sudden_deviation=is_sudden,
        is_persistent_deviation=is_persistent,
    )


# ------------------------------------------------------------------
# H11 - TREND DETECTION   /   H12 - RECOVERY TREND DETECTION
# ------------------------------------------------------------------

TrendDirection = str  # "worsening" | "improving" | "stable" | "insufficient_data"


def _linear_slope(values: list[float]) -> float:
    """Simple least-squares slope over evenly-spaced points."""
    n = len(values)
    x_mean = (n - 1) / 2
    y_mean = statistics.fmean(values)
    numerator = sum((i - x_mean) * (v - y_mean) for i, v in enumerate(values))
    denominator = sum((i - x_mean) ** 2 for i in range(n)) or 1.0
    return numerator / denominator


def detect_trend(recent_values: list[float], baseline: ConstructBaseline) -> dict:
    """H11 - direction of movement for distress-leaning constructs (higher
    value = more distress, so a positive slope is 'worsening').
    H12 - reuses the same slope: negative slope while still above baseline
    reads as 'recovering', not just 'not currently worse'."""
    if len(recent_values) < TREND_MIN_POINTS:
        return {"direction": "insufficient_data", "slope": 0.0, "isRecovering": False}

    slope = _linear_slope(recent_values)
    flat_threshold = 0.02
    current = recent_values[-1]
    above_baseline = current > baseline.mean + max(baseline.std_dev, 0.05)

    if slope > flat_threshold:
        direction = "worsening"
    elif slope < -flat_threshold:
        direction = "improving"
    else:
        direction = "stable"

    is_recovering = direction == "improving" and above_baseline  # H12

    return {
        "direction": direction,
        "slope": round(slope, 4),
        "isRecovering": is_recovering,
    }


# ------------------------------------------------------------------
# H13 - BASELINE RESET / ADJUSTMENT LOGIC
# ------------------------------------------------------------------

BASELINE_RESET_STALENESS_DAYS = 90  # a baseline this old is treated as unreliable


def should_reset_baseline(baseline: ConstructBaseline, now: Optional[datetime] = None) -> dict:
    """H13. A baseline is reset (recomputed from scratch, discarding the
    old window) if either:
      - it's stale (no update in BASELINE_RESET_STALENESS_DAYS), or
      - a counsellor/admin explicitly requests it (handled by the caller;
        this function only covers the automatic staleness rule).
    Returns a reason string so the action is auditable."""
    now = now or datetime.now(timezone.utc)
    age = now - baseline.computed_at
    if age > timedelta(days=BASELINE_RESET_STALENESS_DAYS):
        return {"shouldReset": True, "reason": f"stale_baseline:{age.days}_days"}
    return {"shouldReset": False, "reason": None}