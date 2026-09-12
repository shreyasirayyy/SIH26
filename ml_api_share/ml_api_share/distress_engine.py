"""
DISTRESS ENGINE  (I01-I15) + PRIORITY (I14-I15)
==================================================
The fusion layer: takes construct signals (Module 3) and their baseline
deviations (Module 4) and produces the single Dynamic Distress Score /
Recovery Score / escalation probability that the counsellor dashboard and
survivor home screen actually show.

  I01 - signal schema definition        -> FusionInput below
  I02 - signal normalization            -> _normalize()
  I03 - baseline retrieval step         -> caller's job (DB), this module
                                            just accepts the result
  I04 - baseline comparison step        -> consumes Module 4's DeviationResult
  I05 - multimodal fusion logic         -> fuse_signals()
  I06 - Dynamic Distress Score          -> DistressResult.distress_score
  I07 - Recovery Score                  -> DistressResult.recovery_score
  I08 - distress trajectory             -> compute_trajectory()
  I09 - recovery trajectory             -> compute_trajectory() (same fn, other series)
  I10 - escalation probability model    -> _escalation_probability()
  I11 - confidence/uncertainty          -> DistressResult.confidence
  I12 - contributing factors extraction -> DistressResult.contributing_factors
  I13 - explainability layer            -> DistressResult.explanation
  I14 - priority index computation      -> compute_priority()
  I15 - priority tiers P1-P4            -> PriorityTier
"""

from __future__ import annotations

import statistics
from dataclasses import dataclass, field
from enum import Enum
from typing import Optional

from baseline_engine import ConstructBaseline, DeviationResult, CONSTRUCTS

# ------------------------------------------------------------------
# I01 - SIGNAL SCHEMA
# ------------------------------------------------------------------

# How much each construct contributes to the overall distress score.
# Intrusion/hyperarousal weighted highest since they're the strongest
# trauma-response indicators; social_isolation lowest since it's the
# noisiest signal (many non-distress reasons for low social mentions).
CONSTRUCT_WEIGHTS: dict[str, float] = {
    "intrusion": 0.20,
    "hyperarousal": 0.20,
    "avoidance": 0.15,
    "negative_mood": 0.18,
    "perceived_safety": 0.15,
    "sleep_disturbance": 0.07,
    "social_isolation": 0.05,
}


@dataclass
class FusionInput:
    """I01 - what fuse_signals() needs for one case at one point in time."""
    victim_token: str
    construct_values: dict[str, float]              # from Module 3 (0..1 each)
    deviations: dict[str, DeviationResult]           # from Module 4, keyed by construct
    construct_confidence: float                      # from Module 3's observation.confidence
    baseline_confidence: float                        # average of Module 4 baselines' confidence
    crisis: bool = False                              # from Module 2 crisis_safety.screen_message


# ------------------------------------------------------------------
# I02 - SIGNAL NORMALIZATION
# ------------------------------------------------------------------

def _normalize(value: float) -> float:
    """Construct scores already come out of Module 3 in 0..1, but this
    exists as an explicit step so any future signal source (e.g. voice
    features with different scales) has one place to convert into the
    same 0..1 space before fusion."""
    return max(0.0, min(1.0, value))


# ------------------------------------------------------------------
# I05 - MULTIMODAL FUSION LOGIC   +   I06 - DISTRESS SCORE
# ------------------------------------------------------------------

@dataclass
class DistressResult:
    distress_score: int          # I06, 0-100
    recovery_score: int          # I07, 0-100
    confidence: float            # I11, 0-1
    escalation_probability: float  # I10, 0-1
    contributing_factors: list[dict]  # I12
    explanation: str             # I13
    crisis: bool

    def to_dict(self) -> dict:
        return {
            "distressScore": self.distress_score,
            "recoveryScore": self.recovery_score,
            "confidence": round(self.confidence, 3),
            "escalationProbability": round(self.escalation_probability, 3),
            "contributingFactors": self.contributing_factors,
            "explanation": self.explanation,
            "crisis": self.crisis,
        }


