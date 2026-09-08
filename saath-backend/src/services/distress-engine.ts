/**
 * H07 — Baseline update trigger
 * I23 — Score generation API (distress + recovery + confidence + factors)
 * -----------------------------------------------------------------------
 * This is a small, explainable statistics layer that sits on top of the
 * per-check-in ML output (services/ml.ts). It does NOT replace the ML
 * model — it fuses repeated observations into a stable baseline and a
 * trend-aware score, which is what the tracker's acceptance criteria
 * ("Score in range 0-100 generated per cycle", "New observation triggers
 * recompute job") actually ask for.
 */

export interface Observation {
  createdAt: string;
  ml?: {
    distressScore: number | null;
    recoveryScore: number | null;
    confidence: number;
    contributingFactors?: Array<{ factor: string; direction: 'increased_distress' | 'increased_recovery'; weight: number }>;
  };
}

export interface BaselineRecord {
  mean: number;
  count: number;
  min: number;
  max: number;
  updatedAt: string;
}

const MIN_OBSERVATIONS_FOR_BASELINE = 3;

/**
 * H07 — Recomputes the baseline for a user from their check-in history.
 * This is the "recompute job" referenced by GET /monitoring/baseline's
 * acceptance criteria; it is triggered after every new observation rather
 * than run on a fixed schedule, since check-in cadence is irregular by
 * design (survivors are never forced to check in).
 */
export function recomputeBaseline(observations: Observation[]): BaselineRecord | null {
  const scores = observations
    .map((o) => o.ml?.distressScore)
    .filter((s): s is number => typeof s === 'number');

  if (scores.length < MIN_OBSERVATIONS_FOR_BASELINE) return null;

  const mean = scores.reduce((a, b) => a + b, 0) / scores.length;
  return {
    mean: Number(mean.toFixed(2)),
    count: scores.length,
    min: Math.min(...scores),
    max: Math.max(...scores),
    updatedAt: new Date().toISOString(),
  };
}

export interface DistressScoreResult {
  score: number | null;
  confidence: number;
  trend: 'improving' | 'worsening' | 'stable' | 'unknown';
  contributingFactors: Array<{ factor: string; direction: string; weight: number }>;
  insufficientEvidence: boolean;
  baselineDeviation: number | null;
  timestamp: string;
}

/**
 * I23 — Produces the survivor-facing distress score payload used by
 * GET /monitoring/distress. Compares the latest observation against the
 * rolling baseline (when one exists) to derive a trend direction, instead
 * of just echoing the latest raw ML output with no context.
 */
export function generateDistressScore(observations: Observation[], baseline: BaselineRecord | null): DistressScoreResult {
  const latest = observations.at(-1)?.ml;
  if (!latest || latest.distressScore === null) {
    return {
      score: null,
      confidence: 0,
      trend: 'unknown',
      contributingFactors: [],
      insufficientEvidence: true,
      baselineDeviation: null,
      timestamp: new Date().toISOString(),
    };
  }

  let trend: DistressScoreResult['trend'] = 'unknown';
  let baselineDeviation: number | null = null;
  if (baseline) {
    baselineDeviation = Number((latest.distressScore - baseline.mean).toFixed(2));
    if (baselineDeviation <= -8) trend = 'improving';
    else if (baselineDeviation >= 8) trend = 'worsening';
    else trend = 'stable';
  }

  return {
    score: latest.distressScore,
    confidence: latest.confidence,
    trend,
    contributingFactors: latest.contributingFactors ?? [],
    insufficientEvidence: latest.confidence < 0.5,
    baselineDeviation,
    timestamp: new Date().toISOString(),
  };
}

/**
 * I23 — Recovery-side counterpart of generateDistressScore, used by
 * GET /monitoring/recovery.
 */
export function generateRecoveryScore(observations: Observation[], baseline: BaselineRecord | null): DistressScoreResult {
  const latest = observations.at(-1)?.ml;
  if (!latest || latest.recoveryScore === null) {
    return {
      score: null,
      confidence: 0,
      trend: 'unknown',
      contributingFactors: [],
      insufficientEvidence: true,
      baselineDeviation: null,
      timestamp: new Date().toISOString(),
    };
  }

  let trend: DistressScoreResult['trend'] = 'unknown';
  if (baseline) {
    const distressLatest = observations.at(-1)?.ml?.distressScore ?? null;
    if (distressLatest !== null) {
      const deviation = distressLatest - baseline.mean;
      trend = deviation <= -8 ? 'improving' : deviation >= 8 ? 'worsening' : 'stable';
    }
  }

  return {
    score: latest.recoveryScore,
    confidence: latest.confidence,
    trend,
    contributingFactors: (latest.contributingFactors ?? []).filter((f) => f.direction === 'increased_recovery'),
    insufficientEvidence: latest.confidence < 0.5,
    baselineDeviation: null,
    timestamp: new Date().toISOString(),
  };
}