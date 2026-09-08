import { z } from 'zod';
import { env } from '../config/env.js';
import { store } from '../db/store.js';
import type { CaseRecord } from '../types/domain.js';
import { predictEscalation } from './geminiEscalation.js';

export const escalationResultSchema = z.object({
  escalation_probability: z.number().min(0).max(100),
  risk_level: z.enum(['LOW', 'MODERATE', 'HIGH', 'CRITICAL']),
  confidence: z.number().min(0).max(1),
  time_horizon: z.literal('7 days'),
  contributing_factors: z.array(z.string()).min(1).max(5),
  early_warning_signals: z.array(z.string()),
  recommended_followup: z.string().min(1),
});

export type EscalationResult = z.infer<typeof escalationResultSchema>;
export type EscalationState =
  | { status: 'available'; result: EscalationResult; generatedAt: string }
  | { status: 'unavailable'; reason: 'not_configured' | 'invalid_response' | 'provider_error'; generatedAt: string };

const latestRecord = (records: any[]) => records.at(-1) as Record<string, any> | undefined;
const numeric = (value: unknown) => typeof value === 'number' && Number.isFinite(value) ? value : undefined;
const textSignal = (ml: any, key: string) => typeof ml?.signals?.[key] === 'string' || typeof ml?.signals?.[key] === 'number' ? ml.signals[key] : 'not_reported';
const scaleFiveToPercent = (value: unknown, inverse = false) => {
  if (typeof value !== 'number') return 'not_reported';
  const score = inverse ? 6 - value : value;
  return Math.round(((score - 1) / 4) * 100);
};

function findCase(victimToken?: string): CaseRecord | undefined {
  return victimToken ? store.cases.find((item) => item.victimToken === victimToken) : undefined;
}

function daysUntil(date: string | null | undefined): number | string {
  if (!date) return 'not_reported';
  const days = Math.ceil((new Date(date).getTime() - Date.now()) / 86_400_000);
  return Math.max(0, days);
}

export function buildEscalationInput(userId: string, victimToken: string | undefined, latestMl?: any): Record<string, unknown> {
  const records = store.records.get(`checkins:${userId}`) ?? [];
  const latest = latestRecord(records);
  const previous = records.length > 1 ? records[records.length - 2] as Record<string, any> : undefined;
  const caseRecord = findCase(victimToken);
  const recentCutoff = Date.now() - 7 * 86_400_000;
  const recentRecords = records.filter((record) => new Date(record.createdAt).getTime() >= recentCutoff);
  const currentDistress = numeric(latestMl?.distressScore) ?? numeric(latest?.ml?.distressScore);
  const previousDistress = numeric(previous?.ml?.distressScore);
  const sleep = latest?.sleep;
  const social = latest?.socialConnectedness;
  const fear = latest?.fear;
  const perceivedSafety = latest?.perceivedSafety;

  return {
    case_type: caseRecord?.caseCategory ?? 'not_reported',
    case_stage: caseRecord?.currentStage ?? 'not_reported',
    sentiment: textSignal(latestMl ?? latest?.ml, 'sentiment'),
    emotion: textSignal(latestMl ?? latest?.ml, 'emotion'),
    threat_indicator: typeof fear === 'number' || typeof perceivedSafety === 'number' ? {
      source: 'victim_reported_check_in',
      fear_scale_1_to_5: typeof fear === 'number' ? fear : 'not_reported',
      perceived_safety_scale_1_to_5: typeof perceivedSafety === 'number' ? perceivedSafety : 'not_reported',
      note: 'Fear and perceived safety are wellbeing signals; they are not direct verification of an external threat.',
    } : 'not_reported',
    // Case-context indicators only; these are not victim-reported psychological scores.
    court_stress: caseRecord ? caseRecord.adjournmentCount > 0 ? 'adjournments_recorded' : 'no_adjournments_recorded' : 'not_reported',
    financial_distress: caseRecord ? {
      source: 'case_compensation_status',
      compensation_status: caseRecord.compensationStatus,
      note: 'Case context only; compensation status is not a direct measure of financial distress.',
    } : 'not_reported',
    social_isolation: typeof social === 'number' ? scaleFiveToPercent(social, true) : 'not_reported',
    // No native engagement measure exists; expose recent interaction count as a labelled prototype proxy.
    engagement_score: { proxy: 'recent_check_in_count', window: '7 days', value: recentRecords.length },
    previous_distress_score: previousDistress ?? 'not_reported',
    distress_change: currentDistress !== undefined && previousDistress !== undefined ? currentDistress - previousDistress : 'not_reported',
    current_distress_score: currentDistress ?? 'not_reported',
    // Case-context count only; it is not a validated delay or stress score.
    court_delay: caseRecord ? { adjournment_count: caseRecord.adjournmentCount, hearing_count: caseRecord.hearingCount } : 'not_reported',
    family_conflict: textSignal(latestMl ?? latest?.ml, 'family_conflict'),
    days_until_hearing: daysUntil(caseRecord?.nextHearingDate),
    counselling_status: caseRecord?.counsellorAssigned ? 'assigned' : 'not_assigned',
    legal_aid_status: caseRecord?.legalAidStatus ?? 'not_reported',
    rehabilitation_status: caseRecord?.rehabilitationStatus ?? 'not_reported',
    // The product has no expected cadence, so missed check-ins cannot be inferred safely.
    missed_check_ins_last_7_days: 'not_reported',
    sleep_quality: typeof sleep === 'number' ? scaleFiveToPercent(sleep, true) : 'not_reported',
  };
}

function unavailable(reason: 'not_configured' | 'invalid_response' | 'provider_error'): EscalationState {
  return { status: 'unavailable', reason, generatedAt: new Date().toISOString() };
}

export async function generateEscalation(userId: string, victimToken: string | undefined, latestMl?: any): Promise<EscalationState> {
  if (!env.GEMINI_API_KEY) return unavailable('not_configured');
  try {
    const raw = await predictEscalation(buildEscalationInput(userId, victimToken, latestMl));
    if (typeof raw !== 'string' || !raw.trim()) throw new Error('Gemini returned no escalation result');
    const result = escalationResultSchema.parse(JSON.parse(raw));
    return { status: 'available', result, generatedAt: new Date().toISOString() };
  } catch (error) {
    return unavailable(error instanceof z.ZodError ? 'invalid_response' : 'provider_error');
  }
}

export function latestEscalation(userId: string): EscalationState | null {
  const record = latestRecord(store.records.get(`escalation:${userId}`) ?? []);
  return record?.escalation ?? null;
}

export function saveEscalation(userId: string, escalation: EscalationState) {
  const records = store.records.get(`escalation:${userId}`) ?? [];
  records.push({ escalation });
  store.records.set(`escalation:${userId}`, records);
}

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
  const candidateNextIndex = Math.min(lastIndex + 1, dayMatchedIndex, ESCALATION_LADDER.length - 1);
  const nextIndex = Math.max(lastIndex, candidateNextIndex);
  return ESCALATION_LADDER[nextIndex];
}