def fuse_signals(input: FusionInput) -> DistressResult:
    """I05. Combines weighted construct scores with how far each one has
    deviated from the person's own baseline - a construct that's elevated
    AND unusual for this person contributes more than one that's just
    elevated (some people's normal is naturally higher)."""

    weighted_sum = 0.0
    weight_total = 0.0
    per_construct_contribution: list[tuple[str, float]] = []

    for construct, raw_value in input.construct_values.items():
        weight = CONSTRUCT_WEIGHTS.get(construct, 0.0)
        if weight == 0.0:
            continue
        value = _normalize(raw_value)

        deviation = input.deviations.get(construct)
        # a value that's also an unusual deviation for this person gets
        # amplified up to 1.5x; a value in line with their normal range
        # is dampened slightly so it doesn't dominate the score.
        deviation_multiplier = 1.0
        if deviation is not None:
            if deviation.is_sudden_deviation and deviation.deviation > 0:
                deviation_multiplier = 1.5
            elif deviation.is_persistent_deviation and deviation.deviation > 0:
                deviation_multiplier = 1.35
            elif deviation.deviation <= 0:
                deviation_multiplier = 0.8

        contribution = value * weight * deviation_multiplier
        weighted_sum += contribution
        weight_total += weight
        per_construct_contribution.append((construct, contribution))

    fused_0_1 = (weighted_sum / weight_total) if weight_total else 0.0
    distress_score = round(min(100, max(0, fused_0_1 * 100)))

    # I07 - recovery score is deliberately NOT just (100 - distress): it
    # rewards being at/below baseline, not just "not currently distressed".
    below_baseline_bonus = sum(
        1 for d in input.deviations.values() if d.deviation < 0
    )
    recovery_base = 100 - distress_score
    recovery_score = round(min(100, recovery_base + below_baseline_bonus * 2))

    confidence = _fusion_confidence(input)  # I11
    escalation_probability = _escalation_probability(input, distress_score)  # I10
    contributing_factors = _top_contributing_factors(per_construct_contribution)  # I12
    explanation = _build_explanation(contributing_factors, input.crisis)  # I13

    return DistressResult(
        distress_score=distress_score,
        recovery_score=recovery_score,
        confidence=confidence,
        escalation_probability=escalation_probability,
        contributing_factors=contributing_factors,
        explanation=explanation,
        crisis=input.crisis,
    )


# ------------------------------------------------------------------
# I10 - ESCALATION PROBABILITY MODEL
# ------------------------------------------------------------------

def _escalation_probability(input: FusionInput, distress_score: int) -> float:
    """Rule-based probability estimate (not a trained classifier yet - see
    J13 on the ML task board for the future learned version). Crisis
    language forces near-certainty; sudden+persistent deviations stack."""
    if input.crisis:
        return 0.95

    prob = distress_score / 200  # baseline contribution, max 0.5 from score alone
    sudden_hits = sum(1 for d in input.deviations.values() if d.is_sudden_deviation)
    persistent_hits = sum(1 for d in input.deviations.values() if d.is_persistent_deviation)
    prob += min(0.3, sudden_hits * 0.1)
    prob += min(0.2, persistent_hits * 0.1)
    return round(min(1.0, prob), 3)


# ------------------------------------------------------------------
# I11 - CONFIDENCE / UNCERTAINTY ESTIMATION
# ------------------------------------------------------------------

def _fusion_confidence(input: FusionInput) -> float:
    """Confidence should reflect BOTH how much we trust the text-derived
    signal AND how well-established this person's baseline is - a score
    is only as trustworthy as its weakest input."""
    return round(min(input.construct_confidence, input.baseline_confidence), 3) \
        if input.baseline_confidence > 0 else round(input.construct_confidence * 0.5, 3)


# ------------------------------------------------------------------
# I12 - CONTRIBUTING FACTORS EXTRACTION
# ------------------------------------------------------------------

