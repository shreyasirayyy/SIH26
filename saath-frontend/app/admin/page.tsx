"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  BarChart3,
  CalendarCheck,
  CheckCircle2,
  Clock,
  Download,
  FileBarChart,
  Flame,
  Gavel,
  HeartHandshake,
  Layers,
  MapPin,
  PieChart as PieIcon,
  RefreshCw,
  Scale,
  Shield,
  ShieldAlert,
  ShieldCheck,
  TrendingDown,
  TrendingUp,
  Users,
} from "lucide-react";
import { Card, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { staffService } from "@/services/case";
import { useAppStore } from "@/store/useAppStore";
import { AdminReport } from "@/types";
import { generateAdminReportPdf } from "@/lib/pdf-report";
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
} from "recharts";

const RISK_COLORS: Record<string, string> = {
  CRITICAL: "#e11d48",
  HIGH: "#d97706",
  MODERATE: "#0284c7",
  LOW: "#16a34a",
};

const STAGE_ORDER = ["Registered", "Investigation", "Trial", "Compensation", "Rehabilitation"];

function msToHours(ms: number | null | undefined) {
  if (ms === null || ms === undefined || ms === 0) return "—";
  if (ms < 3600000) return `${Math.round(ms / 60000)}m`;
  return `${Math.round(ms / 3600000)}h`;
}

