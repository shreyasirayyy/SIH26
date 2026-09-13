"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, Check, CheckCircle2, CircleAlert, ShieldAlert } from "lucide-react";
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
  createdAt: string;
  updatedAt?: string;
  resolvedAt?: string;
}

export default function CounsellorAlertsPage() {
  const [tab, setTab] = useState<"New" | "Reviewed" | "Critical">("New");
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [cases, setCases] = useState<CaseRecord[]>([]);
  const [assessments, setAssessments] = useState<Awaited<ReturnType<typeof aiService.getSahayakAssessments>>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadAlertsData() {
      setLoading(true);
      try {
        const [casesRes, alertsRes, assessmentsRes] = await Promise.all([
          caseService.getMyCases().catch(() => []),
          aiService.getAlerts().catch(() => []),
          aiService.getSahayakAssessments().catch(() => []),
        ]);
        setCases(casesRes);
        setAlerts(alertsRes as AlertItem[]);
        setAssessments(assessmentsRes || []);
      } finally {
        setLoading(false);
      }
    }
    loadAlertsData();
  }, []);

  const assignedTokens = useMemo(() => new Set(cases.map((c) => c.victimToken)), [cases]);
  const assignedDockets = useMemo(() => new Set(cases.map((c) => c.docket)), [cases]);
  const caseByToken = useMemo(() => {
    const map = new Map<string, CaseRecord>();
    cases.forEach((c) => {
      map.set(c.victimToken, c);
      map.set(c.docket, c);
    });
    return map;
  }, [cases]);

  // Scoped alerts strictly for assigned cases
  const caseloadAlerts = useMemo(() => {
    return alerts.filter(
      (a) =>
        (a.victimToken && assignedTokens.has(a.victimToken)) ||
        (a.caseReference && (assignedTokens.has(a.caseReference) || assignedDockets.has(a.caseReference)))
    );
  }, [alerts, assignedTokens, assignedDockets]);

  const visibleAlerts = useMemo(() => {
    if (tab === "New") {
      return caseloadAlerts.filter((a) => a.status === "NEW" || a.status === "ASSIGNED");
    }
    if (tab === "Reviewed") {
      return caseloadAlerts.filter((a) => a.status === "ACKNOWLEDGED" || a.status === "RESOLVED");
    }
    // Critical tab: P1 or Crisis alerts
    return caseloadAlerts.filter((a) => a.priority === "P1" || a.level === "P1" || a.severity === "urgent");
  }, [caseloadAlerts, tab]);

  const handleAcknowledge = async (alertId: string) => {
    try {
      await aiService.acknowledgeAlert(alertId);
    } catch {
      // non-fatal
    }
    setAlerts((prev) =>
      prev.map((a) => (a.id === alertId ? { ...a, status: "ACKNOWLEDGED" } : a))
    );
  };

  const handleResolve = async (alertId: string) => {
    try {
      await aiService.resolveAlert(alertId, "Marked resolved by counsellor");
    } catch {
      // non-fatal
    }
    setAlerts((prev) =>
      prev.map((a) => (a.id === alertId ? { ...a, status: "RESOLVED", resolvedAt: new Date().toISOString() } : a))
    );
  };

  return (
    <div className="mx-auto max-w-5xl space-y-8 pb-12">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-deep-teal">Counsellor Workspace</p>
        <h1 className="mt-1 font-editorial text-3xl font-bold tracking-tight text-text-primary md:text-4xl">
          Caseload Alerts
        </h1>
        <p className="mt-1.5 text-sm text-text-secondary">
          AI-assisted early-support signals and safety alerts for human review across your assigned cases.
        </p>
      </div>

      {/* Sahayak Assessments Preview if available */}
      {assessments.length > 0 && (
        <section className="rounded-2xl border border-border-color bg-[color:var(--surface)] p-5 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-deep-teal mb-3">
            Sahayak Escalation Risk Assessments
          </p>
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

      {/* Tabs */}
      <div className="flex gap-2 border-b border-border-color">
        {(["New", "Reviewed", "Critical"] as const).map((name) => {
          const count =
            name === "New"
              ? caseloadAlerts.filter((a) => a.status === "NEW" || a.status === "ASSIGNED").length
              : name === "Reviewed"
              ? caseloadAlerts.filter((a) => a.status === "ACKNOWLEDGED" || a.status === "RESOLVED").length
              : caseloadAlerts.filter((a) => a.priority === "P1" || a.level === "P1").length;

          return (
            <button
              key={name}
              onClick={() => setTab(name)}
              className={`flex items-center gap-1.5 border-b-2 px-4 py-3 text-sm font-semibold transition-colors ${
                tab === name ? "border-deep-teal text-deep-teal" : "border-transparent text-text-secondary hover:text-text-primary"
              }`}
            >
              <span>{name}</span>
              <span className="rounded-full bg-[color:var(--surface-subtle)] px-2 py-0.5 text-xs">
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {loading && <p className="text-sm text-text-secondary">Loading caseload alerts…</p>}

      {!loading && visibleAlerts.length === 0 && (
        <div className="rounded-2xl border border-dashed border-border-color bg-[color:var(--surface-subtle)] p-12 text-center text-sm text-text-secondary">
          No alerts found in the &ldquo;{tab}&rdquo; view.
        </div>
      )}

      <div className="grid gap-4">
        {visibleAlerts.map((alert) => {
          const matchedCase = alert.victimToken
            ? caseByToken.get(alert.victimToken)
            : alert.caseReference
            ? caseByToken.get(alert.caseReference)
            : null;

          const isP1 = alert.priority === "P1" || alert.level === "P1" || alert.severity === "urgent";

          return (
            <article
              key={alert.id}
              className={`rounded-2xl border p-5 shadow-sm transition-all ${
                isP1 ? "border-warm-peach/40 bg-[color:var(--surface)]" : "border-border-color bg-[color:var(--surface)]"
              }`}
            >
              <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
                <div className="flex items-start gap-3.5">
                  <span
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                      isP1 ? "bg-warm-peach/20 text-warm-peach" : "bg-amber/20 text-[#b67926]"
                    }`}
                  >
                    {isP1 ? <ShieldAlert size={20} /> : <CircleAlert size={20} />}
                  </span>

                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge tone={isP1 ? "peach" : "amber"}>
                        {alert.priority || alert.level || "P3"}
                      </Badge>
                      <h2 className="font-semibold text-sm text-text-primary">{alert.reason}</h2>
                      <Badge tone={alert.status === "RESOLVED" ? "sage" : alert.status === "ACKNOWLEDGED" ? "amber" : "peach"}>
                        {alert.status}
                      </Badge>
                    </div>

                    <p className="mt-1.5 text-xs text-text-secondary">
                      {matchedCase ? (
                        <>
                          <span className="font-semibold text-text-primary">{matchedCase.survivorName}</span> ·{" "}
                          <span className="font-mono">{matchedCase.docket}</span> · Stage: {matchedCase.currentStage}
                        </>
                      ) : (
                        <span>Case: {alert.victimToken || alert.caseReference || "Assigned case"}</span>
                      )}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  {matchedCase && (
                    <Link
                      href={`/counsellor/cases/${matchedCase.victimToken}`}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-deep-teal px-3.5 py-2 text-xs font-bold text-white shadow-sm hover:bg-[#0c625b] transition-all"
                    >
                      Review case <ArrowRight size={13} />
                    </Link>
                  )}

                  {alert.status === "NEW" && (
                    <Button size="sm" variant="secondary" onClick={() => handleAcknowledge(alert.id)}>
                      <Check size={13} /> Acknowledge
                    </Button>
                  )}

                  {alert.status !== "RESOLVED" && (
                    <Button size="sm" variant="secondary" onClick={() => handleResolve(alert.id)}>
                      <CheckCircle2 size={13} /> Mark resolved
                    </Button>
                  )}
                </div>
              </div>

              <div className="mt-4 grid gap-3 rounded-xl bg-[color:var(--surface-subtle)] p-3 text-xs sm:grid-cols-3 border border-border-color/50">
                <div>
                  <p className="text-[10px] font-bold text-text-secondary uppercase tracking-wider">Triggered</p>
                  <p className="mt-0.5 font-medium text-text-primary">{formatDate(alert.createdAt)}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-text-secondary uppercase tracking-wider">Source</p>
                  <p className="mt-0.5 font-medium text-text-primary capitalize">{alert.source || "Wellbeing Monitoring"}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-text-secondary uppercase tracking-wider">Status</p>
                  <p className="mt-0.5 font-medium text-text-primary">
                    {alert.status === "RESOLVED" ? `Resolved ${alert.resolvedAt ? formatDate(alert.resolvedAt) : ""}` : "Awaiting review"}
                  </p>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
