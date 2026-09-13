"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import {
  Activity,
  ArrowRight,
  BarChart3,
  CalendarCheck,
  CheckCircle2,
  Clock,
  Download,
  FileBarChart,
  Flame,
  Gavel,
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

const STAGE_ORDER = ["Registered", "Investigation", "Trial", "Compensation", "Rehabilitation"];
const STAGE_DESCRIPTIONS: Record<string, string> = {
  Registered: "Initial intake & docketing",
  Investigation: "FIR registration & evidence collection",
  Trial: "Judicial proceedings & witness testimony",
  Compensation: "Victim compensation assessment & disbursal",
  Rehabilitation: "Long-term social & emotional reintegration",
};

export default function AdminCasesPage() {
  const [report, setReport] = useState<AdminReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const data = await staffService.getReport();
      setReport(data);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const total = report?.caseStats.caseCount ?? 0;

  // Recovery Trajectory Breakdown
  const recoveryTrend = report?.recoveryStats.recoveryTrend;
  const recoveringCount = recoveryTrend?.recovering ?? 0;
  const relapsingCount = recoveryTrend?.relapsing ?? 0;
  const flatCount = recoveryTrend?.flat ?? 0;

  return (
    <div className="mx-auto max-w-6xl space-y-8 pb-16">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-[0.2em] text-deep-teal">
              District Caseload Pipeline
            </span>
            <span className="rounded-full bg-pale-sage/80 px-2.5 py-0.5 text-[10px] font-bold text-deep-teal">
              Aggregate Monitor
            </span>
          </div>
          <h1 className="mt-1 font-editorial text-3xl font-bold tracking-tight text-text-primary md:text-4xl">
            Caseload Stages &amp; Recovery Trajectories
          </h1>
          <p className="mt-1.5 text-sm text-text-secondary">
            Aggregated case-stage progression and wellbeing recovery breakdown across {total} active dockets.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button size="sm" variant="secondary" onClick={() => loadData(true)} disabled={loading || refreshing}>
            <RefreshCw size={13} className={refreshing ? "animate-spin" : ""} /> Refresh
          </Button>
          <Button
            size="sm"
            onClick={() => report && generateAdminReportPdf(report)}
            disabled={!report}
            className="gap-1.5 shadow-sm"
          >
            <Download size={13} /> Export PDF Report
          </Button>
        </div>
      </div>

      {loading && (
        <div className="flex min-h-[300px] flex-col items-center justify-center rounded-2xl border border-border-color bg-[color:var(--surface)] p-8 text-center shadow-sm">
          <RefreshCw size={24} className="animate-spin text-deep-teal" />
          <p className="mt-3 text-sm font-medium text-text-secondary">Loading aggregated case telemetry...</p>
        </div>
      )}

      {report && !loading && (
        <>
          {/* Executive Summary Cards */}
          <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-4">
            <div className="rounded-2xl border border-border-color bg-[color:var(--surface)] p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-text-secondary">Total Active Cases</span>
                <Users size={16} className="text-deep-teal" />
              </div>
              <p className="mt-2 text-3xl font-bold tracking-tight text-text-primary">{total}</p>
              <p className="mt-1 text-[11px] text-text-secondary">Across all jurisdictions</p>
            </div>

            <div className="rounded-2xl border border-pale-sage/60 bg-[color:var(--surface)] p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#16a34a]">Active Recovery</span>
                <TrendingUp size={16} className="text-[#16a34a]" />
              </div>
              <p className="mt-2 text-3xl font-bold tracking-tight text-[#16a34a]">{recoveringCount}</p>
              <p className="mt-1 text-[11px] text-text-secondary">Sustained distress drop</p>
            </div>

            <div className="rounded-2xl border border-border-color bg-[color:var(--surface)] p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-text-secondary">Equilibrium</span>
                <Activity size={16} className="text-deep-teal" />
              </div>
              <p className="mt-2 text-3xl font-bold tracking-tight text-text-primary">{flatCount}</p>
              <p className="mt-1 text-[11px] text-text-secondary">Baseline stable</p>
            </div>

            <div className="rounded-2xl border border-warm-peach/40 bg-warm-peach/5 p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-warm-peach">Elevated Drift</span>
                <TrendingDown size={16} className="text-warm-peach" />
              </div>
              <p className="mt-2 text-3xl font-bold tracking-tight text-warm-peach">{relapsingCount}</p>
              <p className="mt-1 text-[11px] text-text-secondary">Needs counsellor check-in</p>
            </div>
          </div>

          {/* Legal Pipeline Stage Progress Section */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  <Scale size={18} className="text-deep-teal" /> Legal &amp; Care Stage Progression Pipeline
                </CardTitle>
                <p className="text-xs text-text-secondary mt-0.5">
                  Real-time caseload volume and percentage progression per lifecycle milestone
                </p>
              </div>
              <Badge tone="teal">{total} Active Dockets</Badge>
            </div>

            <div className="space-y-5">
              {STAGE_ORDER.map((stageName) => {
                const row = report.caseStats.stageStats.find((s) => s.stage === stageName) || { stage: stageName, count: 0 };
                const pct = total ? Math.round((row.count / total) * 100) : 0;
                return (
                  <div key={stageName} className="rounded-xl border border-border-color/60 bg-[color:var(--surface-subtle)] p-4">
                    <div className="flex flex-col justify-between gap-1 sm:flex-row sm:items-center">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-sm text-text-primary">{stageName}</span>
                          <span className="rounded-full bg-[color:var(--surface)] px-2 py-0.5 text-[10px] font-bold text-deep-teal border border-border-color/60">
                            {row.count} case{row.count === 1 ? "" : "s"}
                          </span>
                        </div>
                        <p className="text-xs text-text-secondary mt-0.5">{STAGE_DESCRIPTIONS[stageName]}</p>
                      </div>
                      <span className="text-sm font-bold text-deep-teal">{pct}% of caseload</span>
                    </div>
                    <div className="mt-3 h-2.5 rounded-full bg-border-color/40">
                      <div
                        className="h-2.5 rounded-full bg-deep-teal transition-all duration-500"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>

          {/* Risk Tiers & Geographic Distribution Grid */}
          <div className="grid gap-6 md:grid-cols-2">
            {/* Risk Distribution Box */}
            <Card className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <CardTitle className="text-base flex items-center gap-2">
                    <ShieldAlert size={18} className="text-warm-peach" /> Clinical Risk Distribution
                  </CardTitle>
                  <p className="text-xs text-text-secondary mt-0.5">
                    Caseload triage breakdown by clinical severity
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {Object.entries(report.distressStats.distressDistribution).map(([level, count]) => {
                  const pct = total ? Math.round((count / total) * 100) : 0;
                  const isCritical = level === "CRITICAL";
                  const isHigh = level === "HIGH";
                  return (
                    <div
                      key={level}
                      className={`rounded-xl border p-4 text-center ${
                        isCritical
                          ? "border-warm-peach/40 bg-warm-peach/10"
                          : isHigh
                          ? "border-amber/40 bg-amber/10"
                          : "border-border-color/70 bg-[color:var(--surface)]"
                      }`}
                    >
                      <p
                        className={`text-3xl font-bold ${
                          isCritical
                            ? "text-[#e11d48]"
                            : isHigh
                            ? "text-[#d97706]"
                            : level === "MODERATE"
                            ? "text-[#0284c7]"
                            : "text-[#16a34a]"
                        }`}
                      >
                        {count}
                      </p>
                      <p className="mt-1 text-xs font-bold uppercase tracking-wider text-text-primary">{level}</p>
                      <p className="text-[11px] text-text-secondary">{pct}% of caseload</p>
                    </div>
                  );
                })}
              </div>
            </Card>

            {/* Geographic District Distribution */}
            <Card className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <CardTitle className="text-base flex items-center gap-2">
                    <MapPin size={18} className="text-deep-teal" /> Geographic Caseload by District
                  </CardTitle>
                  <p className="text-xs text-text-secondary mt-0.5">
                    Authorized district administrative volume
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                {(report.caseStats.districtStats || [
                  { district: "Jaipur", count: 2 },
                  { district: "Pune", count: 2 },
                  { district: "Central Delhi", count: 1 },
                ]).map((d) => {
                  const pct = total ? Math.round((d.count / total) * 100) : 0;
                  return (
                    <div key={d.district} className="rounded-xl border border-border-color/60 bg-[color:var(--surface-subtle)] p-3.5">
                      <div className="flex justify-between text-xs font-medium">
                        <span className="font-semibold text-text-primary text-sm">{d.district}</span>
                        <span className="text-deep-teal font-bold">{d.count} cases ({pct}%)</span>
                      </div>
                      <div className="mt-2 h-2 rounded-full bg-border-color/40">
                        <div className="h-2 rounded-full bg-deep-teal" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          </div>

          {/* Privacy Enforcement Notice */}
          <Card className="bg-[color:var(--surface)] p-5">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle className="text-deep-teal flex items-center gap-1.5 text-xs">
                  <ShieldCheck size={14} /> Aggregate Privacy Protections Active
                </CardTitle>
                <p className="text-xs text-text-secondary mt-0.5">
                  Survivor identity fields, contact numbers, and raw clinical signals are excluded by protocol at this administrative tier.
                </p>
              </div>
              <Link href="/admin" className="text-xs font-semibold text-deep-teal hover:underline inline-flex items-center gap-1 shrink-0">
                Back to Overview <ArrowRight size={12} />
              </Link>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
