"use client";

import { useEffect, useState } from "react";
import { Card, CardTitle } from "@/components/ui/Card";
import { staffService } from "@/services/case";
import { aiService } from "@/services/ai";
import { useAppStore } from "@/store/useAppStore";
import { AdminReport } from "@/types";
import {
  BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend,
} from "recharts";

const COLORS = ["#0F766E", "#2FA6A0", "#7FAF86", "#E89A78", "#5B8DB8"];
const RISK_ORDER = ["CRITICAL", "HIGH", "MODERATE", "LOW"];

function msToHours(ms: number | null | undefined) {
  if (!ms) return "—";
  return `${Math.round(ms / 3_600_000)}h`;
}

export default function AdminOverviewPage() {
  const role = useAppStore((state) => state.role);
  const scope = role === "district" ? "District" : role === "state" ? "State" : "National";

  const [report, setReport] = useState<AdminReport | null>(null);
  const [assessments, setAssessments] = useState<Awaited<ReturnType<typeof aiService.getSahayakAssessments>>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    staffService.getReport().then(setReport).catch(() => setError("Unable to load the aggregate dashboard right now."))
      .finally(() => setLoading(false));
    aiService.getSahayakAssessments().then(setAssessments).catch(() => setAssessments([]));
  }, []);

  const riskChartData = report
    ? RISK_ORDER.map((level) => ({ level, count: report.distressStats.distressDistribution[level] ?? 0 }))
    : [];

  const stageChartData = report?.caseStats.stageStats ?? [];

  return (
    <div className="space-y-6">
      <div>
        <div className="flex flex-col justify-between gap-3 md:flex-row md:items-end">
          <div>
            <p className="text-xs font-bold uppercase tracking-[.18em] text-deep-teal">{scope} administration</p>
            <h1 className="mt-1 text-3xl font-semibold">Aggregated Overview</h1>
          </div>
          <span className="rounded-full bg-pale-sage px-3 py-1 text-xs font-bold text-deep-teal">Synthetic Demonstration Data</span>
        </div>
        <p className="mt-1 text-sm text-text-secondary">
          Read-only, aggregated intelligence across the current caseload. No survivor names, tokens, or clinical detail are shown at this scope.
        </p>
      </div>

      {loading && <p className="text-sm text-text-secondary">Loading aggregate dashboard...</p>}
      {error && <p className="text-sm text-warm-peach">{error}</p>}

      {report && (
        <>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <Stat label="Total caseload" value={report.caseStats.caseCount} />
            <Stat label="Critical / High risk" value={(report.distressStats.distressDistribution.CRITICAL ?? 0) + (report.distressStats.distressDistribution.HIGH ?? 0)} />
            <Stat label="Open alerts" value={report.operationalMetrics.openAlerts} />
            <Stat label="Avg. resolution time" value={msToHours(report.operationalMetrics.avgResolutionTimeMs)} isText />
          </div>

          {assessments.length > 0 && (
            <Card>
              <CardTitle>Sahayak escalation signals</CardTitle>
              <p className="mt-1 text-xs text-text-secondary">Role-based view for authorized staff. Survivor-facing chat does not show these predictions.</p>
              <div className="mt-4 grid gap-3 md:grid-cols-3">
                {assessments.slice(-6).reverse().map((assessment) => (
                  <div key={assessment.id} className="rounded-xl bg-greenish-cream p-4">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-semibold">{assessment.caseId ?? assessment.victimToken ?? "Case"}</span>
                      <span className="text-xs font-bold text-deep-teal">{assessment.prediction.risk_level}</span>
                    </div>
                    <p className="mt-2 text-2xl font-semibold text-deep-teal">{assessment.prediction.escalation_probability}%</p>
                    <p className="mt-1 text-xs text-text-secondary">Confidence {(assessment.prediction.confidence * 100).toFixed(0)}%</p>
                  </div>
                ))}
              </div>
            </Card>
          )}

          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardTitle>Risk distribution</CardTitle>
              <div className="mt-3 h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={riskChartData} dataKey="count" nameKey="level" outerRadius={90} label>
                      {riskChartData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </Card>

            <Card>
              <CardTitle>Cases by stage</CardTitle>
              <div className="mt-3 h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stageChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#C8D3D0" />
                    <XAxis dataKey="stage" fontSize={12} stroke="#46565A" />
                    <YAxis fontSize={12} stroke="#46565A" allowDecimals={false} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="count" name="Cases" fill="#2FA6A0" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </div>

          <Card>
            <CardTitle>Privacy boundary</CardTitle>
            <p className="mt-3 text-sm leading-relaxed text-text-secondary">
              This workspace shows aggregated intelligence only. Individual survivor names, detailed signals, and clinical labels are not available at {scope.toLowerCase()} scope.
            </p>
            <div className="mt-4 flex items-center gap-2 text-xs font-semibold text-deep-teal">
              <span className="h-2 w-2 rounded-full bg-sage" />Role-based access active
            </div>
          </Card>
        </>
      )}
    </div>
  );
}

function Stat({ label, value, isText }: { label: string; value: number | string; isText?: boolean }) {
  return (
    <Card>
      <p className={`font-semibold text-deep-teal ${isText ? "text-xl" : "text-2xl"}`}>{value}</p>
      <p className="mt-1 text-xs text-text-secondary">{label}</p>
    </Card>
  );
}