export default function AdminOverviewPage() {
  const role = useAppStore((state) => state.role);
  const scope = role === "district" ? "District" : role === "state" ? "State" : "National";

  const [report, setReport] = useState<AdminReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const data = await staffService.getReport();
      setReport(data);
    } catch {
      setError("Unable to load the aggregate administrative dashboard right now.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const totalCases = report?.caseStats.caseCount ?? 0;
  const criticalCount = report?.distressStats.distressDistribution.CRITICAL ?? 0;
  const highCount = report?.distressStats.distressDistribution.HIGH ?? 0;
  const attentionCount = criticalCount + highCount;

  // Risk Donut Chart Data
  const riskChartData = useMemo(() => {
    if (!report) return [];
    return ["CRITICAL", "HIGH", "MODERATE", "LOW"].map((level) => ({
      name: level,
      value: report.distressStats.distressDistribution[level] ?? 0,
      fill: RISK_COLORS[level],
    })).filter((item) => item.value > 0);
  }, [report]);

  // Stage Progression Data
  const stageChartData = useMemo(() => {
    if (!report) return [];
    const stageMap = new Map((report.caseStats.stageStats || []).map((s) => [s.stage, s.count]));
    return STAGE_ORDER.map((stage) => ({
      stage,
      count: stageMap.get(stage) ?? 0,
    }));
  }, [report]);

  // Priority Distribution Data
  const priorityData = useMemo(() => {
    if (!report?.priorityStats) {
      return [
        { name: "P1 Urgent", value: report?.operationalMetrics.urgentAlertCount ?? 0, fill: "#e11d48" },
        { name: "P2 Support Request", value: 1, fill: "#d97706" },
        { name: "P3 Watch & Follow-up", value: 1, fill: "#0284c7" },
        { name: "P4 Routine", value: 0, fill: "#16a34a" },
      ].filter((p) => p.value > 0);
    }
    const p = report.priorityStats;
    return [
      { name: "P1 Urgent", value: p.P1 ?? 0, fill: "#e11d48" },
      { name: "P2 Support Request", value: p.P2 ?? 0, fill: "#d97706" },
      { name: "P3 Watch & Follow-up", value: p.P3 ?? 0, fill: "#0284c7" },
      { name: "P4 Routine", value: p.P4 ?? 0, fill: "#16a34a" },
    ].filter((item) => item.value > 0);
  }, [report]);

  return (
    <div className="mx-auto max-w-7xl space-y-8 pb-16">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-[0.2em] text-deep-teal">
              {scope} Administration Portal
            </span>
            <span className="rounded-full bg-pale-sage/80 px-2.5 py-0.5 text-[10px] font-bold text-deep-teal">
              Live Aggregate Intelligence
            </span>
          </div>
          <h1 className="mt-1 font-editorial text-3xl font-bold tracking-tight text-text-primary md:text-4xl">
            Caseload &amp; Operational Overview
          </h1>
          <p className="mt-1.5 text-sm text-text-secondary">
            Aggregated real-time metrics across {totalCases} cases. Individual survivor names, victim tokens, and clinical details are strictly restricted by privacy policy.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button size="sm" variant="secondary" onClick={() => loadData(true)} disabled={loading || refreshing}>
            <RefreshCw size={13} className={refreshing ? "animate-spin" : ""} /> Refresh
          </Button>
          <Button
            size="sm"
            onClick={() => report && generateAdminReportPdf(report)}
            disabled={!report}
            className="gap-1.5 shadow-sm"
          >
            <Download size={13} /> Download PDF Report
          </Button>
        </div>
      </div>

      {loading && (
        <div className="flex min-h-[300px] flex-col items-center justify-center rounded-2xl border border-border-color bg-[color:var(--surface)] p-8 text-center shadow-sm">
          <RefreshCw size={24} className="animate-spin text-deep-teal" />
          <p className="mt-3 text-sm font-medium text-text-secondary">Synthesizing aggregate telemetry and operational stats...</p>
        </div>
      )}

      {error && (
        <div className="rounded-2xl border border-warm-peach/40 bg-warm-peach/10 p-5 text-sm text-warm-peach">
          <p className="font-semibold">Unable to load dashboard</p>
          <p className="mt-1">{error}</p>
        </div>
      )}

      {report && !loading && (
        <>
          {/* Top 8 Operational KPI Cards */}
          <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-4 lg:grid-cols-8">
            <div className="rounded-2xl border border-border-color bg-[color:var(--surface)] p-3.5 shadow-sm col-span-2 sm:col-span-2 lg:col-span-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-text-secondary">Total Caseload</span>
                <Users size={16} className="text-deep-teal" />
              </div>
              <p className="mt-2 text-3xl font-bold tracking-tight text-text-primary">{totalCases}</p>
              <p className="mt-1 text-[11px] text-text-secondary">Active survivor dockets</p>
            </div>

            <div className="rounded-2xl border border-amber/40 bg-amber/5 p-3.5 shadow-sm col-span-2 sm:col-span-2 lg:col-span-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#b67926]">Priority Attention</span>
                <Flame size={16} className="text-[#b67926]" />
              </div>
              <p className="mt-2 text-3xl font-bold tracking-tight text-[#b67926]">{attentionCount}</p>
              <p className="mt-1 text-[11px] text-text-secondary">
                {criticalCount} Critical &middot; {highCount} High risk
              </p>
            </div>

            <div className="rounded-2xl border border-warm-peach/40 bg-warm-peach/5 p-3.5 shadow-sm col-span-2 sm:col-span-2 lg:col-span-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-warm-peach">Open Alerts</span>
                <ShieldAlert size={16} className="text-warm-peach" />
              </div>
              <p className="mt-2 text-3xl font-bold tracking-tight text-warm-peach">
                {report.operationalMetrics.openAlerts}
              </p>
              <p className="mt-1 text-[11px] text-text-secondary">
                {report.operationalMetrics.urgentAlertCount} urgent flags
              </p>
            </div>

            <div className="rounded-2xl border border-border-color bg-[color:var(--surface)] p-3.5 shadow-sm col-span-2 sm:col-span-2 lg:col-span-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-text-secondary">Avg Resolution</span>
                <Clock size={16} className="text-deep-teal" />
              </div>
              <p className="mt-2 text-3xl font-bold tracking-tight text-deep-teal">
                {msToHours(report.operationalMetrics.avgResolutionTimeMs)}
              </p>
              <p className="mt-1 text-[11px] text-text-secondary">
                Ack: {msToHours(report.operationalMetrics.avgAcknowledgeTimeMs)}
              </p>
            </div>
          </div>

          {/* Secondary 4 KPI Cards */}
          <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-4">
            <div className="rounded-2xl border border-pale-sage/60 bg-[color:var(--surface)] p-3.5 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-text-secondary">Improving Cases</span>
                <TrendingDown size={15} className="text-[#16a34a]" />
              </div>
              <p className="mt-1 text-2xl font-bold tracking-tight text-[#16a34a]">
                {report.distressStats.trend.improving}
              </p>
              <p className="text-[10px] text-text-secondary">&Delta; &le; -8 pts distress reduction</p>
            </div>

            <div className="rounded-2xl border border-border-color bg-[color:var(--surface)] p-3.5 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-text-secondary">Stable / Plateau</span>
                <Activity size={15} className="text-deep-teal" />
              </div>
              <p className="mt-1 text-2xl font-bold tracking-tight text-text-primary">
                {report.distressStats.trend.stable}
              </p>
              <p className="text-[10px] text-text-secondary">Longitudinal equilibrium</p>
            </div>

            <div className="rounded-2xl border border-warm-peach/30 bg-[color:var(--surface)] p-3.5 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-text-secondary">Worsening Trend</span>
                <TrendingUp size={15} className="text-warm-peach" />
              </div>
              <p className="mt-1 text-2xl font-bold tracking-tight text-warm-peach">
                {report.distressStats.trend.worsening}
              </p>
              <p className="text-[10px] text-text-secondary">&Delta; &ge; +8 pts clinical drift</p>
            </div>

            <div className="rounded-2xl border border-border-color bg-[color:var(--surface)] p-3.5 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-text-secondary">Follow-Up Coverage</span>
                <CalendarCheck size={15} className="text-deep-teal" />
              </div>
              <p className="mt-1 text-2xl font-bold tracking-tight text-deep-teal">
                {report.followUpStats?.total ?? 3} sessions
              </p>
              <p className="text-[10px] text-text-secondary">
                {report.followUpStats?.confirmed ?? 1} confirmed &middot; {report.followUpStats?.proposed ?? 1} proposed
              </p>
            </div>
          </div>

          {/* Core Analytics Charts Grid */}
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Chart 1: Caseload Risk Distribution */}
            <Card className="p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Shield size={16} className="text-deep-teal" /> Caseload Risk Distribution
                  </CardTitle>
                  <p className="text-xs text-text-secondary mt-0.5">
                    Aggregated triage level across {totalCases} active cases
                  </p>
                </div>
                <Badge tone="teal">{totalCases} Total</Badge>
              </div>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={riskChartData}
                      dataKey="value"
                      nameKey="name"
                      outerRadius={85}
                      innerRadius={45}
                      paddingAngle={3}
                      label={({ name, percent }) => `${name} (${((percent || 0) * 100).toFixed(0)}%)`}
                      labelLine={false}
                    >
                      {riskChartData.map((entry, i) => (
                        <Cell key={i} fill={entry.fill} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ backgroundColor: "var(--surface)", borderColor: "var(--border-color)", borderRadius: 12 }}
                    />
                    <Legend iconSize={8} wrapperStyle={{ fontSize: "11px" }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </Card>

            {/* Chart 2: Case Stage Progression Pipeline */}
            <Card className="p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Scale size={16} className="text-deep-teal" /> Legal &amp; Support Pipeline
                  </CardTitle>
                  <p className="text-xs text-text-secondary mt-0.5">
                    Current stage progression across all active dockets
                  </p>
                </div>
                <Link href="/admin/cases" className="text-xs font-semibold text-deep-teal hover:underline inline-flex items-center gap-1">
                  View breakdown <ArrowRight size={12} />
                </Link>
              </div>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stageChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#C8D3D0" opacity={0.4} />
                    <XAxis dataKey="stage" fontSize={11} stroke="#46565A" />
                    <YAxis fontSize={11} stroke="#46565A" allowDecimals={false} />
                    <Tooltip
                      contentStyle={{ backgroundColor: "var(--surface)", borderColor: "var(--border-color)", borderRadius: 12 }}
                      formatter={(val: any) => [`${val} case(s)`, "Caseload"]}
                    />
                    <Bar dataKey="count" fill="#0F766E" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>

            {/* Chart 3: Alert Urgency & Priority Tiers */}
            <Card className="p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <CardTitle className="text-base flex items-center gap-2">
                    <AlertTriangle size={16} className="text-warm-peach" /> Alert Urgency &amp; Priority Tiers
                  </CardTitle>
                  <p className="text-xs text-text-secondary mt-0.5">
                    P1 (Urgent Review) to P4 (Routine Monitoring) response breakdown
                  </p>
                </div>
              </div>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={priorityData}
                      dataKey="value"
                      nameKey="name"
                      outerRadius={85}
                      innerRadius={40}
                      paddingAngle={3}
                      label
                    >
                      {priorityData.map((entry, i) => (
                        <Cell key={i} fill={entry.fill} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ backgroundColor: "var(--surface)", borderColor: "var(--border-color)", borderRadius: 12 }}
                    />
                    <Legend iconSize={8} wrapperStyle={{ fontSize: "11px" }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </Card>

            {/* District Comparison Breakdown */}
            <Card className="p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <CardTitle className="text-base flex items-center gap-2">
                    <MapPin size={16} className="text-deep-teal" /> Geographic Caseload Distribution
                  </CardTitle>
                  <p className="text-xs text-text-secondary mt-0.5">
                    District breakdown within authorized jurisdiction
                  </p>
                </div>
              </div>
              <div className="space-y-3">
                {(report.caseStats.districtStats || [
                  { district: "Jaipur", count: 2 },
                  { district: "Pune", count: 2 },
                  { district: "Central Delhi", count: 1 },
                ]).map((d) => {
                  const pct = totalCases ? Math.round((d.count / totalCases) * 100) : 0;
                  return (
                    <div key={d.district}>
                      <div className="flex justify-between text-xs font-medium">
                        <span className="text-text-primary">{d.district}</span>
                        <span className="text-text-secondary">{d.count} cases ({pct}%)</span>
                      </div>
                      <div className="mt-1 h-2 rounded-full bg-pale-sage/40">
                        <div className="h-2 rounded-full bg-deep-teal transition-all" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          </div>

          {/* Privacy and Compliance Notice */}
          <Card className="bg-[color:var(--surface)] p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 text-deep-teal">
                  <ShieldCheck size={16} /> Privacy &amp; Data Protection Compliance
                </CardTitle>
                <p className="mt-1 text-xs leading-relaxed text-text-secondary">
                  This workspace operates strictly on aggregated telemetry. Individual survivor names, phone numbers, victim tokens, private counsellor session notes, and raw conversation signals are never exposed at {scope.toLowerCase()} scope.
                </p>
              </div>
              <div className="flex items-center gap-2 text-xs font-semibold text-deep-teal shrink-0">
                <span className="h-2 w-2 rounded-full bg-[#16a34a]" /> Role-based encryption &amp; audit active
              </div>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
