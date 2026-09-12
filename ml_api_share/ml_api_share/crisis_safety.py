

from __future__ import annotations

import re
from dataclasses import dataclass
from enum import Enum


# ------------------------------------------------------------------
# N01 - IMMEDIATE DANGER   /   N02 - SELF-HARM SIGNAL DETECTION
# ------------------------------------------------------------------

class CrisisLevel(str, Enum):
    NONE = "none"
    SELF_HARM = "self_harm"          # N02
    IMMEDIATE_DANGER = "immediate_danger"  # N01 - highest severity


# Keep these as separate tiers: immediate-danger phrases get the strongest
# response and the fastest escalation SLA on the backend.
_IMMEDIATE_DANGER_PATTERNS = [
    r"\bkill(?:ing)? myself\b",
    r"\bend my life\b",
    r"\btake my own life\b",
    r"\bwant to die\b",
    r"\bbetter off dead\b",
    r"\bdon'?t want to (?:live|be alive)\b",
    r"\bcan'?t (?:stay|keep myself) safe\b",
    r"\bgoing to hurt myself\b",
    r"\bplan(?:ning)? to (?:kill|hurt) myself\b",
    r"\bhave (?:a gun|pills|a weapon) (?:ready|with me)\b",
]

_SELF_HARM_PATTERNS = [
    r"\bself[- ]?harm\b",
    r"\bhurt(?:ing)? myself\b",
    r"\bcut(?:ting)? myself\b",
    r"\boverdose\b",
    r"\bstarv(?:e|ing) myself\b",
]

_IMMEDIATE_DANGER_RE = re.compile("|".join(_IMMEDIATE_DANGER_PATTERNS), re.IGNORECASE)
_SELF_HARM_RE = re.compile("|".join(_SELF_HARM_PATTERNS), re.IGNORECASE)


def detect_crisis(text: str) -> CrisisLevel:
    """Rule-based, deterministic. Order matters: check highest severity first."""
    if _IMMEDIATE_DANGER_RE.search(text):
        return CrisisLevel.IMMEDIATE_DANGER
    if _SELF_HARM_RE.search(text):
        return CrisisLevel.SELF_HARM
    return CrisisLevel.NONE


# ------------------------------------------------------------------
# N04 / E11 - APPROVED SUPPORTIVE RESPONSES (never AI-generated)
# ------------------------------------------------------------------

# These strings are the ONLY text ever shown to a user in a crisis state.
# Any change to this copy should go through the same review as clinical
# content, not a normal code review.
_APPROVED_RESPONSES: dict[CrisisLevel, dict] = {
    CrisisLevel.IMMEDIATE_DANGER: {
        "message": (
            "I'm really glad you told me. Your safety matters right now more than "
            "anything else. If you are in immediate danger, please contact your "
            "local emergency number or go to your nearest hospital right now. "
            "A counsellor from your Safe Circle has also been alerted and will "
            "reach out to you."
        ),
        "action": "immediate_human_escalation",
        "suggested_action": "Immediate human support",
    },
    CrisisLevel.SELF_HARM: {
        "message": (
            "Thank you for trusting me with this. What you're feeling is real and "
            "you don't have to manage it alone. A counsellor has been notified and "
            "will check in with you soon. Would it help to try a grounding exercise "
            "together right now, or would you rather just talk?"
        ),
        "action": "human_review_requested",
        "suggested_action": "Notify counsellor + offer grounding exercise",
    },
}


@dataclass
class CrisisResponse:
    level: CrisisLevel
    message: str
    action: str
    suggested_action: str
    requires_human_review: bool  # E16 - always True for any non-NONE level

    def to_dict(self) -> dict:
        return {
            "crisisLevel": self.level.value,
            "message": self.message,
            "action": self.action,
            "suggestedAction": self.suggested_action,
            "requiresHumanReview": self.requires_human_review,
        }


def get_crisis_response(level: CrisisLevel) -> CrisisResponse | None:
    """N04/E11 entrypoint. Returns None if level is NONE (no interruption needed)."""
    if level == CrisisLevel.NONE:
        return None
    preset = _APPROVED_RESPONSES[level]
    return CrisisResponse(
        level=level,
        message=preset["message"],
        action=preset["action"],
        suggested_action=preset["suggested_action"],
        requires_human_review=True,  # E16: crisis states never auto-resolve
    )


