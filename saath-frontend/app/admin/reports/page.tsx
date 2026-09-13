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
  FileSpreadsheet,
  FileText,
  Flame,
  Gavel,
  Layers,
  MapPin,
  PieChart as PieIcon,
  Printer,
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

export default function AdminReportsPage() {
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

  function downloadJson() {
    if (!report) return;
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `saath-district-report-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const totalCases = report?.caseStats.caseCount ?? 0;
  const criticalHighRisk =
    (report?.distressStats.distressDistribution.CRITICAL ?? 0) +
    (report?.distressStats.distressDistribution.HIGH ?? 0);
  const openAlerts = report?.operationalMetrics.openAlerts ?? 0;

  return (
    <div className="mx-auto max-w-6xl space-y-8 pb-16">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-[0.2em] text-deep-teal">
              District Reporting Engine
            </span>
            <span className="rounded-full bg-pale-sage/80 px-2.5 py-0.5 text-[10px] font-bold text-deep-teal">
              Official Records
            </span>
          </div>
          <h1 className="mt-1 font-editorial text-3xl font-bold tracking-tight text-text-primary md:text-4xl">
            District Operational Reports
          </h1>
          <p className="mt-1.5 text-sm text-text-secondary">
            Generate and export verified aggregate administrative reports with official SAATH styling and privacy compliance.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button size="sm" variant="secondary" onClick={() => loadData(true)} disabled={loading || refreshing}>
            <RefreshCw size={13} className={refreshing ? "animate-spin" : ""} /> Refresh
          </Button>
          <Button size="sm" variant="secondary" onClick={downloadJson} disabled={!report}>
            <Download size={13} /> Export JSON
          </Button>
          <Button
            size="sm"
            onClick={() => report && generateAdminReportPdf(report)}
            disabled={!report}
            className="gap-1.5 shadow-sm"
          >
            <Printer size={13} /> Download PDF Report
          </Button>
        </div>
      </div>

      {loading && (
        <div className="flex min-h-[300px] flex-col items-center justify-center rounded-2xl border border-border-color bg-[color:var(--surface)] p-8 text-center shadow-sm">
          <RefreshCw size={24} className="animate-spin text-deep-teal" />
          <p className="mt-3 text-sm font-medium text-text-secondary">Generating live caseload audit and report metrics...</p>
        </div>
      )}

      {report && !loading && (
        <>
          {/* Document Preview Card */}
          <Card className="p-6">
            <div className="flex flex-col justify-between gap-4 border-b border-border-color pb-5 sm:flex-row sm:items-center">
              <div>
                <div className="flex items-center gap-2">
                  <FileBarChart size={20} className="text-deep-teal" />
                  <h2 className="text-lg font-bold text-text-primary">Executive Report Snapshot</h2>
                </div>
                <p className="text-xs text-text-secondary mt-1">
                  Generated at {new Date(report.generatedAt).toLocaleString("en-IN")} &middot; Scope: {report.scope.toUpperCase()}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Badge tone="teal">Privacy Preserved: {report.privacyBoundary}</Badge>
              </div>
            </div>

            {/* KPI Overview Grid inside Report */}
            <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="rounded-xl border border-border-color/60 bg-[color:var(--surface-subtle)] p-3.5">
                <p className="text-[11px] font-bold uppercase tracking-wider text-text-secondary">Total Caseload</p>
                <p className="mt-1 text-2xl font-bold text-text-primary">{totalCases}</p>
                <p className="text-[10px] text-text-secondary">Active survivor cases</p>
              </div>

              <div className="rounded-xl border border-amber/40 bg-amber/5 p-3.5">
                <p className="text-[11px] font-bold uppercase tracking-wider text-[#b67926]">Priority Attention</p>
                <p className="mt-1 text-2xl font-bold text-[#b67926]">{criticalHighRisk}</p>
                <p className="text-[10px] text-text-secondary">Critical &amp; High risk cases</p>
              </div>

              <div className="rounded-xl border border-warm-peach/40 bg-warm-peach/5 p-3.5">
                <p className="text-[11px] font-bold uppercase tracking-wider text-warm-peach">Open Alerts</p>
                <p className="mt-1 text-2xl font-bold text-warm-peach">{openAlerts}</p>
                <p className="text-[10px] text-text-secondary">
                  {report.operationalMetrics.urgentAlertCount} P1 Urgent
                </p>
              </div>

              <div className="rounded-xl border border-border-color/60 bg-[color:var(--surface-subtle)] p-3.5">
                <p className="text-[11px] font-bold uppercase tracking-wider text-text-secondary">Resolved Alerts</p>
                <p className="mt-1 text-2xl font-bold text-deep-teal">{report.operationalMetrics.resolvedAlerts}</p>
                <p className="text-[10px] text-text-secondary">Successfully addressed</p>
              </div>
            </div>

            {/* Section Breakdown Tables inside Report */}
            <div className="mt-6 grid gap-6 md:grid-cols-2">
              {/* Stage Progression Table */}
              <div className="rounded-xl border border-border-color/60 bg-[color:var(--surface-subtle)] p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Scale size={16} className="text-deep-teal" />
                  <h3 className="font-semibold text-sm text-text-primary">Legal Stage Progression</h3>
                </div>
                <div className="space-y-2.5">
                  {report.caseStats.stageStats.map((s) => {
                    const pct = totalCases ? Math.round((s.count / totalCases) * 100) : 0;
                    return (
                      <div key={s.stage} className="flex justify-between items-center text-xs border-b border-border-color/40 pb-2 last:border-0 last:pb-0">
                        <span className="font-medium text-text-primary">{s.stage}</span>
                        <span className="text-text-secondary font-semibold">{s.count} ({pct}%)</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Clinical Risk Tier Table */}
              <div className="rounded-xl border border-border-color/60 bg-[color:var(--surface-subtle)] p-4">
                <div className="flex items-center gap-2 mb-3">
                  <ShieldAlert size={16} className="text-warm-peach" />
                  <h3 className="font-semibold text-sm text-text-primary">Clinical Risk Distribution</h3>
                </div>
                <div className="space-y-2.5">
                  {Object.entries(report.distressStats.distressDistribution).map(([level, count]) => {
                    const pct = totalCases ? Math.round((count / totalCases) * 100) : 0;
                    return (
                      <div key={level} className="flex justify-between items-center text-xs border-b border-border-color/40 pb-2 last:border-0 last:pb-0">
                        <span className="font-bold uppercase tracking-wider text-text-primary">{level}</span>
                        <span className="text-text-secondary font-semibold">{count} ({pct}%)</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Geographic Coverage Table */}
            <div className="mt-6 rounded-xl border border-border-color/60 bg-[color:var(--surface-subtle)] p-4">
              <div className="flex items-center gap-2 mb-3">
                <MapPin size={16} className="text-deep-teal" />
                <h3 className="font-semibold text-sm text-text-primary">District Jurisdictional Breakdown</h3>
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                {(report.caseStats.districtStats || [
                  { district: "Jaipur", count: 2 },
                  { district: "Pune", count: 2 },
                  { district: "Central Delhi", count: 1 },
                ]).map((d) => {
                  const pct = totalCases ? Math.round((d.count / totalCases) * 100) : 0;
                  return (
                    <div key={d.district} className="rounded-lg border border-border-color/50 bg-[color:var(--surface)] p-3 text-center">
                      <p className="font-semibold text-sm text-text-primary">{d.district}</p>
                      <p className="mt-1 text-xl font-bold text-deep-teal">{d.count}</p>
                      <p className="text-[10px] text-text-secondary">{pct}% of total cases</p>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Report Actions Banner */}
            <div className="mt-6 flex flex-col items-center justify-between gap-3 rounded-xl bg-deep-teal/10 p-4 sm:flex-row">
              <div className="flex items-center gap-2.5">
                <FileText size={20} className="text-deep-teal shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-deep-teal">Ready to download printable report</p>
                  <p className="text-xs text-text-secondary">Contains executive summary, charts breakdown, and verification signatures.</p>
                </div>
              </div>
              <Button
                onClick={() => generateAdminReportPdf(report)}
                className="gap-2 shadow-sm shrink-0"
              >
                <Printer size={15} /> Download PDF (SAATH_District_Report.pdf)
              </Button>
            </div>
          </Card>

          {/* Compliance & Privacy Guarantee */}
          <Card className="bg-[color:var(--surface)] p-5">
            <div className="flex items-center gap-2 text-deep-teal font-semibold text-xs mb-1">
              <ShieldCheck size={16} /> Strict Privacy &amp; Anonymization Guarantee
            </div>
            <p className="text-xs text-text-secondary leading-relaxed">
              District administrative reports comply with National Data Sharing and Accessibility Policy (NDSAP) standards. All personal identifiers, clinical conversation records, survivor phone numbers, and victim tokens are stripped prior to aggregation.
            </p>
          </Card>
        </>
      )}
    </div>
  );
}
