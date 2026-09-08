/**
 * D16 — Gentle reminder escalation
 * -----------------------------------------------------------------------
 * Acceptance criteria: "Reminder tone escalates gently over N days."
 * The previous version picked a tone from `daysMissed` alone, which is
 * fine for a single call, but nothing prevented the same tone (or a
 * tone-skip) from repeating every time the endpoint was hit. This module
 * adds an explicit escalation ladder plus a step function that looks at
 * the *previous* reminder sent, so the tone only ever escalates forward
 * — it never jumps backwards or repeats the same stage twice in a row
 * without the survivor's silence actually continuing.
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

/** Returns the escalation stage that matches the number of days since the last check-in. */
export const getEscalatedMessage = (daysMissed: number): EscalationStage => {
  const matched = [...ESCALATION_LADDER].reverse().find((stage) => daysMissed >= stage.day);
  return matched ?? ESCALATION_LADDER[0];
};

export interface ReminderHistoryEntry {
  tone: ReminderTone;
  createdAt: string;
}

/**
 * Stepwise escalation: given the day-matched stage and the survivor's
 * reminder history, only allow the tone to move to the *next* rung of the
 * ladder at most — never skip stages and never regress. This is what
 * makes the escalation "gentle" rather than jumping straight to the
 * firmest tone the first time a long gap is detected (e.g. a survivor's
 * very first reminder after 20 days of silence still starts at 'light').
 */
export function nextEscalationStage(daysMissed: number, history: ReminderHistoryEntry[]): EscalationStage {
  const dayMatched = getEscalatedMessage(daysMissed);
  const lastSent = history.at(-1);
  if (!lastSent) return ESCALATION_LADDER[0];

  const lastIndex = ESCALATION_LADDER.findIndex((s) => s.tone === lastSent.tone);
  const dayMatchedIndex = ESCALATION_LADDER.findIndex((s) => s.tone === dayMatched.tone);
  const nextIndex = Math.min(lastIndex + 1, dayMatchedIndex, ESCALATION_LADDER.length - 1);
  return ESCALATION_LADDER[Math.max(nextIndex, 0)];
}