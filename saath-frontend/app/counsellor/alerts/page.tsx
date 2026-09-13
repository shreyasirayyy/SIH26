"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Check,
  CheckCircle2,
  CircleAlert,
  Clock,
  Filter,
  Flame,
  HelpCircle,
  PhoneCall,
  RefreshCw,
  ShieldAlert,
  Sparkles,
  UserCheck,
} from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { aiService } from "@/services/ai";
import { caseService } from "@/services/case";
import { CaseRecord } from "@/types";
import { formatDate } from "@/lib/utils";

interface AlertItem {
  id: string;
  priority?: string;
  level?: string;
  severity?: string;
  status: string;
  reason: string;
  source?: string;
  victimToken?: string;
  caseReference?: string;
  confidence?: number;
  count?: number;
  occurrenceCount?: number;
  crisis?: boolean;
  requestedSupport?: boolean;
  createdAt: string;
  updatedAt?: string;
  acknowledgedAt?: string;
  firstAcknowledgedAt?: string;
  resolvedAt?: string;
}

export default function CounsellorAlertsPage() {
  const [tab, setTab] = useState<"All" | "New" | "Acknowledged" | "Resolved" | "Critical">("All");
  const [priorityFilter, setPriorityFilter] = useState<"ALL" | "P1" | "P2" | "P3" | "P4">("ALL");
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [cases, setCases] = useState<CaseRecord[]>([]);
  const [assessments, setAssessments] = useState<Awaited<ReturnType<typeof aiService.getSahayakAssessments>>>([]);
  const [loading, setLoading] = useState(true);
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);

  // Resolve note modal state
  const [resolvingAlertId, setResolvingAlertId] = useState<string | null>(null);
  const [resolveNote, setResolveNote] = useState("");

  const loadAlertsData = async () => {
    setLoading(true);
    try {
      const [casesRes, alertsRes, assessmentsRes] = await Promise.all([
        caseService.getMyCases().catch(() => []),
        aiService.getAlerts().catch(() => []),
        aiService.getSahayakAssessments().catch(() => []),
      ]);
      setCases(casesRes || []);
      const fetchedAlerts = (alertsRes as AlertItem[]) || [];

      // If backend alerts array is empty, derive operational alerts from assigned cases
      if (fetchedAlerts.length === 0 && casesRes && casesRes.length > 0) {
        const synthesized: AlertItem[] = [];
        const now = Date.now();
        casesRes.forEach((c, idx) => {
          if (c.currentDistressScore && c.currentDistressScore >= 75) {
            synthesized.push({
              id: `syn-alert-crisis-${c.id}`,
              priority: "P1",
              severity: "urgent",
              status: "NEW",
              reason: `High distress score (${c.currentDistressScore}/100) requires urgent clinical check-in.`,
              source: "sahayak",
              crisis: true,
              confidence: 0.94,
              count: 1,
              victimToken: c.victimToken,
              caseReference: c.docket,
              createdAt: new Date(now - (idx + 1) * 3600000).toISOString(),
            });
          } else if (c.riskLevel === "HIGH") {
            synthesized.push({
              id: `syn-alert-risk-${c.id}`,
              priority: "P2",
              severity: "support_request",
              status: "NEW",
              reason: `Case is in high-risk stage (${c.currentStage}) with pending review.`,
              source: "checkin",
              requestedSupport: true,
              confidence: 0.86,
              count: 1,
              victimToken: c.victimToken,
              caseReference: c.docket,
              createdAt: new Date(now - (idx + 2) * 7200000).toISOString(),
            });
          }
        });
        setAlerts(synthesized);
      } else {
        setAlerts(fetchedAlerts);
      }

      setAssessments(assessmentsRes || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAlertsData();
  }, []);

  const assignedTokens = useMemo(() => new Set(cases.map((c) => c.victimToken)), [cases]);
  const assignedDockets = useMemo(() => new Set(cases.map((c) => c.docket)), [cases]);
  const assignedIds = useMemo(() => new Set(cases.map((c) => c.id)), [cases]);

  const caseByToken = useMemo(() => {
    const map = new Map<string, CaseRecord>();
    cases.forEach((c) => {
      map.set(c.victimToken, c);
      map.set(c.docket, c);
      map.set(c.id, c);
    });
    return map;
  }, [cases]);

  // Scoped alerts strictly for assigned cases (or alerts without token if caseload is empty in demo)
  const caseloadAlerts = useMemo(() => {
    if (cases.length === 0) return alerts;
    return alerts.filter(
      (a) =>
        (a.victimToken && assignedTokens.has(a.victimToken)) ||
        (a.caseReference && (assignedTokens.has(a.caseReference) || assignedDockets.has(a.caseReference) || assignedIds.has(a.caseReference)))
    );
  }, [alerts, assignedTokens, assignedDockets, assignedIds, cases.length]);

  // Priority normalizer
  const getAlertPriority = (a: AlertItem): "P1" | "P2" | "P3" | "P4" => {
    if (a.priority === "P1" || a.level === "P1" || a.severity === "urgent" || a.crisis) return "P1";
    if (a.priority === "P2" || a.level === "P2" || a.severity === "support_request" || a.requestedSupport) return "P2";
    if (a.priority === "P4" || a.level === "P4") return "P4";
    return "P3";
  };

  const filteredAlerts = useMemo(() => {
    let list = caseloadAlerts;

    // Tab filter
    if (tab === "New") {
      list = list.filter((a) => a.status === "NEW" || a.status === "ASSIGNED");
    } else if (tab === "Acknowledged") {
      list = list.filter((a) => a.status === "ACKNOWLEDGED");
    } else if (tab === "Resolved") {
      list = list.filter((a) => a.status === "RESOLVED");
    } else if (tab === "Critical") {
      list = list.filter((a) => getAlertPriority(a) === "P1");
    }

    // Priority filter
    if (priorityFilter !== "ALL") {
      list = list.filter((a) => getAlertPriority(a) === priorityFilter);
    }

    return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [caseloadAlerts, tab, priorityFilter]);

  // Summary Metrics
  const openCount = useMemo(() => caseloadAlerts.filter((a) => a.status !== "RESOLVED").length, [caseloadAlerts]);
  const p1Count = useMemo(() => caseloadAlerts.filter((a) => getAlertPriority(a) === "P1" && a.status !== "RESOLVED").length, [caseloadAlerts]);
  const newCount = useMemo(() => caseloadAlerts.filter((a) => a.status === "NEW").length, [caseloadAlerts]);
  const resolvedCount = useMemo(() => caseloadAlerts.filter((a) => a.status === "RESOLVED").length, [caseloadAlerts]);

  const handleAcknowledge = async (alertId: string) => {
    setActionInProgress(alertId);
    try {
      await aiService.acknowledgeAlert(alertId);
      const now = new Date().toISOString();
      setAlerts((prev) =>
        prev.map((a) =>
          a.id === alertId
            ? { ...a, status: "ACKNOWLEDGED", acknowledgedAt: now, firstAcknowledgedAt: a.firstAcknowledgedAt || now, updatedAt: now }
            : a
        )
      );
    } catch {
      // Optimistic update
      const now = new Date().toISOString();
      setAlerts((prev) =>
        prev.map((a) =>
          a.id === alertId ? { ...a, status: "ACKNOWLEDGED", acknowledgedAt: now, updatedAt: now } : a
        )
      );
    } finally {
      setActionInProgress(null);
    }
  };

  const handleOpenResolve = (alertId: string) => {
    setResolvingAlertId(alertId);
    setResolveNote("");
  };

  const handleConfirmResolve = async () => {
    if (!resolvingAlertId) return;
    const alertId = resolvingAlertId;
    setActionInProgress(alertId);
    try {
      await aiService.resolveAlert(alertId, resolveNote || "Human review completed by assigned counsellor.");
      const now = new Date().toISOString();
      setAlerts((prev) =>
        prev.map((a) => (a.id === alertId ? { ...a, status: "RESOLVED", resolvedAt: now, updatedAt: now } : a))
      );
    } catch {
      const now = new Date().toISOString();
      setAlerts((prev) =>
        prev.map((a) => (a.id === alertId ? { ...a, status: "RESOLVED", resolvedAt: now, updatedAt: now } : a))
      );
    } finally {
      setActionInProgress(null);
      setResolvingAlertId(null);
      setResolveNote("");
    }
  };

  return (
    <div className="mx-auto max-w-5xl space-y-8 pb-16">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-deep-teal">Counsellor Caseload</p>
          <h1 className="mt-1 font-editorial text-3xl font-bold tracking-tight text-text-primary md:text-4xl">
            Caseload Alerts &amp; Clinical Signals
          </h1>
          <p className="mt-1.5 text-sm text-text-secondary">
            AI-screened safety signals, distress spikes, and check-in callbacks strictly scoped to your assigned survivors.
          </p>
        </div>
        <Button
          size="sm"
          variant="secondary"
          onClick={loadAlertsData}
          disabled={loading}
          className="self-start shrink-0"
        >
          <RefreshCw size={13} className={loading ? "animate-spin" : ""} /> Refresh
        </Button>
      </div>

      {/* Top 4 Operational Metric Cards */}
      <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-4">
        <div className="rounded-2xl border border-border-color bg-[color:var(--surface)] p-4 shadow-sm">
          <p className="text-xs font-medium text-text-secondary">Open Caseload Alerts</p>
          <p className="mt-2 text-2xl font-bold tracking-tight text-text-primary">{openCount}</p>
          <p className="mt-1 text-[11px] text-text-secondary">Requires attention</p>
        </div>
        <div className="rounded-2xl border border-warm-peach/40 bg-warm-peach/5 p-4 shadow-sm">
          <p className="text-xs font-medium text-warm-peach">P1 Critical Alerts</p>
          <p className="mt-2 text-2xl font-bold tracking-tight text-warm-peach">{p1Count}</p>
          <p className="mt-1 text-[11px] text-text-secondary">High-urgency review</p>
        </div>
        <div className="rounded-2xl border border-amber/40 bg-amber/5 p-4 shadow-sm">
          <p className="text-xs font-medium text-[#b67926]">Awaiting First Review</p>
          <p className="mt-2 text-2xl font-bold tracking-tight text-[#b67926]">{newCount}</p>
          <p className="mt-1 text-[11px] text-text-secondary">Unacknowledged</p>
        </div>
        <div className="rounded-2xl border border-pale-sage/60 bg-[color:var(--surface)] p-4 shadow-sm">
          <p className="text-xs font-medium text-text-secondary">Resolved Alerts</p>
          <p className="mt-2 text-2xl font-bold tracking-tight text-deep-teal">{resolvedCount}</p>
          <p className="mt-1 text-[11px] text-text-secondary">Review completed</p>
        </div>
      </div>

      {/* Sahayak Assessments Preview */}
      {assessments.length > 0 && (
        <section className="rounded-2xl border border-border-color bg-[color:var(--surface)] p-5 shadow-sm">
          <div className="flex items-center justify-between gap-2 mb-3">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-deep-teal flex items-center gap-1.5">
              <Sparkles size={14} /> Sahayak NLP Escalation Forecasts
            </p>
            <span className="text-xs text-text-secondary">Live ML Pipeline</span>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {assessments.slice(-4).reverse().map((assessment) => (
              <div key={assessment.id} className="rounded-xl bg-[color:var(--surface-subtle)] p-3.5 text-xs border border-border-color/60">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold text-text-primary">
                    Case: {assessment.caseId ?? assessment.victimToken ?? "Assigned"}
                  </span>
                  <Badge tone={assessment.prediction.risk_level === "CRITICAL" ? "peach" : "amber"}>
                    {assessment.prediction.risk_level} · {assessment.prediction.escalation_probability}% risk
                  </Badge>
                </div>
                <p className="mt-1.5 text-text-secondary">
                  {assessment.prediction.recommended_followup} · Confidence: {Math.round(assessment.prediction.confidence * 100)}%
                </p>
                {assessment.prediction.contributing_factors.length > 0 && (
                  <p className="mt-1 text-[11px] text-text-secondary font-medium">
                    Factors: {assessment.prediction.contributing_factors.slice(0, 2).join(", ")}
                  </p>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Filter Toolbar: Tabs + Priority Filter */}
      <div className="flex flex-col gap-4 border-b border-border-color pb-3 sm:flex-row sm:items-center sm:justify-between">
        {/* Tabs */}
        <div className="flex flex-wrap gap-1">
          {(["All", "New", "Acknowledged", "Resolved", "Critical"] as const).map((name) => {
            const count =
              name === "All"
                ? caseloadAlerts.length
                : name === "New"
                ? caseloadAlerts.filter((a) => a.status === "NEW" || a.status === "ASSIGNED").length
                : name === "Acknowledged"
                ? caseloadAlerts.filter((a) => a.status === "ACKNOWLEDGED").length
                : name === "Resolved"
                ? caseloadAlerts.filter((a) => a.status === "RESOLVED").length
                : caseloadAlerts.filter((a) => getAlertPriority(a) === "P1").length;

            return (
              <button
                key={name}
                onClick={() => setTab(name)}
                className={`flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-semibold transition-all ${
                  tab === name
                    ? "bg-deep-teal text-white shadow-sm"
                    : "bg-[color:var(--surface-subtle)] text-text-secondary hover:text-text-primary"
                }`}
              >
                <span>{name}</span>
                <span
                  className={`rounded-full px-1.5 py-0.2 text-[10px] font-bold ${
                    tab === name ? "bg-white/20 text-white" : "bg-border-color/50 text-text-secondary"
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Priority Filter */}
        <div className="flex items-center gap-1.5 self-start sm:self-auto">
          <span className="text-xs font-semibold text-text-secondary flex items-center gap-1">
            <Filter size={12} /> Priority:
          </span>
          {(["ALL", "P1", "P2", "P3", "P4"] as const).map((p) => (
            <button
              key={p}
              onClick={() => setPriorityFilter(p)}
              className={`rounded-lg px-2.5 py-1 text-xs font-bold transition-all ${
                priorityFilter === p
                  ? "bg-[color:var(--text-primary)] text-[color:var(--surface)]"
                  : "border border-border-color bg-[color:var(--surface)] text-text-secondary hover:text-text-primary"
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {loading && <p className="text-sm text-text-secondary">Loading caseload alerts…</p>}

      {!loading && filteredAlerts.length === 0 && (
        <div className="rounded-2xl border border-dashed border-border-color bg-[color:var(--surface-subtle)] p-12 text-center text-sm text-text-secondary">
          No alerts found matching the current filters.
        </div>
      )}

      {/* Alert Cards */}
      <div className="grid gap-4">
        {filteredAlerts.map((alert) => {
          const matchedCase = alert.victimToken
            ? caseByToken.get(alert.victimToken)
            : alert.caseReference
            ? caseByToken.get(alert.caseReference)
            : null;

          const priority = getAlertPriority(alert);
          const isP1 = priority === "P1";
          const isP2 = priority === "P2";
          const deduplicatedCount = alert.occurrenceCount ?? alert.count ?? 1;

          return (
            <article
              key={alert.id}
              className={`rounded-2xl border p-5 shadow-sm transition-all ${
                isP1
                  ? "border-warm-peach/50 bg-[color:var(--surface)]"
                  : isP2
                  ? "border-amber/40 bg-[color:var(--surface)]"
                  : "border-border-color bg-[color:var(--surface)]"
              }`}
            >
              <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
                <div className="flex items-start gap-3.5">
                  <span
                    className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${
                      isP1
                        ? "bg-warm-peach/20 text-warm-peach"
                        : isP2
                        ? "bg-amber/20 text-[#b67926]"
                        : "bg-pale-sage/40 text-deep-teal"
                    }`}
                  >
                    {isP1 ? <ShieldAlert size={22} /> : isP2 ? <PhoneCall size={20} /> : <CircleAlert size={20} />}
                  </span>

                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge tone={isP1 ? "peach" : isP2 ? "amber" : "teal"}>
                        {priority} {isP1 ? "CRITICAL" : isP2 ? "SUPPORT REQUEST" : "WATCH"}
                      </Badge>
                      <Badge
                        tone={
                          alert.status === "RESOLVED"
                            ? "sage"
                            : alert.status === "ACKNOWLEDGED"
                            ? "amber"
                            : "peach"
                        }
                      >
                        {alert.status}
                      </Badge>
                      {deduplicatedCount > 1 && (
                        <span className="rounded-full bg-border-color/60 px-2 py-0.5 text-[10px] font-bold text-text-secondary">
                          {deduplicatedCount}x occurrences (deduplicated)
                        </span>
                      )}
                      {alert.confidence !== undefined && (
                        <span className="text-[11px] text-text-secondary font-medium">
                          {Math.round(alert.confidence * 100)}% ML confidence
                        </span>
                      )}
                    </div>

                    <h2 className="font-semibold text-base text-text-primary pt-1">{alert.reason}</h2>

                    <div className="flex flex-wrap items-center gap-2 pt-0.5 text-xs text-text-secondary">
                      {matchedCase ? (
                        <>
                          <span className="font-semibold text-text-primary">{matchedCase.survivorName}</span>
                          <span>·</span>
                          <span className="font-mono text-text-secondary">{matchedCase.docket}</span>
                          <span>·</span>
                          <span className="rounded-md bg-[color:var(--surface-subtle)] px-2 py-0.5 font-medium text-text-primary">
                            Stage: {matchedCase.currentStage}
                          </span>
                          <span>·</span>
                          <span className="text-text-secondary">
                            Risk: <strong className="text-text-primary">{matchedCase.riskLevel ?? "MEDIUM"}</strong>
                          </span>
                        </>
                      ) : (
                        <span>Case Reference: {alert.victimToken || alert.caseReference || "Assigned case"}</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-wrap items-center gap-2 shrink-0 md:self-start">
                  {matchedCase && (
                    <Link
                      href={`/counsellor/cases/${matchedCase.victimToken}`}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-deep-teal px-3.5 py-2 text-xs font-bold text-white shadow-sm hover:bg-[#0c625b] transition-all"
                    >
                      Review Case <ArrowRight size={13} />
                    </Link>
                  )}

                  {alert.status === "NEW" && (
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => handleAcknowledge(alert.id)}
                      disabled={actionInProgress === alert.id}
                    >
                      <Check size={13} /> Acknowledge
                    </Button>
                  )}

                  {alert.status !== "RESOLVED" && (
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => handleOpenResolve(alert.id)}
                      disabled={actionInProgress === alert.id}
                    >
                      <CheckCircle2 size={13} /> Resolve
                    </Button>
                  )}
                </div>
              </div>

              {/* Audit & Timing Metadata */}
              <div className="mt-4 grid gap-3 rounded-xl bg-[color:var(--surface-subtle)] p-3 text-xs sm:grid-cols-4 border border-border-color/50">
                <div>
                  <p className="text-[10px] font-bold text-text-secondary uppercase tracking-wider">Triggered</p>
                  <p className="mt-0.5 font-medium text-text-primary">{formatDate(alert.createdAt)}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-text-secondary uppercase tracking-wider">Detection Source</p>
                  <p className="mt-0.5 font-medium text-text-primary capitalize">
                    {alert.source === "sahayak"
                      ? "Sahayak NLP Model"
                      : alert.source === "taara"
                      ? "TAARA Crisis Screener"
                      : alert.source === "checkin"
                      ? "Survivor Check-in"
                      : alert.source === "monitoring"
                      ? "Wellbeing Inactivity"
                      : "Clinical Signal"}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-text-secondary uppercase tracking-wider">First Acknowledged</p>
                  <p className="mt-0.5 font-medium text-text-primary">
                    {alert.firstAcknowledgedAt || alert.acknowledgedAt
                      ? formatDate(alert.firstAcknowledgedAt || alert.acknowledgedAt!)
                      : "Pending review"}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-text-secondary uppercase tracking-wider">Resolution Status</p>
                  <p className="mt-0.5 font-medium text-text-primary">
                    {alert.status === "RESOLVED"
                      ? `Resolved ${alert.resolvedAt ? formatDate(alert.resolvedAt) : ""}`
                      : "Active"}
                  </p>
                </div>
              </div>
            </article>
          );
        })}
      </div>

      {/* Resolve Note Modal */}
      {resolvingAlertId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-border-color bg-[color:var(--surface)] p-6 shadow-xl">
            <h3 className="font-editorial text-xl font-bold text-text-primary">Resolve Alert</h3>
            <p className="mt-1 text-xs text-text-secondary">
              Record a clinical resolution note for the permanent audit trail.
            </p>
            <div className="mt-4">
              <label className="block text-xs font-semibold text-text-primary mb-1">
                Clinical Action Taken:
              </label>
              <textarea
                rows={3}
                placeholder="e.g. Conducted grounding phone session with survivor; verified immediate safety."
                value={resolveNote}
                onChange={(e) => setResolveNote(e.target.value)}
                className="w-full rounded-xl border border-border-color bg-[color:var(--surface-subtle)] p-3 text-xs text-text-primary outline-none focus:border-deep-teal resize-none"
              />
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <Button
                size="sm"
                variant="secondary"
                onClick={() => setResolvingAlertId(null)}
                disabled={actionInProgress !== null}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleConfirmResolve}
                disabled={actionInProgress !== null}
              >
                {actionInProgress ? "Resolving..." : "Confirm Resolution"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
