/**
 * D16 — Gentle reminder escalation
 * -----------------------------------------------------------------------
 * Acceptance criteria: "Reminder tone escalates gently over N days."
 */

export type ReminderTone = 'light' | 'warm' | 'encouraging' | 'gentle-firm';

export interface EscalationStage {
  day: number;
  tone: ReminderTone;
  message: string;
}

const ESCALATION_LADDER: EscalationStage[] = [
  { day: 0, tone: 'light', message: "Just a gentle nudge to check in when you feel ready. We're here for you." },
  { day: 3, tone: 'warm', message: "Thinking of you. Whenever you're ready, a quick check-in can help you stay connected to your journey." },
  { day: 7, tone: 'encouraging', message: "It's been a week since we last heard from you — even a small check-in helps us support you better." },
  { day: 14, tone: 'gentle-firm', message: "We care about you. Please let us know you're okay when you can — support is always available, no pressure." },
];

export const getEscalatedMessage = (daysMissed: number): EscalationStage => {
  const matched = [...ESCALATION_LADDER].reverse().find((stage) => daysMissed >= stage.day);
  return matched ?? ESCALATION_LADDER[0];
};

export interface ReminderHistoryEntry {
  tone: ReminderTone;
  createdAt: string;
}

export function nextEscalationStage(daysMissed: number, history: ReminderHistoryEntry[]): EscalationStage {
  const dayMatched = getEscalatedMessage(daysMissed);
  const lastSent = history.at(-1);
  if (!lastSent) return ESCALATION_LADDER[0];

  const lastIndex = ESCALATION_LADDER.findIndex((s) => s.tone === lastSent.tone);
  const dayMatchedIndex = ESCALATION_LADDER.findIndex((s) => s.tone === dayMatched.tone);
  // Never step below the tone already sent — a later call with a smaller day count
  // (e.g. the survivor's cadence data got recalculated) must not regress the tone.
  const candidateNextIndex = Math.min(lastIndex + 1, dayMatchedIndex, ESCALATION_LADDER.length - 1);
  const nextIndex = Math.max(lastIndex, candidateNextIndex);
  return ESCALATION_LADDER[nextIndex];
}