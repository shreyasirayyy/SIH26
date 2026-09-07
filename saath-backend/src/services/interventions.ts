import { CaseRecord } from '../types/domain.js';
import type { MlResult } from './ml.js';

export interface InterventionRecommendation {
  type: string;
  label: string;
  reason: string;
  priority: number;
}

/**
 * K01 — Intervention Engine Backend
 * -----------------------------------------------------------------------
 * Ranks the intervention catalogue for a survivor using three signal
 * sources, in this order of precedence:
 *   1. Case category (what kind of case this survivor is dealing with)
 *   2. Current distress/recovery signal (from the ML layer, if available)
 *   3. Recent intervention history (avoid repeating something just skipped)
 *
 * This is intentionally a deterministic, explainable rules engine rather
 * than a black-box model — every ranking decision can be traced back to a
 * `reason` string, which is required for the "explainability" acceptance
 * criteria used elsewhere in the tracker (I13, J15).
 */

const CATALOGUE: InterventionRecommendation[] = [
  { type: 'breathe', label: 'Breathe', reason: 'A gentle rhythm to help your body soften.', priority: 3 },
  { type: 'ground', label: 'Ground', reason: 'Notice what is around you, one sense at a time.', priority: 3 },
  { type: 'relax', label: 'Relax', reason: 'A guided pause for a busy or tired mind.', priority: 3 },
  { type: 'listen', label: 'Listen', reason: 'Soft audio spaces for whenever words feel too much.', priority: 3 },
  { type: 'just-stay', label: 'Just Stay', reason: 'You do not have to talk right now.', priority: 3 },
  { type: 'understand', label: 'Understand', reason: 'Small, plain-language guides for hard days.', priority: 3 },
];

const cloneCatalogue = (): InterventionRecommendation[] => CATALOGUE.map((item) => ({ ...item }));

const applyCaseCategoryRules = (recommendations: InterventionRecommendation[], caseRecord?: CaseRecord | null) => {
  if (!caseRecord) return;
  const byType = (type: string) => recommendations.find((r) => r.type === type)!;
  if (caseRecord.caseCategory?.includes('Sexual Assault')) {
    byType('ground').priority = 1;
    byType('breathe').priority = 1;
    byType('just-stay').priority = 2;
  } else if (caseRecord.caseCategory?.includes('Threats') || caseRecord.caseCategory?.includes('Intimidation')) {
    byType('ground').priority = 1;
    byType('breathe').priority = 2;
  } else if (caseRecord.caseCategory?.includes('Discrimination')) {
    byType('understand').priority = 1;
    byType('ground').priority = 2;
  } else if (caseRecord.caseCategory?.includes('Murder')) {
    byType('relax').priority = 1;
    byType('listen').priority = 2;
  }
  if (caseRecord.riskLevel === 'CRITICAL' || caseRecord.riskLevel === 'HIGH') {
    byType('just-stay').priority = 0;
    byType('just-stay').reason = 'A gentle place to start — no need to talk yet.';
  }
};

/** Case-only recommendation path — kept for the existing /interventions/recommendations route. */
export const getInterventionRecommendations = (caseRecord: CaseRecord): InterventionRecommendation[] => {
  const recommendations = cloneCatalogue();
  applyCaseCategoryRules(recommendations, caseRecord);
  return recommendations.sort((a, b) => a.priority - b.priority);
};

export interface RankInterventionsInput {
  caseRecord?: CaseRecord | null;
  latestAnalysis?: MlResult | null;
  recentInterventions?: Array<{ type: string; status: string; feedback?: { completed: boolean; rating?: number } }>;
}

/**
 * Full ranking engine used by POST /ai/recommend. Combines case context,
 * the most recent distress/recovery signal and recent intervention outcomes.
 */
export const rankInterventions = (input: RankInterventionsInput): InterventionRecommendation[] => {
  const recommendations = cloneCatalogue();
  applyCaseCategoryRules(recommendations, input.caseRecord);

  const analysis = input.latestAnalysis;
  if (analysis && !analysis.insufficientEvidence && analysis.distressScore !== null) {
    const byType = (type: string) => recommendations.find((r) => r.type === type)!;
    if (analysis.distressScore >= 70) {
      byType('ground').priority = Math.min(byType('ground').priority, 0);
      byType('breathe').priority = Math.min(byType('breathe').priority, 1);
      byType('ground').reason = 'Distress signal is elevated — grounding first can help regulate the body.';
    } else if (analysis.distressScore <= 30 && (analysis.recoveryScore ?? 0) >= 60) {
      byType('understand').priority = Math.min(byType('understand').priority, 1);
      byType('understand').reason = 'Recovery is trending well — a good time for reflective content.';
    }
    for (const factor of analysis.contributingFactors ?? []) {
      if (factor.direction === 'increased_distress' && factor.factor.toLowerCase().includes('sleep')) {
        byType('relax').priority = Math.min(byType('relax').priority, 1);
        byType('relax').reason = 'Sleep-related distress detected — a wind-down exercise may help.';
      }
    }
  }

  // Avoid re-suggesting something the survivor just skipped or rated poorly.
  const discouraged = new Set(
    (input.recentInterventions ?? [])
      .filter((i) => i.status === 'SKIPPED' || (i.feedback && !i.feedback.completed))
      .map((i) => i.type)
  );
  for (const rec of recommendations) {
    if (discouraged.has(rec.type)) rec.priority += 2;
  }

  return recommendations.sort((a, b) => a.priority - b.priority);
};

/**
 * K13 — Counsellor escalation from intervention
 * -----------------------------------------------------------------------
 * Decides whether a pattern of intervention outcomes (repeated skips, poor
 * ratings, or "did not help") should raise a P2 alert asking a counsellor
 * to check in directly, rather than letting the survivor keep cycling
 * through self-help content alone.
 */
export interface InterventionOutcomeRecord {
  type: string;
  status: string;
  createdAt: string;
  feedback?: { completed: boolean; rating?: number };
}

export const shouldEscalateToCounsellor = (recent: InterventionOutcomeRecord[]): { escalate: boolean; reason?: string } => {
  const lastThree = recent.slice(-3);
  const allSkippedOrFailed = lastThree.length >= 3 && lastThree.every((r) => r.status === 'SKIPPED' || (r.feedback && !r.feedback.completed));
  if (allSkippedOrFailed) {
    return { escalate: true, reason: 'Survivor has skipped or not completed the last 3 recommended interventions.' };
  }
  const poorRatings = lastThree.filter((r) => r.feedback?.rating !== undefined && r.feedback.rating <= 2);
  if (poorRatings.length >= 2) {
    return { escalate: true, reason: 'Multiple low-rated interventions in a row — self-help content may not be enough right now.' };
  }
  return { escalate: false };
};