def _top_contributing_factors(contributions: list[tuple[str, float]], top_n: int = 3) -> list[dict]:
    ranked = sorted(contributions, key=lambda c: c[1], reverse=True)
    total = sum(c[1] for c in contributions) or 1.0
    return [
        {"factor": name, "weight": round(value / total, 3)}
        for name, value in ranked[:top_n]
        if value > 0
    ]


# ------------------------------------------------------------------
# I13 - EXPLAINABILITY LAYER
# ------------------------------------------------------------------

_FACTOR_LABELS = {
    "intrusion": "intrusive memories or flashbacks",
    "avoidance": "avoidance of reminders",
    "hyperarousal": "feeling on edge or hyperalert",
    "negative_mood": "low or negative mood",
    "perceived_safety": "reduced sense of safety",
    "sleep_disturbance": "sleep disruption",
    "social_isolation": "social withdrawal",
}


def _build_explanation(contributing_factors: list[dict], crisis: bool) -> str:
    if crisis:
        return "Explicit safety-related language was detected; this score reflects an urgent signal requiring human review."
    if not contributing_factors:
        return "No significant deviation from this person's usual signals was detected."
    labels = [_FACTOR_LABELS.get(f["factor"], f["factor"]) for f in contributing_factors]
    if len(labels) == 1:
        joined = labels[0]
    else:
        joined = ", ".join(labels[:-1]) + f" and {labels[-1]}"
    return f"Score is primarily driven by {joined}, relative to this person's own baseline."


# ------------------------------------------------------------------
# I08 / I09 - TRAJECTORY COMPUTATION (distress and recovery share logic;
# just pass the right series in)
# ------------------------------------------------------------------

def compute_trajectory(score_history: list[int]) -> dict:
    """Returns a simple trend summary for a score series (distress OR
    recovery - caller decides which). Used to render the trend chart's
    headline ('rising', 'falling', 'flat') without re-deriving it client-side."""
    if len(score_history) < 2:
        return {"direction": "insufficient_data", "delta": 0, "series": score_history}
    delta = score_history[-1] - score_history[0]
    if delta > 5:
        direction = "rising"
    elif delta < -5:
        direction = "falling"
    else:
        direction = "flat"
    return {"direction": direction, "delta": delta, "series": score_history}


# ------------------------------------------------------------------
# I14 - PRIORITY INDEX COMPUTATION   /   I15 - PRIORITY TIERS P1-P4
# ------------------------------------------------------------------

class PriorityTier(str, Enum):
    P1 = "P1"  # most urgent
    P2 = "P2"
    P3 = "P3"
    P4 = "P4"  # least urgent


@dataclass
class PriorityResult:
    tier: PriorityTier
    priority_index: float  # 0-100, for sorting within a tier
    reason: str

    def to_dict(self) -> dict:
        return {"tier": self.tier.value, "priorityIndex": round(self.priority_index, 2), "reason": self.reason}


def compute_priority(distress: DistressResult) -> PriorityResult:
    """I14/I15. Crisis always wins regardless of numeric score - a
    confirmed self-harm/danger signal is never allowed to be outranked by
    an unrelated high distress score, matching E16 (no autonomous
    downgrade of a safety signal)."""
    index = distress.distress_score * 0.6 + distress.escalation_probability * 100 * 0.4

    if distress.crisis:
        return PriorityResult(PriorityTier.P1, 100.0, "Crisis language detected - immediate review required")
    if distress.escalation_probability >= 0.7 or distress.distress_score >= 80:
        return PriorityResult(PriorityTier.P1, index, "High distress score or high escalation probability")
    if distress.distress_score >= 60 or distress.escalation_probability >= 0.45:
        return PriorityResult(PriorityTier.P2, index, "Elevated distress score")
    if distress.distress_score >= 35:
        return PriorityResult(PriorityTier.P3, index, "Mild deviation from baseline")
    return PriorityResult(PriorityTier.P4, index, "Within normal range")
