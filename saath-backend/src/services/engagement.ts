/**
 * F26 — Check-in completion tracking
 * F28 — Follow-up response tracking
 * -----------------------------------------------------------------------
 * These are lightweight, append-only "engagement_signals" — separate from
 * the wellbeing content itself (mood, text, voice). They only record
 * *that* an engagement event happened (a check-in was completed, a
 * follow-up got a response), never distress content. This keeps the
 * engagement-trend computation (F29) and missing-evidence handling (F30)
 * decoupled from the ML/distress pipeline, per the acceptance criteria:
 * "Missing engagement flagged as insufficient evidence, not distress."
 */

export type EngagementEventType =
  | 'checkin_completed'
  | 'checkin_missed'
  | 'intervention_completed'
  | 'followup_response';

export interface EngagementSignal {
  id: string;
  userId: string;
  victimToken?: string;
  eventType: EngagementEventType;
  channel?: 'mood' | 'text' | 'voice' | 'ivrs' | 'sms' | 'quick_mood';
  followUpId?: string;
  responded?: boolean;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

type RecordFn = (key: string, value: unknown) => unknown;

/**
 * Records a check-in completion engagement event (F26).
 * Called from every check-in route (mood/text/voice/ivrs/quick-mood) right
 * after the underlying observation is stored.
 */
export function trackCheckinCompletion(
  record: RecordFn,
  idFn: () => string,
  params: { userId: string; victimToken?: string; channel: EngagementSignal['channel'] }
): EngagementSignal {
  const signal: EngagementSignal = {
    id: idFn(),
    userId: params.userId,
    victimToken: params.victimToken,
    eventType: 'checkin_completed',
    channel: params.channel,
    createdAt: new Date().toISOString(),
  };
  record(`engagement:${params.userId}`, signal);
  record('engagement:all', signal);
  return signal;
}

/**
 * Records a follow-up response engagement event (F28).
 * Called when a survivor responds to (or is confirmed to have ignored) a
 * counsellor-created follow-up.
 */
export function trackFollowUpResponse(
  record: RecordFn,
  idFn: () => string,
  params: { userId: string; victimToken?: string; followUpId: string; responded: boolean; metadata?: Record<string, unknown> }
): EngagementSignal {
  const signal: EngagementSignal = {
    id: idFn(),
    userId: params.userId,
    victimToken: params.victimToken,
    eventType: 'followup_response',
    followUpId: params.followUpId,
    responded: params.responded,
    metadata: params.metadata,
    createdAt: new Date().toISOString(),
  };
  record(`engagement:${params.userId}`, signal);
  record('engagement:all', signal);
  return signal;
}

/**
 * F29 — Engagement trend computation.
 * Returns a simple completion ratio over the last `windowDays` days rather
 * than a raw distress-flavoured number, so it can be surfaced on its own
 * without being confused for a clinical signal.
 */
export function computeEngagementTrend(signals: EngagementSignal[], windowDays = 14) {
  const cutoff = Date.now() - windowDays * 24 * 60 * 60 * 1000;
  const recent = signals.filter((s) => new Date(s.createdAt).getTime() >= cutoff);
  const completed = recent.filter((s) => s.eventType === 'checkin_completed').length;
  const missed = recent.filter((s) => s.eventType === 'checkin_missed').length;
  const total = completed + missed;
  return {
    windowDays,
    checkinsCompleted: completed,
    checkinsMissed: missed,
    completionRate: total > 0 ? Number((completed / total).toFixed(2)) : null,
    insufficientEvidence: total === 0,
  };
}