"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Card, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { caseService } from "@/services/case";
import { aiService } from "@/services/ai";
import { useAppStore } from "@/store/useAppStore";
import { CaseRecord } from "@/types";
import {
  AlertTriangle,
  ArrowRight,
  Bell,
  Calendar,
  CheckCircle2,
  Clock,
  FileText,
  HeartHandshake,
  Layers,
  MessageSquare,
  Mic,
  ShieldAlert,
  Sparkles,
  TrendingDown,
  TrendingUp,
  UserCheck,
  UsersRound,
} from "lucide-react";
import { formatDate } from "@/lib/utils";

interface VoiceCheckIn {
  id: string;
  victimToken?: string;
  survivorName?: string;
  docket?: string;
  createdAt: string;
  transcript?: string;
  channel?: string;
  requestCounsellorCall?: boolean;
  signals?: {
    sleep?: number;
    socialConnectedness?: number;
    mood?: number;
    fear?: number;
    perceivedSafety?: number;
    distressScore?: number;
    summary?: string;
  };
}

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

export default function CounsellorOverviewPage() {
  const counsellorProfile = useAppStore((s) => s.counsellorProfile);
  const followUps = useAppStore((s) => s.followUps);
  const counsellorMessages = useAppStore((s) => s.counsellorMessages);

  const [cases, setCases] = useState<CaseRecord[]>([]);
  const [voiceCheckIns, setVoiceCheckIns] = useState<VoiceCheckIn[]>([]);
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const [casesRes, voiceRes, alertsRes] = await Promise.all([
          caseService.getMyCases().catch(() => []),
          aiService.getCounsellorVoiceCheckIns().catch(() => []),
          aiService.getAlerts().catch(() => []),
        ]);
        setCases(casesRes);
        setVoiceCheckIns(voiceRes as VoiceCheckIn[]);
        setAlerts(alertsRes as AlertItem[]);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  // Assigned victim tokens set
  const assignedTokens = useMemo(() => new Set(cases.map((c) => c.victimToken)), [cases]);
  const assignedDockets = useMemo(() => new Set(cases.map((c) => c.docket)), [cases]);

  // Scoped alerts for this counsellor's assigned caseload
  const assignedAlerts = useMemo(() => {
    return alerts.filter(
      (a) =>
        (a.victimToken && assignedTokens.has(a.victimToken)) ||
        (a.caseReference && (assignedTokens.has(a.caseReference) || assignedDockets.has(a.caseReference)))
    );
  }, [alerts, assignedTokens, assignedDockets]);

  // Scoped voice check-ins
  const assignedVoiceCheckIns = useMemo(() => {
    return voiceCheckIns.filter(
      (v) => (v.victimToken && assignedTokens.has(v.victimToken)) || (v.docket && assignedDockets.has(v.docket))
    );
  }, [voiceCheckIns, assignedTokens, assignedDockets]);

  // Scoped follow-ups
  const assignedFollowUps = useMemo(() => {
    return followUps.filter(
      (f) => (f.victimToken && assignedTokens.has(f.victimToken)) || (f.docket && assignedDockets.has(f.docket))
    );
  }, [followUps, assignedTokens, assignedDockets]);

  // Scoped survivor messages
  const assignedMessages = useMemo(() => {
    return counsellorMessages.filter(
      (m) => (m.victimToken && assignedTokens.has(m.victimToken)) || (m.docket && assignedDockets.has(m.docket))
    );
  }, [counsellorMessages, assignedTokens, assignedDockets]);

  // ── Top Summary Metrics (strictly calculated from assigned cases) ──
  const summary = useMemo(() => {
    const totalAssigned = cases.length;

    // Unresolved alerts count
    const openAlerts = assignedAlerts.filter((a) => a.status !== "RESOLVED");

    // Upcoming follow-ups (today or future)
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const upcomingFollowUpsCount = assignedFollowUps.filter((f) => {
      if (f.status !== "SCHEDULED") return false;
      const fDate = new Date(f.date);
      return !isNaN(fDate.getTime()) && fDate >= now;
    }).length;

    // Pending reviews: unreviewed voice check-ins + open alerts + unread survivor messages
    const unreviewedVoice = assignedVoiceCheckIns.length;
    const unreadMessages = assignedMessages.filter((m) => !m.read).length;
    const pendingReviewsCount = unreviewedVoice + openAlerts.length + unreadMessages;

    // Cases needing attention
    const attentionCases = new Set<string>();
    cases.forEach((c) => {
      if (c.riskLevel === "CRITICAL" || c.riskLevel === "HIGH") attentionCases.add(c.victimToken);
      if (c.currentDistressScore && c.currentDistressScore >= 70) attentionCases.add(c.victimToken);
    });
    assignedAlerts.forEach((a) => {
      if (a.status !== "RESOLVED" && (a.priority === "P1" || a.priority === "P2" || a.level === "P1" || a.level === "P2")) {
        if (a.victimToken) attentionCases.add(a.victimToken);
      }
    });
    assignedVoiceCheckIns.forEach((v) => {
      if (v.victimToken) attentionCases.add(v.victimToken);
    });

    // Average response time calculation for resolved alerts
    const resolvedWithTimes = assignedAlerts.filter((a) => a.status === "RESOLVED" && a.resolvedAt && a.createdAt);
    let avgResponseTimeText = "—";
    if (resolvedWithTimes.length > 0) {
      const totalMs = resolvedWithTimes.reduce((acc, a) => {
        return acc + (new Date(a.resolvedAt!).getTime() - new Date(a.createdAt).getTime());
      }, 0);
      const avgMinutes = Math.round(totalMs / (resolvedWithTimes.length * 60000));
      if (avgMinutes < 60) avgResponseTimeText = `${avgMinutes}m`;
      else if (avgMinutes < 1440) avgResponseTimeText = `${Math.round(avgMinutes / 60)}h`;
      else avgResponseTimeText = `${(avgMinutes / 1440).toFixed(1)}d`;
    }

    return {
      totalAssigned,
      casesNeedingAttention: attentionCases.size,
      openAlerts: openAlerts.length,
      upcomingFollowUpsCount,
      pendingReviewsCount,
      avgResponseTimeText,
    };
  }, [cases, assignedAlerts, assignedFollowUps, assignedVoiceCheckIns, assignedMessages]);

  // ── Priority Attention Cases with Real Operational Reasons ──
  const priorityAttentionCases = useMemo(() => {
    return cases
      .map((c) => {
        const caseAlerts = assignedAlerts.filter(
          (a) => a.victimToken === c.victimToken || a.caseReference === c.docket
        );
        const p1Alert = caseAlerts.find((a) => (a.priority === "P1" || a.level === "P1") && a.status !== "RESOLVED");
        const p2Alert = caseAlerts.find((a) => (a.priority === "P2" || a.level === "P2") && a.status !== "RESOLVED");
        const voiceCheckIn = assignedVoiceCheckIns.find((v) => v.victimToken === c.victimToken);
        const unreadMsg = assignedMessages.find((m) => !m.read && m.victimToken === c.victimToken);

        const now = new Date();
        const overdueFollowUp = assignedFollowUps.find((f) => {
          if (f.status !== "SCHEDULED") return false;
          if (f.victimToken !== c.victimToken && f.docket !== c.docket) return false;
          const fDate = new Date(f.date);
          return !isNaN(fDate.getTime()) && fDate < now;
        });

        // Determine specific operational reason
        let reason = "";
        let urgencyScore = 0;

        if (p1Alert) {
          reason = `P1 Alert: ${p1Alert.reason || "Urgent safety flag requiring review"}`;
          urgencyScore = 100;
        } else if (voiceCheckIn?.requestCounsellorCall) {
          reason = "Voice check-in: Survivor requested counsellor call";
          urgencyScore = 90;
        } else if (p2Alert) {
          reason = `P2 Alert: ${p2Alert.reason || "Support request"}`;
          urgencyScore = 80;
        } else if (voiceCheckIn) {
          reason = `Voice check-in awaiting review (${voiceCheckIn.channel === "ivrs" ? "IVRS" : "App"})`;
          urgencyScore = 75;
        } else if (unreadMsg?.urgency === "urgent") {
          reason = `Urgent direct message from survivor: "${unreadMsg.subject || unreadMsg.message.slice(0, 40)}"`;
          urgencyScore = 70;
        } else if (overdueFollowUp) {
          reason = `Follow-up overdue since ${formatDate(overdueFollowUp.date)}`;
          urgencyScore = 65;
        } else if (c.riskLevel === "CRITICAL" || c.riskLevel === "HIGH") {
          reason = `High risk level (${c.riskLevel}) · Next hearing: ${c.nextHearingDate ? formatDate(c.nextHearingDate) : "TBD"}`;
          urgencyScore = 60;
        } else if (c.currentDistressScore && c.currentDistressScore >= 70) {
          reason = `Elevated distress observation (${c.currentDistressScore}/100)`;
          urgencyScore = 50;
        } else {
          reason = `Routine monitoring · Stage: ${c.currentStage}`;
          urgencyScore = 10;
        }

        const distress = c.currentDistressScore ?? null;
        const baseline = c.baselineDistressScore ?? null;
        let distressTrend: "rising" | "improving" | "stable" | "insufficient" = "insufficient";
        if (distress !== null && baseline !== null) {
          if (distress - baseline >= 6) distressTrend = "rising";
          else if (distress - baseline <= -6) distressTrend = "improving";
          else distressTrend = "stable";
        }

        return {
          caseRecord: c,
          reason,
          urgencyScore,
          distressScore: distress,
          recoveryScore: c.predicted7dScore ? Math.max(10, 100 - c.predicted7dScore) : null,
          distressTrend,
          lastActivity: voiceCheckIn?.createdAt || c.stageStartedAt || c.registrationDate,
        };
      })
      .filter((item) => item.urgencyScore >= 50)
      .sort((a, b) => b.urgencyScore - a.urgencyScore);
  }, [cases, assignedAlerts, assignedVoiceCheckIns, assignedMessages, assignedFollowUps]);

  // ── Stage Distribution ──
  const stageDistribution = useMemo(() => {
    const counts: Record<string, number> = {
      Registered: 0,
      Investigation: 0,
      Trial: 0,
      Compensation: 0,
      Rehabilitation: 0,
    };
    cases.forEach((c) => {
      const s = c.currentStage || "Registered";
      counts[s] = (counts[s] || 0) + 1;
    });
    return Object.entries(counts).map(([stage, count]) => ({
      stage,
      count,
      pct: cases.length ? Math.round((count / cases.length) * 100) : 0,
    }));
  }, [cases]);

  // ── Risk & Attention Distribution ──
  const riskAttentionMetrics = useMemo(() => {
    const alertPriorities = { P1: 0, P2: 0, P3: 0, P4: 0 };
    assignedAlerts.forEach((a) => {
      const p = (a.priority || a.level || "P4") as keyof typeof alertPriorities;
      if (alertPriorities[p] !== undefined) alertPriorities[p] += 1;
    });

    let risingDistress = 0;
    let improvingRecovery = 0;
    let insufficientEvidence = 0;

    cases.forEach((c) => {
      if (typeof c.currentDistressScore === "number" && typeof c.baselineDistressScore === "number") {
        if (c.currentDistressScore > c.baselineDistressScore + 5) risingDistress += 1;
        else if (c.currentDistressScore < c.baselineDistressScore - 5) improvingRecovery += 1;
        else improvingRecovery += 1;
      } else {
        insufficientEvidence += 1;
      }
    });

    return {
      alertPriorities,
      risingDistress,
      improvingRecovery,
      insufficientEvidence,
    };
  }, [assignedAlerts, cases]);

  // ── Follow-ups categorization (Due Today, Upcoming, Overdue, Completed) ──
  const categorizedFollowUps = useMemo(() => {
    const todayStr = new Date().toISOString().slice(0, 10);
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    const dueToday: typeof assignedFollowUps = [];
    const upcoming: typeof assignedFollowUps = [];
    const overdue: typeof assignedFollowUps = [];
    const completed: typeof assignedFollowUps = [];

    assignedFollowUps.forEach((f) => {
      if (f.status === "COMPLETED") {
        completed.push(f);
        return;
      }
      const fDate = new Date(f.date);
      if (isNaN(fDate.getTime())) return;
      const fDateStr = fDate.toISOString().slice(0, 10);

      if (fDateStr === todayStr) {
        dueToday.push(f);
      } else if (fDate > now) {
        upcoming.push(f);
      } else {
        overdue.push(f);
      }
    });

    return { dueToday, upcoming, overdue, completed };
  }, [assignedFollowUps]);

  // ── Recent Activity Feed ──
  const recentActivity = useMemo(() => {
    const items: Array<{ id: string; type: string; title: string; subtitle: string; time: string; link?: string }> = [];

    assignedVoiceCheckIns.forEach((v) => {
      items.push({
        id: `voice-${v.id}`,
        type: "voice",
        title: `Voice check-in from ${v.survivorName || "Survivor"}`,
        subtitle: v.transcript ? `"${v.transcript.slice(0, 60)}..."` : "Voice observation submitted",
        time: v.createdAt,
        link: v.victimToken ? `/counsellor/cases/${v.victimToken}` : undefined,
      });
    });

    assignedMessages.forEach((m) => {
      items.push({
        id: `msg-${m.id}`,
        type: "message",
        title: `Message from ${m.survivorName}`,
        subtitle: m.subject ? `${m.subject}: ${m.message.slice(0, 50)}...` : `"${m.message.slice(0, 60)}..."`,
        time: m.createdAt,
        link: m.victimToken ? `/counsellor/cases/${m.victimToken}` : undefined,
      });
    });

    assignedAlerts.forEach((a) => {
      items.push({
        id: `alert-${a.id}`,
        type: "alert",
        title: `${a.priority || a.level || "Alert"}: ${a.reason}`,
        subtitle: `Status: ${a.status} · Source: ${a.source || "monitoring"}`,
        time: a.createdAt,
        link: a.victimToken ? `/counsellor/cases/${a.victimToken}` : undefined,
      });
    });

    assignedFollowUps.forEach((f) => {
      items.push({
        id: `fu-${f.id}`,
        type: "followup",
        title: `Follow-up ${f.status === "COMPLETED" ? "completed" : "scheduled"} with ${f.survivorName}`,
        subtitle: f.notes ? f.notes : `Scheduled for ${formatDate(f.date)}`,
        time: f.createdAt || f.date,
        link: f.victimToken ? `/counsellor/cases/${f.victimToken}` : undefined,
      });
    });

    return items
      .filter((item) => !isNaN(new Date(item.time).getTime()))
      .sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
      .slice(0, 8);
  }, [assignedVoiceCheckIns, assignedMessages, assignedAlerts, assignedFollowUps]);

  return (
    <div className="mx-auto max-w-6xl space-y-8 pb-12">
      {/* ── Editorial Header ── */}
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end border-b border-border-color/60 pb-5">
        <div>
          <span className="text-xs font-bold uppercase tracking-[0.2em] text-deep-teal">
            Counsellor Caseload Dashboard
          </span>
          <h1 className="mt-1 font-editorial text-3xl font-bold tracking-tight text-text-primary md:text-4xl">
            Overview
          </h1>
          {counsellorProfile ? (
            <p className="mt-1.5 text-sm text-text-secondary">
              <span className="font-semibold text-text-primary">{counsellorProfile.name}</span>
              {counsellorProfile.specialisation ? ` · ${counsellorProfile.specialisation}` : ""}
              {counsellorProfile.state ? ` · ${counsellorProfile.state}` : ""}
            </p>
          ) : (
            <p className="mt-1 text-sm text-text-secondary">Caseload operational overview.</p>
          )}
        </div>

        <div className="flex items-center gap-2.5">
          <Link
            href="/counsellor/my-cases"
            className="inline-flex items-center gap-2 rounded-xl bg-deep-teal px-4 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-[#0c625b] transition-all"
          >
            <UsersRound size={14} /> My Caseload ({cases.length})
          </Link>
          <Link
            href="/counsellor/alerts"
            className="inline-flex items-center gap-2 rounded-xl border border-border-color bg-[color:var(--surface)] px-4 py-2.5 text-xs font-bold text-text-primary hover:border-deep-teal transition-all"
          >
            <Bell size={14} className="text-deep-teal" /> Alerts
          </Link>
        </div>
      </div>

      {/* ── Top Summary Operational Metrics ── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <Card className="p-4 bg-[color:var(--surface)] border-border-color">
          <CardTitle className="text-[11px] font-bold text-text-secondary">Assigned Cases</CardTitle>
          <p className="mt-2 text-2xl font-bold text-text-primary">{summary.totalAssigned}</p>
          <p className="mt-1 text-[11px] text-text-secondary">Active caseload</p>
        </Card>

        <Card className="p-4 bg-[color:var(--surface)] border-amber/40">
          <CardTitle className="text-[11px] font-bold text-[#b67926]">Needs Attention</CardTitle>
          <p className="mt-2 text-2xl font-bold text-[#b67926]">{summary.casesNeedingAttention}</p>
          <p className="mt-1 text-[11px] text-text-secondary">Urgent / high risk</p>
        </Card>

        <Card className="p-4 bg-[color:var(--surface)] border-warm-peach/40">
          <CardTitle className="text-[11px] font-bold text-warm-peach">Open Alerts</CardTitle>
          <p className="mt-2 text-2xl font-bold text-warm-peach">{summary.openAlerts}</p>
          <p className="mt-1 text-[11px] text-text-secondary">Unresolved</p>
        </Card>

        <Card className="p-4 bg-[color:var(--surface)] border-border-color">
          <CardTitle className="text-[11px] font-bold text-text-secondary">Upcoming Follow-ups</CardTitle>
          <p className="mt-2 text-2xl font-bold text-deep-teal">{summary.upcomingFollowUpsCount}</p>
          <p className="mt-1 text-[11px] text-text-secondary">Scheduled</p>
        </Card>

        <Card className="p-4 bg-[color:var(--surface)] border-border-color">
          <CardTitle className="text-[11px] font-bold text-text-secondary">Pending Reviews</CardTitle>
          <p className="mt-2 text-2xl font-bold text-text-primary">{summary.pendingReviewsCount}</p>
          <p className="mt-1 text-[11px] text-text-secondary">Voice, alert, msgs</p>
        </Card>

        <Card className="p-4 bg-[color:var(--surface)] border-border-color">
          <CardTitle className="text-[11px] font-bold text-text-secondary">Avg. Response</CardTitle>
          <p className="mt-2 text-2xl font-bold text-text-primary">{summary.avgResponseTimeText}</p>
          <p className="mt-1 text-[11px] text-text-secondary">Alert resolution</p>
        </Card>
      </div>

      {/* ── Priority Attention Section (Clinical Operational Focus) ── */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-editorial text-xl font-bold text-text-primary flex items-center gap-2">
              <AlertTriangle size={18} className="text-[#b67926]" /> Priority Attention
            </h2>
            <p className="text-xs text-text-secondary">
              Assigned cases currently requiring counsellor review or intervention.
            </p>
          </div>
          <Link
            href="/counsellor/my-cases"
            className="inline-flex items-center gap-1 text-xs font-semibold text-deep-teal hover:underline"
          >
            View all assigned cases <ArrowRight size={13} />
          </Link>
        </div>

        {loading && <p className="text-sm text-text-secondary">Loading priority cases…</p>}

        {!loading && priorityAttentionCases.length === 0 && (
          <div className="rounded-2xl border border-dashed border-border-color p-8 text-center bg-[color:var(--surface-subtle)]">
            <CheckCircle2 size={24} className="mx-auto text-deep-teal mb-2" />
            <p className="text-sm font-semibold text-text-primary">No urgent priority cases</p>
            <p className="text-xs text-text-secondary mt-1">All assigned cases are within stable monitoring parameters.</p>
          </div>
        )}

        <div className="grid gap-3">
          {priorityAttentionCases.map(({ caseRecord, reason, distressScore, recoveryScore, distressTrend, lastActivity }) => (
            <Link
              key={caseRecord.victimToken}
              href={`/counsellor/cases/${caseRecord.victimToken}`}
              className="group block rounded-2xl border border-border-color/80 bg-[color:var(--surface)] p-4 shadow-sm hover:border-deep-teal hover:shadow-md transition-all"
            >
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                {/* Left: Survivor info & operational reason */}
                <div className="space-y-1.5 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-editorial text-base font-bold text-text-primary group-hover:text-deep-teal transition-colors">
                      {caseRecord.survivorName}
                    </span>
                    <span className="font-mono text-xs text-text-secondary bg-[color:var(--surface-subtle)] px-2 py-0.5 rounded-md border border-border-color/60">
                      {caseRecord.docket}
                    </span>
                    <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-[color:var(--pale-sage)] text-deep-teal border border-deep-teal/20">
                      Stage: {caseRecord.currentStage}
                    </span>
                    {caseRecord.riskLevel && (
                      <Badge
                        tone={
                          caseRecord.riskLevel === "CRITICAL"
                            ? "peach"
                            : caseRecord.riskLevel === "HIGH"
                            ? "amber"
                            : caseRecord.riskLevel === "MODERATE"
                            ? "teal"
                            : "sage"
                        }
                      >
                        {caseRecord.riskLevel} RISK
                      </Badge>
                    )}
                  </div>

                  {/* Operational reason for attention */}
                  <div className="flex items-center gap-2 text-xs">
                    <span className="font-bold text-text-secondary uppercase tracking-wider text-[10px]">Reason:</span>
                    <span className="font-semibold text-[#8b4513] dark:text-[#e8a87c] bg-[#fff5eb] dark:bg-[#2c1d11] px-2.5 py-0.5 rounded-md border border-[#f4cbb2]/60">
                      {reason}
                    </span>
                  </div>
                </div>

                {/* Right: Scores & Trends */}
                <div className="flex flex-wrap items-center gap-4 shrink-0 border-t md:border-t-0 border-border-color/50 pt-2 md:pt-0">
                  <div className="text-right">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-text-secondary">Distress</p>
                    <div className="flex items-center gap-1 justify-end font-semibold text-sm">
                      {distressScore !== null ? (
                        <>
                          <span className={distressScore >= 70 ? "text-warm-peach font-bold" : "text-text-primary"}>
                            {distressScore}
                          </span>
                          <span className="text-text-secondary text-xs">/100</span>
                          {distressTrend === "rising" && <TrendingUp size={14} className="text-warm-peach" />}
                          {distressTrend === "improving" && <TrendingDown size={14} className="text-deep-teal" />}
                        </>
                      ) : (
                        <span className="text-text-secondary text-xs italic">Insufficient data</span>
                      )}
                    </div>
                  </div>

                  <div className="text-right">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-text-secondary">Recovery</p>
                    <div className="font-semibold text-sm text-deep-teal">
                      {recoveryScore !== null ? `${recoveryScore}/100` : "—"}
                    </div>
                  </div>

                  <div className="text-right hidden sm:block">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-text-secondary">Last Active</p>
                    <p className="text-xs text-text-secondary">{formatDate(lastActivity)}</p>
                  </div>

                  <ArrowRight size={16} className="text-text-secondary group-hover:text-deep-teal group-hover:translate-x-1 transition-all" />
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* ── Caseload Distribution & Risk Breakdown ── */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Case Stage Distribution */}
        <Card className="p-5">
          <CardTitle className="flex items-center gap-2">
            <Layers size={16} className="text-deep-teal" /> Case Stage Distribution
          </CardTitle>
          <p className="mt-1 text-xs text-text-secondary">
            Operational progression across your {cases.length} assigned cases.
          </p>

          <div className="mt-4 space-y-3">
            {stageDistribution.map(({ stage, count, pct }) => (
              <div key={stage} className="space-y-1">
                <div className="flex justify-between text-xs font-semibold">
                  <span className="text-text-primary">{stage}</span>
                  <span className="text-text-secondary">
                    {count} {count === 1 ? "case" : "cases"} ({pct}%)
                  </span>
                </div>
                <div className="h-2 w-full rounded-full bg-[color:var(--surface-subtle)] overflow-hidden border border-border-color/50">
                  <div
                    className="h-full rounded-full bg-deep-teal transition-all"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Risk & Attention Distribution */}
        <Card className="p-5">
          <CardTitle className="flex items-center gap-2">
            <ShieldAlert size={16} className="text-deep-teal" /> Risk &amp; Alert Distribution
          </CardTitle>
          <p className="mt-1 text-xs text-text-secondary">
            Aggregate clinical signals and alert urgency across assigned cases.
          </p>

          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-[color:var(--surface-subtle)] border border-border-color/60 p-3">
              <p className="text-[11px] font-bold uppercase tracking-wider text-text-secondary">Alert Urgency</p>
              <div className="mt-2 space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <span className="font-semibold text-warm-peach">P1 (Urgent/Crisis):</span>
                  <span className="font-bold">{riskAttentionMetrics.alertPriorities.P1}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-semibold text-[#b67926]">P2 (Support Req):</span>
                  <span className="font-bold">{riskAttentionMetrics.alertPriorities.P2}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-semibold text-deep-teal">P3 (Watch/Review):</span>
                  <span className="font-bold">{riskAttentionMetrics.alertPriorities.P3}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-secondary">P4 (Informational):</span>
                  <span className="font-bold">{riskAttentionMetrics.alertPriorities.P4}</span>
                </div>
              </div>
            </div>

            <div className="rounded-xl bg-[color:var(--surface-subtle)] border border-border-color/60 p-3">
              <p className="text-[11px] font-bold uppercase tracking-wider text-text-secondary">Caseload Trajectory</p>
              <div className="mt-2 space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-warm-peach font-semibold">Rising distress:</span>
                  <span className="font-bold">{riskAttentionMetrics.risingDistress}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-deep-teal font-semibold">Improving / Stable:</span>
                  <span className="font-bold">{riskAttentionMetrics.improvingRecovery}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-secondary italic">Insufficient data:</span>
                  <span className="font-bold">{riskAttentionMetrics.insufficientEvidence}</span>
                </div>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* ── Pending Reviews (Voice Check-ins, Survivor Messages, Alerts) ── */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Voice Check-ins Awaiting Review */}
        <Card className="p-5 border-deep-teal/30 bg-[#f4f9f7]/60">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-deep-teal">
              <Mic size={16} /> Voice &amp; IVRS Check-ins ({assignedVoiceCheckIns.length})
            </CardTitle>
          </div>
          <p className="mt-1 text-xs text-text-secondary">
            Spoken responses submitted by survivors in your caseload awaiting review.
          </p>

          {assignedVoiceCheckIns.length === 0 && (
            <p className="mt-4 text-xs text-text-secondary italic">No voice check-ins pending review.</p>
          )}

          <div className="mt-3 space-y-2.5 max-h-[360px] overflow-y-auto pr-1">
            {assignedVoiceCheckIns.map((v) => (
              <Link
                key={v.id}
                href={v.victimToken ? `/counsellor/cases/${v.victimToken}` : "#"}
                className="block rounded-xl bg-[color:var(--surface)] border border-border-color p-3 text-sm hover:border-deep-teal transition-all shadow-2xs"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold text-text-primary">{v.survivorName}</span>
                  <div className="flex items-center gap-1.5">
                    {v.requestCounsellorCall && <Badge tone="peach">Call requested</Badge>}
                    <span className="text-[11px] text-text-secondary">{formatDate(v.createdAt)}</span>
                  </div>
                </div>
                <p className="mt-1 text-xs italic text-text-primary bg-[color:var(--surface-subtle)] p-2 rounded-lg line-clamp-2">
                  &ldquo;{v.transcript ?? "Voice recording captured"}&rdquo;
                </p>
                {v.signals && (
                  <div className="mt-2 flex flex-wrap gap-1 text-[10px]">
                    {typeof v.signals.sleep === "number" && (
                      <span className="rounded bg-pale-sage px-1.5 py-0.5 font-medium text-deep-teal">
                        Sleep: {v.signals.sleep}/5
                      </span>
                    )}
                    {typeof v.signals.distressScore === "number" && (
                      <span className="rounded bg-amber/20 px-1.5 py-0.5 font-medium text-[#b67926]">
                        Distress: {v.signals.distressScore}
                      </span>
                    )}
                  </div>
                )}
              </Link>
            ))}
          </div>
        </Card>

        {/* Incoming Messages & Urgent Requests */}
        <Card className="p-5">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <MessageSquare size={16} className="text-deep-teal" /> Survivor Direct Messages
            </CardTitle>
            <Link href="/counsellor/follow-ups" className="text-xs font-semibold text-deep-teal hover:underline">
              Open Follow-ups <ArrowRight size={12} />
            </Link>
          </div>
          <p className="mt-1 text-xs text-text-secondary">
            Direct communication sent by survivors assigned to you.
          </p>

          {assignedMessages.length === 0 && (
            <p className="mt-4 text-xs text-text-secondary italic">No survivor messages.</p>
          )}

          <div className="mt-3 space-y-2.5 max-h-[360px] overflow-y-auto pr-1">
            {assignedMessages.map((m) => (
              <div
                key={m.id}
                className={`rounded-xl border p-3 text-sm transition-all ${
                  !m.read ? "border-deep-teal/40 bg-[color:var(--surface)]" : "border-border-color bg-[color:var(--surface-subtle)] opacity-90"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-text-primary">{m.survivorName}</span>
                    {!m.read && <Badge tone="teal">Unread</Badge>}
                    {m.urgency === "urgent" && <Badge tone="peach">Urgent</Badge>}
                  </div>
                  <span className="text-[11px] text-text-secondary">{formatDate(m.createdAt)}</span>
                </div>
                <p className="mt-1.5 text-xs italic text-text-primary line-clamp-2">
                  &ldquo;{m.message}&rdquo;
                </p>
                {m.replyText && (
                  <p className="mt-1 text-[11px] text-deep-teal font-medium">
                    ✓ Replied: &ldquo;{m.replyText.slice(0, 50)}...&rdquo;
                  </p>
                )}
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* ── Follow-ups Section Categorized by Urgency ── */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-editorial text-xl font-bold text-text-primary flex items-center gap-2">
              <Calendar size={18} className="text-deep-teal" /> Caseload Follow-ups &amp; Sessions
            </h2>
            <p className="text-xs text-text-secondary">
              Scheduled check-ins and survivor session requests for your caseload.
            </p>
          </div>
          <Link
            href="/counsellor/follow-ups"
            className="inline-flex items-center gap-1 text-xs font-semibold text-deep-teal hover:underline"
          >
            Manage follow-ups <ArrowRight size={13} />
          </Link>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {/* Overdue */}
          <div className="rounded-2xl border border-warm-peach/40 bg-[color:var(--surface)] p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-warm-peach">Overdue</span>
              <span className="rounded-full bg-warm-peach/20 px-2 py-0.5 text-xs font-bold text-warm-peach">
                {categorizedFollowUps.overdue.length}
              </span>
            </div>
            <div className="mt-3 space-y-2">
              {categorizedFollowUps.overdue.length === 0 && (
                <p className="text-xs text-text-secondary italic">No overdue follow-ups.</p>
              )}
              {categorizedFollowUps.overdue.map((f) => (
                <div key={f.id} className="rounded-lg bg-[color:var(--surface-subtle)] p-2 text-xs">
                  <p className="font-semibold text-text-primary">{f.survivorName}</p>
                  <p className="text-[11px] text-warm-peach">Due {formatDate(f.date)}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Due Today */}
          <div className="rounded-2xl border border-[#b67926]/40 bg-[color:var(--surface)] p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-[#b67926]">Due Today</span>
              <span className="rounded-full bg-[#b67926]/20 px-2 py-0.5 text-xs font-bold text-[#b67926]">
                {categorizedFollowUps.dueToday.length}
              </span>
            </div>
            <div className="mt-3 space-y-2">
              {categorizedFollowUps.dueToday.length === 0 && (
                <p className="text-xs text-text-secondary italic">No follow-ups due today.</p>
              )}
              {categorizedFollowUps.dueToday.map((f) => (
                <div key={f.id} className="rounded-lg bg-[color:var(--surface-subtle)] p-2 text-xs">
                  <p className="font-semibold text-text-primary">{f.survivorName}</p>
                  {f.requestedBy === "survivor" && <Badge tone="peach">Survivor request</Badge>}
                  {f.preferredTime && <p className="text-[11px] text-text-secondary">Time: {f.preferredTime}</p>}
                </div>
              ))}
            </div>
          </div>

          {/* Upcoming */}
          <div className="rounded-2xl border border-deep-teal/40 bg-[color:var(--surface)] p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-deep-teal">Upcoming</span>
              <span className="rounded-full bg-deep-teal/20 px-2 py-0.5 text-xs font-bold text-deep-teal">
                {categorizedFollowUps.upcoming.length}
              </span>
            </div>
            <div className="mt-3 space-y-2">
              {categorizedFollowUps.upcoming.length === 0 && (
                <p className="text-xs text-text-secondary italic">No upcoming follow-ups.</p>
              )}
              {categorizedFollowUps.upcoming.slice(0, 3).map((f) => (
                <div key={f.id} className="rounded-lg bg-[color:var(--surface-subtle)] p-2 text-xs">
                  <p className="font-semibold text-text-primary">{f.survivorName}</p>
                  <p className="text-[11px] text-text-secondary">Date: {formatDate(f.date)}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Recently Completed */}
          <div className="rounded-2xl border border-border-color bg-[color:var(--surface)] p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-text-secondary">Completed</span>
              <span className="rounded-full bg-[color:var(--surface-subtle)] px-2 py-0.5 text-xs font-bold text-text-secondary">
                {categorizedFollowUps.completed.length}
              </span>
            </div>
            <div className="mt-3 space-y-2">
              {categorizedFollowUps.completed.length === 0 && (
                <p className="text-xs text-text-secondary italic">No completed records yet.</p>
              )}
              {categorizedFollowUps.completed.slice(0, 3).map((f) => (
                <div key={f.id} className="rounded-lg bg-[color:var(--surface-subtle)] p-2 text-xs opacity-80">
                  <p className="font-semibold text-text-primary">{f.survivorName}</p>
                  <p className="text-[11px] text-text-secondary">Done {formatDate(f.date)}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Recent Caseload Activity Log ── */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-editorial text-xl font-bold text-text-primary flex items-center gap-2">
            <Clock size={18} className="text-deep-teal" /> Recent Caseload Activity
          </h2>
        </div>

        <Card className="p-4">
          {recentActivity.length === 0 && (
            <p className="text-xs text-text-secondary italic p-4 text-center">No recent activity recorded.</p>
          )}

          <div className="divide-y divide-border-color/50">
            {recentActivity.map((act) => (
              <div key={act.id} className="py-3 flex items-start justify-between gap-4 first:pt-0 last:pb-0">
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 flex h-7 w-7 items-center justify-center rounded-lg bg-[color:var(--surface-subtle)] border border-border-color text-deep-teal shrink-0">
                    {act.type === "voice" && <Mic size={14} />}
                    {act.type === "message" && <MessageSquare size={14} />}
                    {act.type === "alert" && <ShieldAlert size={14} className="text-warm-peach" />}
                    {act.type === "followup" && <Calendar size={14} />}
                  </span>
                  <div>
                    <p className="text-xs font-semibold text-text-primary">{act.title}</p>
                    <p className="text-[11px] text-text-secondary mt-0.5">{act.subtitle}</p>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <span className="text-[11px] text-text-secondary">{formatDate(act.time)}</span>
                  {act.link && (
                    <div>
                      <Link href={act.link} className="text-[11px] font-semibold text-deep-teal hover:underline">
                        Open case →
                      </Link>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Card>
      </section>
    </div>
  );
}
