/**
 * P06 — Distress statistics widget
 * P07 — Recovery statistics widget
 * P11 — Operational response metrics
 * P15 — Report generation
 * -----------------------------------------------------------------------
 * All four are read from aggregated queries only — no individual-level
 * data crosses into this module, per the "Shows only aggregated stats,
 * no individual data" acceptance criteria on the admin dashboards. Every
 * function below takes already-fetched arrays and returns a rollup; it
 * never keys anything by user id or victim token in its output.
 */

export interface CaseLike {
  currentStage: string;
  riskLevel?: string;
  currentDistressScore?: number;
  baselineDistressScore?: number;
}

export interface AlertLike {
  status: string;
  severity: string;
  createdAt: string;
  resolvedAt?: string;
  acknowledgedAt?: string;
}

/** P06 — Distress statistics widget: distribution + trend direction, aggregated only. */
export function computeDistressStatistics(cases: CaseLike[]) {
  const distribution = cases.reduce((acc: Record<string, number>, c) => {
    const level = c.riskLevel || 'LOW';
    acc[level] = (acc[level] || 0) + 1;
    return acc;
  }, {});

  const deltas = cases
    .filter((c) => typeof c.currentDistressScore === 'number' && typeof c.baselineDistressScore === 'number')
    .map((c) => c.currentDistressScore! - c.baselineDistressScore!);

  const improving = deltas.filter((d) => d <= -8).length;
  const worsening = deltas.filter((d) => d >= 8).length;
  const stable = deltas.length - improving - worsening;

  return {
    caseCount: cases.length,
    distressDistribution: distribution,
    trend: deltas.length
      ? { improving, worsening, stable, sampleSize: deltas.length }
      : { improving: 0, worsening: 0, stable: 0, sampleSize: 0, insufficientEvidence: true },
  };
}

/** P07 — Recovery statistics widget: mirrors P06 but from the recovery angle. */
export function computeRecoveryStatistics(cases: CaseLike[]) {
  const deltas = cases
    .filter((c) => typeof c.currentDistressScore === 'number' && typeof c.baselineDistressScore === 'number')
    .map((c) => c.baselineDistressScore! - c.currentDistressScore!); // positive = recovering

  const recovering = deltas.filter((d) => d >= 8).length;
  const relapsing = deltas.filter((d) => d <= -8).length;
  const flat = deltas.length - recovering - relapsing;

  return {
    caseCount: cases.length,
    recoveryTrend: deltas.length
      ? { recovering, relapsing, flat, sampleSize: deltas.length }
      : { recovering: 0, relapsing: 0, flat: 0, sampleSize: 0, insufficientEvidence: true },
  };
}

/** P11 — Operational response metrics: alert resolution time, aggregated. */
export function computeOperationalMetrics(alerts: AlertLike[]) {
  const resolved = alerts.filter((a) => a.status === 'RESOLVED' && a.resolvedAt);
  const resolutionTimesMs = resolved.map((a) => new Date(a.resolvedAt!).getTime() - new Date(a.createdAt).getTime());
  const acknowledged = alerts.filter((a) => a.acknowledgedAt);
  const ackTimesMs = acknowledged.map((a) => new Date(a.acknowledgedAt!).getTime() - new Date(a.createdAt).getTime());

  const avg = (arr: number[]) => (arr.length ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) : null);

  return {
    totalAlerts: alerts.length,
    openAlerts: alerts.filter((a) => a.status === 'NEW' || a.status === 'ACKNOWLEDGED' || a.status === 'ASSIGNED').length,
    resolvedAlerts: resolved.length,
    avgAcknowledgeTimeMs: avg(ackTimesMs),
    avgResolutionTimeMs: avg(resolutionTimesMs),
    urgentAlertCount: alerts.filter((a) => a.severity === 'urgent').length,
  };
}

/** P15 — Report generation: bundles the above into a single downloadable, aggregated-only report. */
export function generateAdminReport(params: { cases: CaseLike[]; alerts: AlertLike[]; scope: string }) {
  return {
    generatedAt: new Date().toISOString(),
    scope: params.scope,
    privacyBoundary: 'aggregated_only',
    caseStats: {
      caseCount: params.cases.length,
      stageStats: Object.entries(
        params.cases.reduce((acc: Record<string, number>, c) => {
          acc[c.currentStage] = (acc[c.currentStage] || 0) + 1;
          return acc;
        }, {})
      ).map(([stage, count]) => ({ stage, count })),
    },
    distressStats: computeDistressStatistics(params.cases),
    recoveryStats: computeRecoveryStatistics(params.cases),
    operationalMetrics: computeOperationalMetrics(params.alerts),
  };
}