# ------------------------------------------------------------------
# E14 - PROMPT SAFETY GUARDRAILS  (what we send TO the LLM)
# ------------------------------------------------------------------

TAARA_SYSTEM_PROMPT = (
    "You are TAARA, a gentle supportive guide inside a trauma-informed wellbeing app. "
    "You are NOT a clinician, doctor, or therapist, and must never claim to be one. "
    "Rules you must always follow:\n"
    "1. Never diagnose, name a mental health condition, or suggest one.\n"
    "2. Never promise legal, medical, or case outcomes.\n"
    "3. Never make an autonomous decision about a person's risk or safety - "
    "always defer to human counsellors for anything beyond gentle conversation.\n"
    "4. Never invent facts about the user's case, history, or diagnosis that "
    "were not explicitly provided to you.\n"
    "5. Keep replies short (2-4 sentences), warm, and offer at most one small "
    "optional next step - never a checklist or clinical plan.\n"
    "Reply only with the requested JSON."
)


def build_safe_prompt(user_message: str, language: str = "en") -> str:
    """Wraps raw user input before it reaches the LLM. Keeps it short so a
    long/adversarial message can't push the system prompt out of context,
    and strips characters commonly used for prompt-injection framing."""
    sanitized = re.sub(r"[\r\n]{3,}", "\n\n", user_message.strip())[:2000]
    sanitized = re.sub(r"(system\s*:|ignore (all|previous) instructions)", "[filtered]", sanitized, flags=re.IGNORECASE)
    return sanitized


# ------------------------------------------------------------------
# E15 - NO DIAGNOSIS LABELS   /   E17 - HALLUCINATION SAFEGUARDS
# ------------------------------------------------------------------

# Any of these appearing in an LLM's output means the guardrail failed
# upstream and the reply must be swapped for a safe fallback rather than
# shown to the user.
_DIAGNOSIS_TERMS = [
    "ptsd", "post-traumatic stress disorder", "depression", "clinical depression",
    "anxiety disorder", "bipolar", "you have", "you are suffering from",
    "diagnosis", "diagnosed with", "disorder",
]

_CLINICAL_CLAIM_PATTERNS = [
    r"\byou will (?:definitely|certainly) (?:recover|heal|be fine)\b",
    r"\bI (?:am|'m) a (?:doctor|therapist|clinician|psychologist)\b",
    r"\byour case will\b",  # legal outcome promises
]

_SAFE_FALLBACK_REPLY = {
    "reply": "I'm here with you. How are you feeling right now?",
    "suggestedAction": "Continue the conversation",
}


def validate_ai_reply(reply_text: str) -> dict:
    """E15/E17 gate. Returns {safe: bool, reason: str|None}. Call this on
    every LLM output before it reaches the user - never trust it directly."""
    lowered = reply_text.lower()
    for term in _DIAGNOSIS_TERMS:
        if term in lowered:
            return {"safe": False, "reason": f"diagnosis_language:{term}"}
    for pattern in _CLINICAL_CLAIM_PATTERNS:
        if re.search(pattern, reply_text, re.IGNORECASE):
            return {"safe": False, "reason": "unsafe_clinical_claim"}
    if len(reply_text) > 1500:
        return {"safe": False, "reason": "reply_too_long"}
    return {"safe": True, "reason": None}


def sanitize_ai_reply(reply_text: str, suggested_action: str) -> dict:
    """Runs validation; swaps in the approved fallback if the AI output is
    unsafe rather than ever forwarding it to the user (E16: no autonomous
    clinical decisions - a failed check always defers to the safe default)."""
    check = validate_ai_reply(reply_text)
    if check["safe"]:
        return {"reply": reply_text, "suggestedAction": suggested_action, "flagged": False}
    return {**_SAFE_FALLBACK_REPLY, "flagged": True, "flagReason": check["reason"]}


# ------------------------------------------------------------------
# PUBLIC ENTRYPOINT - call this first, before any LLM call, on every
# incoming TAARA / check-in / text-analysis message.
# ------------------------------------------------------------------

def screen_message(text: str) -> dict:
    """Single entrypoint the backend should call before doing anything else
    with a user's text. If crisis is detected, the caller MUST show the
    returned message as-is and skip the normal AI reply path entirely."""
    level = detect_crisis(text)
    crisis_response = get_crisis_response(level)
    return {
        "crisisLevel": level.value,
        "crisisDetected": level != CrisisLevel.NONE,
        "response": crisis_response.to_dict() if crisis_response else None,
    }