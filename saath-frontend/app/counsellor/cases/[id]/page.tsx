"use client";

import { useEffect, useState, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { caseService } from "@/services/case";
import { aiService } from "@/services/ai";
import { CaseRecord, AiOutput, CheckIn, TimelineEvent } from "@/types";
import { EscalationEstimate } from "@/types/escalation";
import { formatDate } from "@/lib/utils";
import { useAppStore } from "@/store/useAppStore";
import {
  AlertTriangle,
  ArrowLeft,
  Bell,
  Calendar,
  CalendarClock,
  Check,
  CheckCircle2,
  ChevronRight,
  Clock,
  FileText,
  HeartHandshake,
  Layers,
  MessageCircle,
  Mic,
  Plus,
  Send,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  TrendingDown,
  TrendingUp,
  UserCheck,
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  ReferenceLine,
} from "recharts";

const BASELINE_DIMENSIONS: { key: keyof CheckIn; label: string; higherIsWorse: boolean }[] = [
  { key: "sleep", label: "Sleep difficulty", higherIsWorse: true },
  { key: "intrusion", label: "Intrusive memories", higherIsWorse: true },
  { key: "avoidance", label: "Avoidance", higherIsWorse: true },
  { key: "socialConnectedness", label: "Social engagement", higherIsWorse: false },
];

function average(nums: number[]) {
  return nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : null;
}

function computeBaselineComparison(checkIns: CheckIn[]) {
  if (checkIns.length < 4) return null;
  const splitPoint = Math.max(2, Math.floor(checkIns.length / 2));
  const baselineWindow = checkIns.slice(0, splitPoint);
  const recentWindow = checkIns.slice(-splitPoint);

  return BASELINE_DIMENSIONS.map(({ key, label, higherIsWorse }) => {
    const baselineAvg = average(baselineWindow.map((c) => Number(c[key])));
    const recentAvg = average(recentWindow.map((c) => Number(c[key])));
    if (baselineAvg === null || recentAvg === null) return { label, direction: "flat" as const, baselineAvg, recentAvg };
    const diff = recentAvg - baselineAvg;
    const THRESHOLD = 0.4;
    let direction: "worse" | "better" | "flat" = "flat";
    if (Math.abs(diff) >= THRESHOLD) {
      const rose = diff > 0;
      direction = rose === higherIsWorse ? "worse" : "better";
    }
    return { label, direction, baselineAvg, recentAvg };
  });
}

const CASE_STAGES = [
  "Registered",
  "Investigation",
  "Trial",
  "Compensation",
  "Rehabilitation",
] as const;

export default function CounsellorCaseDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const victimToken = params.id;

  const followUps = useAppStore((s) => s.followUps);
  const counsellorMessages = useAppStore((s) => s.counsellorMessages);
  const addFollowUp = useAppStore((s) => s.addFollowUp);
  const markFollowUpComplete = useAppStore((s) => s.markFollowUpComplete);
  const markCounsellorMessageRead = useAppStore((s) => s.markCounsellorMessageRead);
  const replyCounsellorMessage = useAppStore((s) => s.replyCounsellorMessage);

  const [caseRecord, setCaseRecord] = useState<CaseRecord | null>(null);
  const [aiOutputs, setAiOutputs] = useState<AiOutput[]>([]);
  const [checkIns, setCheckIns] = useState<CheckIn[]>([]);
  const [timeline, setTimeline] = useState<TimelineEvent[]>([]);
  const [escalation, setEscalation] = useState<EscalationEstimate | null>(null);
  const [caseAlerts, setCaseAlerts] = useState<
    Array<{
      id: string;
      priority?: string;
      level?: string;
      status: string;
      reason: string;
      source?: string;
      createdAt: string;
      resolvedAt?: string;
    }>
  >([]);
  const [voiceCheckIns, setVoiceCheckIns] = useState<
    Array<{
      id: string;
      victimToken?: string;
      survivorName?: string;
      docket?: string;
      createdAt: string;
      transcript?: string;
      channel?: string;
      requestCounsellorCall?: boolean;
      signals?: any;
    }>
  >([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Intervention recommendation state
  const [interventions, setInterventions] = useState<
    Array<{ id: string; type: string; label: string; status: string; date: string; notes?: string }>
  >([
    { id: "int-1", type: "ground", label: "Grounding exercise", status: "Active", date: "2026-09-08", notes: "5-4-3-2-1 sensory grounding suggested" },
    { id: "int-2", type: "breathe", label: "Breathing rhythm", status: "Completed", date: "2026-09-05", notes: "4-7-8 calming rhythm" },
  ]);
  const [newInterventionType, setNewInterventionType] = useState("breathe");
  const [newInterventionNotes, setNewInterventionNotes] = useState("");
  const [showInterventionModal, setShowInterventionModal] = useState(false);

  // Follow-up modal state
  const [showFollowUpModal, setShowFollowUpModal] = useState(false);
  const [followUpDate, setFollowUpDate] = useState("");
  const [followUpTime, setFollowUpTime] = useState("11:00 AM");
  const [followUpNotes, setFollowUpNotes] = useState("");
  const [schedulingFollowUp, setSchedulingFollowUp] = useState(false);

  // Reply state
  const [activeReplyId, setActiveReplyId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");

  // STRICT CASE ISOLATION: Fetch all data specifically for this victimToken/caseId
  useEffect(() => {
    setLoading(true);
    setError(null);

    async function loadCaseData() {
      try {
        const [cRecord, trajectory, history, tLine, esc, allAlerts, allVoice] = await Promise.all([
          caseService.getCase(victimToken),
          aiService.getDistressTrajectory(victimToken).catch(() => []),
          aiService.getCheckInHistory().catch(() => []),
          caseService.getTimeline(victimToken).catch(() => []),
          aiService.getEscalationEstimate(victimToken).catch(() => null),
          aiService.getAlerts().catch(() => []),
          aiService.getCounsellorVoiceCheckIns().catch(() => []),
        ]);

        if (!cRecord) {
          setError("Case not found or you do not have permission to access it.");
          return;
        }

        setCaseRecord(cRecord);
        setAiOutputs(trajectory);
        setCheckIns(Array.isArray(history) ? (history as CheckIn[]) : []);
        setTimeline(tLine);
        setEscalation(esc);

        // Filter alerts strictly for this case
        const matchedAlerts = (allAlerts as any[]).filter(
          (a) => a.victimToken === victimToken || a.caseReference === cRecord.docket
        );
        setCaseAlerts(matchedAlerts);

        // Filter voice check-ins strictly for this case
        const matchedVoice = (allVoice as any[]).filter(
          (v) => v.victimToken === victimToken || v.docket === cRecord.docket
        );
        setVoiceCheckIns(matchedVoice);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load case.");
      } finally {
        setLoading(false);
      }
    }

    loadCaseData();
  }, [victimToken]);

  // Filter messages and follow-ups strictly for this case
  const caseFollowUps = useMemo(() => {
    return followUps.filter(
      (f) => f.victimToken === victimToken || (caseRecord?.docket && f.docket === caseRecord.docket)
    );
  }, [followUps, victimToken, caseRecord]);

  const caseMessages = useMemo(() => {
    return counsellorMessages.filter(
      (m) => m.victimToken === victimToken || (caseRecord?.docket && m.docket === caseRecord.docket)
    );
  }, [counsellorMessages, victimToken, caseRecord]);

  // Observations Chart Data (Strictly this survivor)
  const chartData = useMemo(() => {
    if (aiOutputs.length > 0) {
      return aiOutputs.map((a) => ({
        date: formatDate(a.timestamp),
        distress: a.distressScore,
        recovery: a.recoveryScore,
      }));
    }
    // Fallback if checkIns exist
    if (checkIns.length > 0) {
      return checkIns.map((c) => ({
        date: formatDate(c.timestamp),
        distress: c.distressScore ?? (c.mood ? 100 - c.mood * 20 : 50),
        recovery: c.mood ? c.mood * 20 : 50,
      }));
    }
    return [];
  }, [aiOutputs, checkIns]);

  const latestOutput = aiOutputs.at(-1);
  const baselineComparison = computeBaselineComparison(checkIns);
  const baselineDistressAvg =
    aiOutputs.length >= 4
      ? average(aiOutputs.slice(0, Math.max(2, Math.floor(aiOutputs.length / 2))).map((a) => a.distressScore))
      : caseRecord?.baselineDistressScore ?? null;

  // Handle Alert Acknowledge
  const handleAcknowledgeAlert = async (alertId: string) => {
    try {
      await aiService.acknowledgeAlert(alertId);
      setCaseAlerts((prev) =>
        prev.map((a) => (a.id === alertId ? { ...a, status: "ACKNOWLEDGED" } : a))
      );
    } catch {
      // local update
      setCaseAlerts((prev) =>
        prev.map((a) => (a.id === alertId ? { ...a, status: "ACKNOWLEDGED" } : a))
      );
    }
  };

  // Handle Alert Resolve
  const handleResolveAlert = async (alertId: string) => {
    try {
      await aiService.resolveAlert(alertId, "Resolved by counsellor during review.");
      setCaseAlerts((prev) =>
        prev.map((a) => (a.id === alertId ? { ...a, status: "RESOLVED", resolvedAt: new Date().toISOString() } : a))
      );
    } catch {
      setCaseAlerts((prev) =>
        prev.map((a) => (a.id === alertId ? { ...a, status: "RESOLVED", resolvedAt: new Date().toISOString() } : a))
      );
    }
  };

  // Handle Schedule Follow-up
  const handleScheduleFollowUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!caseRecord || !followUpDate) return;
    setSchedulingFollowUp(true);
    try {
      const isoDate = new Date(`${followUpDate}T10:00:00`).toISOString();
      const res = await caseService.createFollowUp({
        caseId: caseRecord.id,
        date: isoDate,
        notes: `${followUpTime ? `Time: ${followUpTime}. ` : ""}${followUpNotes}`.trim(),
      });
      addFollowUp({
        id: res.followUpId || `fu-${Date.now()}`,
        caseId: caseRecord.id,
        victimToken: caseRecord.victimToken,
        survivorName: caseRecord.survivorName,
        docket: caseRecord.docket,
        date: isoDate,
        preferredTime: followUpTime,
        notes: followUpNotes,
        status: "SCHEDULED",
        createdAt: new Date().toISOString(),
        requestedBy: "counsellor",
      });
      setShowFollowUpModal(false);
      setFollowUpDate("");
      setFollowUpNotes("");
    } finally {
      setSchedulingFollowUp(false);
    }
  };

  // Handle Send Reply
  const handleSendReply = (messageId: string) => {
    if (!replyText.trim()) return;
    replyCounsellorMessage(messageId, replyText.trim());
    setActiveReplyId(null);
    setReplyText("");
  };

  // Handle Recommend Intervention
  const handleAddIntervention = (e: React.FormEvent) => {
    e.preventDefault();
    const labelMap: Record<string, string> = {
      breathe: "Breathing rhythm & Calm audio",
      ground: "5-4-3-2-1 Sensory grounding",
      sleep: "Sleep stabilization guide",
      psychoeducation: "Trauma response understanding",
      safecircle: "Safe circle re-engagement",
    };
    const newItem = {
      id: `int-${Date.now()}`,
      type: newInterventionType,
      label: labelMap[newInterventionType] || "Intervention",
      status: "Recommended",
      date: new Date().toISOString().slice(0, 10),
      notes: newInterventionNotes || "Recommended by counsellor",
    };
    setInterventions((prev) => [newItem, ...prev]);
    setShowInterventionModal(false);
    setNewInterventionNotes("");
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-5xl py-12 text-center text-text-secondary">
        <div className="h-8 w-8 rounded-full border-2 border-deep-teal border-t-transparent animate-spin mx-auto mb-3" />
        <p className="text-sm">Loading case review…</p>
      </div>
    );
  }

  if (error || !caseRecord) {
    return (
      <div className="mx-auto max-w-2xl py-12 text-center">
        <div className="rounded-2xl border border-warm-peach/40 bg-[color:var(--error-bg)] p-8">
          <ShieldAlert size={32} className="mx-auto text-warm-peach mb-3" />
          <h2 className="font-editorial text-2xl font-bold text-text-primary">Access Restricted</h2>
          <p className="mt-2 text-sm text-text-secondary">
            {error || "You are not authorized to access this case."}
          </p>
          <div className="mt-6">
            <Link
              href="/counsellor/my-cases"
              className="inline-flex items-center gap-2 rounded-xl bg-deep-teal px-4 py-2 text-xs font-bold text-white"
            >
              <ArrowLeft size={14} /> Back to My Caseload
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Active stage index in pipeline
  const currentStageIndex = CASE_STAGES.indexOf(
    (caseRecord.currentStage as any) || "Registered"
  );

  return (
    <div className="mx-auto max-w-5xl space-y-8 pb-16">
      {/* ── Top Navigation & Case Header ── */}
      <div className="space-y-4">
        <Link
          href="/counsellor/my-cases"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-text-secondary hover:text-deep-teal transition-colors"
        >
          <ArrowLeft size={13} /> Back to Assigned Caseload
        </Link>

        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start border-b border-border-color/60 pb-5">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="font-editorial text-3xl font-bold text-text-primary md:text-4xl">
                {caseRecord.survivorName}
              </h1>
              <span className="font-mono text-xs text-text-secondary bg-[color:var(--surface-subtle)] px-2.5 py-1 rounded-lg border border-border-color/60 font-semibold">
                {caseRecord.docket}
              </span>
              <span className="rounded-full bg-[color:var(--pale-sage)] px-3 py-1 text-xs font-bold text-deep-teal border border-deep-teal/30">
                {caseRecord.currentStage}
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

            <p className="mt-2 text-xs text-text-secondary flex flex-wrap gap-x-3 gap-y-1">
              <span><strong>Category:</strong> {caseRecord.caseCategory || "Special Support"}</span>
              <span>•</span>
              <span><strong>District:</strong> {caseRecord.district}, {caseRecord.state}</span>
              <span>•</span>
              <span><strong>Registered:</strong> {formatDate(caseRecord.registrationDate)}</span>
              <span>•</span>
              <span><strong>Assigned Counsellor:</strong> {caseRecord.assignedCounsellor?.name || "Active Session"}</span>
            </p>
          </div>

          <div className="flex flex-wrap gap-2 shrink-0">
            <Button size="sm" onClick={() => setShowFollowUpModal(true)} className="flex items-center gap-1.5">
              <CalendarClock size={14} /> Schedule Follow-up
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => setShowInterventionModal(true)}
              className="flex items-center gap-1.5"
            >
              <Sparkles size={14} /> Recommend Support
            </Button>
          </div>
        </div>
      </div>

      {/* ── Case Stage Progression Timeline ── */}
      <section className="rounded-2xl border border-border-color bg-[color:var(--surface)] p-5 shadow-sm">
        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-text-secondary mb-4 flex items-center gap-2">
          <Layers size={14} className="text-deep-teal" /> Legal &amp; Support Progression Pipeline
        </p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
          {CASE_STAGES.map((stg, idx) => {
            const isCompleted = idx < currentStageIndex;
            const isCurrent = idx === currentStageIndex;
            return (
              <div
                key={stg}
                className={`rounded-xl p-3 text-center border transition-all ${
                  isCurrent
                    ? "bg-deep-teal text-white border-deep-teal shadow-sm font-bold"
                    : isCompleted
                    ? "bg-[color:var(--pale-sage)] text-deep-teal border-deep-teal/20 font-semibold"
                    : "bg-[color:var(--surface-subtle)] text-text-secondary border-border-color/50"
                }`}
              >
                <div className="text-[10px] uppercase tracking-wider opacity-80">Step {idx + 1}</div>
                <div className="text-xs mt-0.5">{stg}</div>
                {isCurrent && <div className="text-[10px] mt-1 text-[#a7f3d0]">Current Stage</div>}
                {isCompleted && <div className="text-[10px] mt-1">✓ Completed</div>}
              </div>
            );
          })}
        </div>
      </section>

      {/* ── Distress & Recovery Snapshots ── */}
      <div className="grid gap-4 sm:grid-cols-2">
        {/* Distress Snapshot */}
        <Card className="p-5 border-l-4 border-l-warm-peach">
          <p className="text-[11px] font-bold uppercase tracking-wider text-text-secondary">
            Current Distress Snapshot
          </p>
          <div className="mt-2 flex items-baseline justify-between">
            <div className="flex items-baseline gap-1.5">
              <span className="font-editorial text-4xl font-bold text-text-primary">
                {caseRecord.currentDistressScore ?? (latestOutput?.distressScore ?? "—")}
              </span>
              <span className="text-sm text-text-secondary">/ 100</span>
            </div>
            <div className="text-right">
              {caseRecord.baselineDistressScore ? (
                <span className="text-xs text-text-secondary">
                  Baseline: <strong>{caseRecord.baselineDistressScore}</strong>
                </span>
              ) : null}
            </div>
          </div>

          <div className="mt-3 flex flex-wrap gap-1.5 text-xs">
            <Badge tone={latestOutput?.insufficientEvidence || checkIns.length < 2 ? "neutral" : "teal"}>
              {latestOutput?.insufficientEvidence || checkIns.length < 2
                ? "Insufficient evidence yet"
                : `Confidence: ${latestOutput?.confidence || "Moderate"}`}
            </Badge>
            {caseRecord.predicted7dScore && (
              <Badge tone="amber">7-day risk estimate: {caseRecord.predicted7dScore}%</Badge>
            )}
          </div>

          {latestOutput?.contributingSignals && latestOutput.contributingSignals.length > 0 && (
            <div className="mt-3 border-t border-border-color/50 pt-2.5">
              <p className="text-[11px] font-bold text-text-secondary uppercase tracking-wider">Contributing Signals:</p>
              <ul className="mt-1 space-y-1 text-xs text-text-primary">
                {latestOutput.contributingSignals.map((sig, i) => (
                  <li key={i}>• {sig}</li>
                ))}
              </ul>
            </div>
          )}
        </Card>

        {/* Recovery Snapshot */}
        <Card className="p-5 border-l-4 border-l-deep-teal">
          <p className="text-[11px] font-bold uppercase tracking-wider text-text-secondary">
            Recovery &amp; Stabilization Snapshot
          </p>
          <div className="mt-2 flex items-baseline justify-between">
            <div className="flex items-baseline gap-1.5">
              <span className="font-editorial text-4xl font-bold text-deep-teal">
                {latestOutput?.recoveryScore ?? (caseRecord.predicted7dScore ? Math.max(10, 100 - caseRecord.predicted7dScore) : "—")}
              </span>
              <span className="text-sm text-text-secondary">/ 100</span>
            </div>
            <span className="text-xs text-deep-teal font-semibold">
              Trajectory: {latestOutput?.escalationEstimate || "Active stabilization"}
            </span>
          </div>

          <p className="mt-3 text-xs text-text-secondary">
            {caseRecord.rehabilitationStatus
              ? `Rehabilitation status: ${caseRecord.rehabilitationStatus}`
              : "Ongoing continuous support"}
          </p>

          <div className="mt-3 border-t border-border-color/50 pt-2.5">
            <p className="text-[11px] font-bold text-text-secondary uppercase tracking-wider">Recommended Focus:</p>
            <p className="mt-1 text-xs text-text-primary font-medium">
              {latestOutput?.recommendedIntervention || "Maintain regular voluntary check-in cadence."}
            </p>
          </div>
        </Card>
      </div>

      {/* ── Distress & Recovery Trend Graph (Strictly Survivor Isolated) ── */}
      <Card className="p-5">
        <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
          <div>
            <CardTitle>Distress &amp; Recovery Observations</CardTitle>
            <p className="text-xs text-text-secondary mt-0.5">
              Historical timeline of check-in observations for {caseRecord.survivorName} only.
            </p>
          </div>
          {baselineDistressAvg !== null && (
            <span className="text-xs font-semibold text-text-secondary bg-[color:var(--surface-subtle)] px-2.5 py-1 rounded-lg border border-border-color/60">
              Personal baseline: {baselineDistressAvg}
            </span>
          )}
        </div>

        {chartData.length < 2 ? (
          <div className="mt-6 rounded-xl border border-dashed border-border-color bg-[color:var(--surface-subtle)] p-8 text-center">
            <Clock size={24} className="mx-auto text-text-secondary mb-2" />
            <p className="text-sm font-semibold text-text-primary">Insufficient evidence for longitudinal trend</p>
            <p className="mt-1 text-xs text-text-secondary max-w-md mx-auto">
              This survivor has {chartData.length} check-in recorded so far. A longitudinal trend graph will render automatically once 2 or more observations are logged.
            </p>
          </div>
        ) : (
          <div className="mt-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#C8D3D0" />
                <XAxis dataKey="date" fontSize={11} stroke="#46565A" />
                <YAxis fontSize={11} stroke="#46565A" domain={[0, 100]} />
                <Tooltip />
                {baselineDistressAvg !== null && (
                  <ReferenceLine
                    y={baselineDistressAvg}
                    stroke="#8a9b94"
                    strokeDasharray="4 4"
                    label={{
                      value: "Personal baseline",
                      position: "insideTopLeft",
                      fontSize: 10,
                      fill: "#8a9b94",
                    }}
                  />
                )}
                <Line
                  type="monotone"
                  dataKey="distress"
                  stroke="#E89A78"
                  strokeWidth={2.5}
                  name="Distress score"
                  dot={{ r: 4 }}
                />
                <Line
                  type="monotone"
                  dataKey="recovery"
                  stroke="#0F766E"
                  strokeWidth={2.5}
                  name="Recovery score"
                  dot={{ r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </Card>

      {/* ── Case Alerts Section with Actionable Controls ── */}
      {caseAlerts.length > 0 && (
        <Card className="p-5 border-warm-peach/40">
          <CardTitle className="flex items-center gap-2 text-warm-peach">
            <ShieldAlert size={18} /> Active &amp; Recent Alerts ({caseAlerts.length})
          </CardTitle>
          <div className="mt-3 space-y-2.5">
            {caseAlerts.map((alt) => (
              <div
                key={alt.id}
                className="flex flex-col justify-between gap-3 rounded-xl border border-border-color bg-[color:var(--surface)] p-3.5 sm:flex-row sm:items-center"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <Badge tone={alt.priority === "P1" ? "peach" : alt.priority === "P2" ? "amber" : "teal"}>
                      {alt.priority || alt.level || "P3"}
                    </Badge>
                    <span className="font-semibold text-xs text-text-primary">{alt.reason}</span>
                    <Badge tone={alt.status === "RESOLVED" ? "sage" : alt.status === "ACKNOWLEDGED" ? "amber" : "peach"}>
                      {alt.status}
                    </Badge>
                  </div>
                  <p className="mt-1 text-[11px] text-text-secondary">
                    Triggered {formatDate(alt.createdAt)} · Source: {alt.source || "monitoring"}
                    {alt.resolvedAt ? ` · Resolved ${formatDate(alt.resolvedAt)}` : ""}
                  </p>
                </div>

                {alt.status !== "RESOLVED" && (
                  <div className="flex items-center gap-2 shrink-0">
                    {alt.status === "NEW" && (
                      <Button size="sm" variant="secondary" onClick={() => handleAcknowledgeAlert(alt.id)}>
                        <Check size={13} /> Acknowledge
                      </Button>
                    )}
                    <Button size="sm" onClick={() => handleResolveAlert(alt.id)}>
                      <CheckCircle2 size={13} /> Resolve
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* ── Case Context & Legal Aid Details ── */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card className="p-5">
          <CardTitle className="flex items-center gap-2">
            <FileText size={16} className="text-deep-teal" /> Formal Case Details
          </CardTitle>
          <div className="mt-3 divide-y divide-border-color/50 text-xs">
            <div className="py-2 flex justify-between">
              <span className="text-text-secondary">FIR status:</span>
              <span className="font-semibold text-text-primary">{caseRecord.firStatus || "Registered"}</span>
            </div>
            <div className="py-2 flex justify-between">
              <span className="text-text-secondary">Investigation status:</span>
              <span className="font-semibold text-text-primary">{caseRecord.investigationStatus || "In Progress"}</span>
            </div>
            <div className="py-2 flex justify-between">
              <span className="text-text-secondary">Next Court Hearing:</span>
              <span className="font-semibold text-deep-teal">
                {caseRecord.nextHearingDate ? formatDate(caseRecord.nextHearingDate) : "To be scheduled"}
              </span>
            </div>
            <div className="py-2 flex justify-between">
              <span className="text-text-secondary">Protection status:</span>
              <span className="font-semibold text-text-primary">{caseRecord.protectionStatus || "Not requested"}</span>
            </div>
            <div className="py-2 flex justify-between">
              <span className="text-text-secondary">Legal Aid:</span>
              <span className="font-semibold text-text-primary">{caseRecord.legalAidStatus || "Assigned"}</span>
            </div>
            <div className="py-2 flex justify-between">
              <span className="text-text-secondary">Financial relief:</span>
              <span className="font-semibold text-text-primary">{caseRecord.compensationStatus || "Under review"}</span>
            </div>
          </div>
        </Card>

        {/* Assigned Interventions */}
        <Card className="p-5">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Sparkles size={16} className="text-deep-teal" /> Care Interventions
            </CardTitle>
            <button
              onClick={() => setShowInterventionModal(true)}
              className="text-xs font-semibold text-deep-teal hover:underline flex items-center gap-1"
            >
              <Plus size={13} /> Add
            </button>
          </div>
          <p className="text-xs text-text-secondary mt-1">Recommended &amp; active support exercises.</p>

          <div className="mt-3 space-y-2">
            {interventions.map((int) => (
              <div
                key={int.id}
                className="rounded-xl border border-border-color bg-[color:var(--surface-subtle)] p-3 text-xs flex justify-between items-start"
              >
                <div>
                  <p className="font-semibold text-text-primary">{int.label}</p>
                  <p className="text-[11px] text-text-secondary mt-0.5">{int.notes}</p>
                </div>
                <Badge tone={int.status === "Active" ? "teal" : int.status === "Completed" ? "sage" : "amber"}>
                  {int.status}
                </Badge>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* ── Survivor Direct Messages ── */}
      {caseMessages.length > 0 && (
        <Card className="p-5 border-deep-teal/30 bg-[#f4f9f7]/60">
          <CardTitle className="flex items-center gap-2 text-deep-teal">
            <MessageCircle size={18} /> Direct Messages from {caseRecord.survivorName} ({caseMessages.length})
          </CardTitle>
          <div className="mt-3 space-y-3">
            {caseMessages.map((m) => (
              <div key={m.id} className="rounded-xl border border-border-color bg-white p-3.5 text-xs shadow-2xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-text-primary">{m.subject || "Message"}</span>
                    {!m.read && <Badge tone="teal">Unread</Badge>}
                    {m.urgency === "urgent" && <Badge tone="peach">Urgent</Badge>}
                  </div>
                  <span className="text-[11px] text-text-secondary">{formatDate(m.createdAt)}</span>
                </div>
                <p className="mt-2 rounded-lg bg-[color:var(--surface-subtle)] p-2.5 italic text-text-primary">
                  &ldquo;{m.message}&rdquo;
                </p>

                {m.replyText && (
                  <div className="mt-2 rounded-lg bg-[#eef7f4] p-2.5 text-text-primary border border-[#cfdfd8]">
                    <span className="font-bold text-deep-teal">Your reply:</span> {m.replyText}
                  </div>
                )}

                <div className="mt-2.5 flex justify-end gap-2">
                  {!m.read && (
                    <Button size="sm" variant="secondary" onClick={() => markCounsellorMessageRead(m.id)}>
                      <Check size={13} /> Mark read
                    </Button>
                  )}
                  {activeReplyId !== m.id && (
                    <Button
                      size="sm"
                      variant={m.replyText ? "secondary" : "primary"}
                      onClick={() => {
                        setActiveReplyId(m.id);
                        setReplyText(m.replyText ?? "");
                      }}
                    >
                      {m.replyText ? "Edit reply" : "Reply"}
                    </Button>
                  )}
                </div>

                {activeReplyId === m.id && (
                  <div className="mt-3 border-t border-border-color/60 pt-3 space-y-2">
                    <textarea
                      rows={2}
                      placeholder="Write a supportive reply..."
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      className="w-full rounded-xl border border-border-color bg-white p-2.5 text-xs text-text-primary outline-none focus:border-deep-teal resize-none"
                    />
                    <div className="flex justify-end gap-2">
                      <Button size="sm" variant="secondary" onClick={() => setActiveReplyId(null)}>
                        Cancel
                      </Button>
                      <Button size="sm" onClick={() => handleSendReply(m.id)} disabled={!replyText.trim()}>
                        <Send size={13} /> Send reply
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* ── Scheduled Follow-ups for This Case ── */}
      <Card className="p-5">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <CalendarClock size={16} className="text-deep-teal" /> Follow-ups for this Case ({caseFollowUps.length})
          </CardTitle>
          <Button size="sm" onClick={() => setShowFollowUpModal(true)} className="flex items-center gap-1">
            <Plus size={13} /> Schedule New
          </Button>
        </div>

        {caseFollowUps.length === 0 && (
          <p className="mt-3 text-xs text-text-secondary italic">No follow-ups currently scheduled for this case.</p>
        )}

        <div className="mt-3 space-y-2">
          {caseFollowUps.map((f) => (
            <div
              key={f.id}
              className="flex items-center justify-between rounded-xl border border-border-color bg-[color:var(--surface)] p-3 text-xs"
            >
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-text-primary">Due: {formatDate(f.date)}</span>
                  {f.requestedBy === "survivor" && <Badge tone="peach">Survivor request</Badge>}
                  <Badge tone={f.status === "COMPLETED" ? "sage" : "teal"}>{f.status}</Badge>
                </div>
                {f.preferredTime && <p className="text-[11px] text-text-secondary mt-0.5">Time: {f.preferredTime}</p>}
                {f.notes && <p className="text-[11px] text-text-secondary mt-0.5">{f.notes}</p>}
              </div>

              {f.status !== "COMPLETED" && (
                <Button size="sm" variant="secondary" onClick={() => markFollowUpComplete(f.id)}>
                  <Check size={13} /> Mark completed
                </Button>
              )}
            </div>
          ))}
        </div>
      </Card>

      {/* ── Recent Check-in History Signals ── */}
      {checkIns.length > 0 && (
        <Card className="p-5">
          <CardTitle>Recent Check-in Observations ({checkIns.length})</CardTitle>
          <p className="text-xs text-text-secondary mt-0.5">
            Voluntary wellness responses recorded directly by this survivor.
          </p>

          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="border-b border-border-color text-text-secondary uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-2 pr-3">Date</th>
                  <th className="py-2 px-2">Type</th>
                  <th className="py-2 px-2">Sleep</th>
                  <th className="py-2 px-2">Fear</th>
                  <th className="py-2 px-2">Intrusion</th>
                  <th className="py-2 px-2">Social</th>
                  <th className="py-2 pl-2 text-right">Distress Signal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-color/50">
                {checkIns.slice(-6).reverse().map((c, i) => (
                  <tr key={i} className="hover:bg-[color:var(--surface-subtle)] transition-colors">
                    <td className="py-2.5 pr-3 font-medium">{formatDate(c.timestamp)}</td>
                    <td className="py-2.5 px-2 capitalize">{c.type || "Check-in"}</td>
                    <td className="py-2.5 px-2">{c.sleep !== undefined ? `${c.sleep}/5` : "—"}</td>
                    <td className="py-2.5 px-2">{c.fear !== undefined ? `${c.fear}/5` : "—"}</td>
                    <td className="py-2.5 px-2">{c.intrusion !== undefined ? `${c.intrusion}/5` : "—"}</td>
                    <td className="py-2.5 px-2">{c.socialConnectedness !== undefined ? `${c.socialConnectedness}/5` : "—"}</td>
                    <td className="py-2.5 pl-2 text-right font-semibold text-deep-teal">
                      {c.distressScore !== undefined ? `${c.distressScore}/100` : c.mood ? `${100 - c.mood * 20}/100` : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* ── Schedule Follow-up Modal ── */}
      {showFollowUpModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl border border-border-color bg-[color:var(--surface)] p-6 shadow-xl">
            <h3 className="font-editorial text-xl font-bold text-text-primary">
              Schedule Follow-up with {caseRecord.survivorName}
            </h3>
            <p className="mt-1 text-xs text-text-secondary">
              Set a dedicated check-in date for this case.
            </p>

            <form onSubmit={handleScheduleFollowUp} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-bold text-text-secondary uppercase tracking-wider mb-1">
                  Follow-up Date
                </label>
                <Input
                  type="date"
                  required
                  value={followUpDate}
                  onChange={(e) => setFollowUpDate(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-text-secondary uppercase tracking-wider mb-1">
                  Preferred Time Slot
                </label>
                <select
                  value={followUpTime}
                  onChange={(e) => setFollowUpTime(e.target.value)}
                  className="w-full rounded-xl border border-border-color bg-white px-3 py-2 text-xs text-text-primary outline-none focus:border-deep-teal"
                >
                  <option value="10:00 AM">10:00 AM – Morning</option>
                  <option value="11:30 AM">11:30 AM – Morning</option>
                  <option value="02:30 PM">02:30 PM – Afternoon</option>
                  <option value="04:00 PM">04:00 PM – Evening</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-text-secondary uppercase tracking-wider mb-1">
                  Session Notes (Optional)
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Discuss court hearing preparation or sleep improvement"
                  value={followUpNotes}
                  onChange={(e) => setFollowUpNotes(e.target.value)}
                  className="w-full rounded-xl border border-border-color bg-white p-2.5 text-xs text-text-primary outline-none focus:border-deep-teal resize-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-border-color/50">
                <Button size="sm" variant="secondary" type="button" onClick={() => setShowFollowUpModal(false)}>
                  Cancel
                </Button>
                <Button size="sm" type="submit" disabled={schedulingFollowUp || !followUpDate}>
                  {schedulingFollowUp ? "Scheduling..." : "Confirm Schedule"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Recommend Intervention Modal ── */}
      {showInterventionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl border border-border-color bg-[color:var(--surface)] p-6 shadow-xl">
            <h3 className="font-editorial text-xl font-bold text-text-primary">
              Recommend Support Intervention
            </h3>
            <p className="mt-1 text-xs text-text-secondary">
              Assign a grounding or stabilization exercise for {caseRecord.survivorName}.
            </p>

            <form onSubmit={handleAddIntervention} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-bold text-text-secondary uppercase tracking-wider mb-1">
                  Intervention Exercise
                </label>
                <select
                  value={newInterventionType}
                  onChange={(e) => setNewInterventionType(e.target.value)}
                  className="w-full rounded-xl border border-border-color bg-white px-3 py-2.5 text-xs text-text-primary outline-none focus:border-deep-teal"
                >
                  <option value="breathe">Breathing rhythm & Calm audio</option>
                  <option value="ground">5-4-3-2-1 Sensory Grounding</option>
                  <option value="sleep">Sleep stabilization routine</option>
                  <option value="psychoeducation">Trauma response guide</option>
                  <option value="safecircle">Safe circle re-engagement</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-text-secondary uppercase tracking-wider mb-1">
                  Instructions / Counsellor Note
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Try this 2-minute exercise before going to sleep"
                  value={newInterventionNotes}
                  onChange={(e) => setNewInterventionNotes(e.target.value)}
                  className="w-full rounded-xl border border-border-color bg-white p-2.5 text-xs text-text-primary outline-none focus:border-deep-teal resize-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-border-color/50">
                <Button size="sm" variant="secondary" type="button" onClick={() => setShowInterventionModal(false)}>
                  Cancel
                </Button>
                <Button size="sm" type="submit">
                  Recommend Exercise
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}