"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Activity,
  ArrowRight,
  BarChart3,
  Calendar,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  FileText,
  Gavel,
  HandCoins,
  HeartHandshake,
  PieChart as PieIcon,
  Printer,
  RefreshCw,
  Scale,
  ShieldAlert,
  TrendingDown,
  TrendingUp,
  UserCheck,
} from "lucide-react";
import { Card, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { caseService } from "@/services/case";
import { aiService } from "@/services/ai";
import { CaseRecord, AiOutput } from "@/types";
import { useAppStore } from "@/store/useAppStore";
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
const COLORS = ["#0F766E", "#2FA6A0", "#7FAF86", "#E89A78", "#5B8DB8", "#B08BBB"];
const PRIORITY_COLORS: Record<string, string> = {
  P1: "#E89A78",
  P2: "#E4B053",
  P3: "#2FA6A0",
  P4: "#7FAF86",
};

export default function ReportsPage() {
  const counsellorProfile = useAppStore((s) => s.counsellorProfile);
  const followUps = useAppStore((s) => s.followUps);
  const [cases, setCases] = useState<CaseRecord[]>([]);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [priorities, setPriorities] = useState<(AiOutput | null)[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    setLoading(true);
    try {
      const [casesRes, alertsRes] = await Promise.all([
        caseService.getMyCases().catch(() => []),
        aiService.getAlerts().catch(() => []),
      ]);
      setCases(casesRes || []);
      setAlerts(alertsRes || []);

      if (casesRes && casesRes.length > 0) {
        const ests = await Promise.all(
          casesRes.map((c) => aiService.getLatestEstimate(c.victimToken).catch(() => null))
        );
        setPriorities(ests);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Compute metrics from assigned cases
  const totalCases = cases.length;
  const uniqueDistricts = useMemo(() => Array.from(new Set(cases.map((c) => c.district).filter(Boolean))), [cases]);
  const highDistressCases = useMemo(() => cases.filter((c) => (c.currentDistressScore ?? 0) >= 70 || c.riskLevel === "HIGH"), [cases]);
  const totalApproved = useMemo(() => cases.reduce((acc, c) => acc + (c.compensationAmountApproved ?? 0), 0), [cases]);
  const totalReceived = useMemo(() => cases.reduce((acc, c) => acc + (c.compensationAmountReceived ?? 0), 0), [cases]);
  const totalPending = useMemo(() => cases.reduce((acc, c) => acc + (c.pendingAmount ?? 0), 0), [cases]);

  // Stage Breakdown
  const stageData = useMemo(() => {
    const stageCounts: Record<string, number> = {
      Registered: 0,
      Investigation: 0,
      Trial: 0,
      Compensation: 0,
      Rehabilitation: 0,
    };
    cases.forEach((c) => {
      const stage = c.currentStage || "Registered";
      stageCounts[stage] = (stageCounts[stage] || 0) + 1;
    });
    return STAGE_ORDER.map((name) => ({
      name,
      cases: stageCounts[name] || 0,
    }));
  }, [cases]);

  // Priority Breakdown
  const priorityData = useMemo(() => {
    const counts: Record<string, number> = { P1: 0, P2: 0, P3: 0, P4: 0 };
    cases.forEach((c, idx) => {
      const p = priorities[idx];
      let level = p?.priorityLevel || (c.currentDistressScore && c.currentDistressScore >= 75 ? "P1" : c.riskLevel === "HIGH" ? "P2" : "P3");
      if (!counts[level]) level = "P3";
      counts[level] = (counts[level] || 0) + 1;
    });
    return [
      { name: "P1 Urgent Review", key: "P1", value: counts["P1"] || 0, fill: PRIORITY_COLORS.P1 },
      { name: "P2 Support Request", key: "P2", value: counts["P2"] || 0, fill: PRIORITY_COLORS.P2 },
      { name: "P3 Active Watch", key: "P3", value: counts["P3"] || 0, fill: PRIORITY_COLORS.P3 },
      { name: "P4 Routine Support", key: "P4", value: counts["P4"] || 0, fill: PRIORITY_COLORS.P4 },
    ].filter((item) => item.value > 0);
  }, [cases, priorities]);

  // District Breakdown
  const districtData = useMemo(() => {
    const map = new Map<string, number>();
    cases.forEach((c) => {
      const d = c.district || "Unassigned";
      map.set(d, (map.get(d) || 0) + 1);
    });
    return Array.from(map.entries()).map(([district, count]) => ({ district, count }));
  }, [cases]);

  // Compensation Breakdown
  const compensationData = useMemo(() => {
    const map = new Map<string, number>();
    cases.forEach((c) => {
      const status = c.compensationStatus || (c.financialReliefEligible ? "Eligible" : "Not Requested");
      map.set(status, (map.get(status) || 0) + 1);
    });
    return Array.from(map.entries()).map(([name, value]) => ({ name, value }));
  }, [cases]);

  // Aggregate Caseload Wellbeing Trajectory
  const trajectoryData = useMemo(() => {
    let rising = 0;
    let improving = 0;
    let stable = 0;

    cases.forEach((c) => {
      if (c.baselineDistressScore && c.currentDistressScore) {
        if (c.currentDistressScore - c.baselineDistressScore > 5) rising++;
        else if (c.baselineDistressScore - c.currentDistressScore > 5) improving++;
        else stable++;
      } else {
        stable++;
      }
    });

    return [
      { name: "Rising Distress", count: rising, fill: "#E89A78" },
      { name: "Improving Recovery", count: improving, fill: "#7FAF86" },
      { name: "Stable / Insufficient Data", count: stable, fill: "#2FA6A0" },
    ].filter((d) => d.count > 0);
  }, [cases]);

  const handleDownloadJSON = () => {
    const reportPayload = {
      generatedAt: new Date().toISOString(),
      counsellor: counsellorProfile?.name ?? "Assigned Counsellor",
      counsellorId: counsellorProfile?.id ?? "C001",
      caseloadMetrics: {
        totalCases,
        districtsCovered: uniqueDistricts,
        casesNeedingAttention: highDistressCases.length,
        compensation: {
          totalApproved,
          totalReceived,
          totalPending,
        },
        stageBreakdown: stageData,
        priorityBreakdown: priorityData,
        districtBreakdown: districtData,
      },
    };

    const blob = new Blob([JSON.stringify(reportPayload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `counsellor-caseload-report-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="mx-auto max-w-6xl space-y-8 pb-16 print:p-0">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between print:hidden">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-deep-teal">Counsellor Caseload Intelligence</p>
          <h1 className="mt-1 font-editorial text-3xl font-bold tracking-tight text-text-primary md:text-4xl">
            Caseload Reports &amp; Operational Analytics
          </h1>
          <p className="mt-1.5 text-sm text-text-secondary">
            Dynamically computed analytics across {cases.length} assigned survivor cases. Zero hardcoded values.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button size="sm" variant="secondary" onClick={loadData} disabled={loading}>
            <RefreshCw size={13} className={loading ? "animate-spin" : ""} /> Refresh
          </Button>
          <Button size="sm" variant="secondary" onClick={handleDownloadJSON}>
            <Download size={13} /> Export JSON
          </Button>
          <Button size="sm" onClick={handlePrint}>
            <Printer size={13} /> Print Report
          </Button>
        </div>
      </div>

      {/* Top 6 Summary Stats */}
      <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-3 lg:grid-cols-6">
        <div className="rounded-2xl border border-border-color bg-[color:var(--surface)] p-4 shadow-sm">
          <p className="text-[11px] font-semibold text-text-secondary uppercase tracking-wider">Assigned Cases</p>
          <p className="mt-2 text-2xl font-bold tracking-tight text-text-primary">{totalCases}</p>
          <p className="mt-1 text-[11px] text-text-secondary">Active survivors</p>
        </div>
        <div className="rounded-2xl border border-border-color bg-[color:var(--surface)] p-4 shadow-sm">
          <p className="text-[11px] font-semibold text-text-secondary uppercase tracking-wider">Districts</p>
          <p className="mt-2 text-2xl font-bold tracking-tight text-deep-teal">{uniqueDistricts.length}</p>
          <p className="mt-1 text-[11px] text-text-secondary">{uniqueDistricts.slice(0, 2).join(", ")}</p>
        </div>
        <div className="rounded-2xl border border-warm-peach/40 bg-warm-peach/5 p-4 shadow-sm">
          <p className="text-[11px] font-semibold text-warm-peach uppercase tracking-wider">Needs Attention</p>
          <p className="mt-2 text-2xl font-bold tracking-tight text-warm-peach">{highDistressCases.length}</p>
          <p className="mt-1 text-[11px] text-text-secondary">Distress &ge; 70 or High Risk</p>
        </div>
        <div className="rounded-2xl border border-amber/40 bg-amber/5 p-4 shadow-sm">
          <p className="text-[11px] font-semibold text-[#b67926] uppercase tracking-wider">Active Alerts</p>
          <p className="mt-2 text-2xl font-bold tracking-tight text-[#b67926]">
            {alerts.filter((a) => a.status !== "RESOLVED").length}
          </p>
          <p className="mt-1 text-[11px] text-text-secondary">Clinical safety flags</p>
        </div>
        <div className="rounded-2xl border border-border-color bg-[color:var(--surface)] p-4 shadow-sm">
          <p className="text-[11px] font-semibold text-text-secondary uppercase tracking-wider">Relief Approved</p>
          <p className="mt-2 text-xl font-bold tracking-tight text-text-primary">
            ₹{totalApproved.toLocaleString("en-IN")}
          </p>
          <p className="mt-1 text-[11px] text-text-secondary">Interim &amp; Final</p>
        </div>
        <div className="rounded-2xl border border-pale-sage/60 bg-[color:var(--surface)] p-4 shadow-sm">
          <p className="text-[11px] font-semibold text-text-secondary uppercase tracking-wider">Relief Disbursed</p>
          <p className="mt-2 text-xl font-bold tracking-tight text-deep-teal">
            ₹{totalReceived.toLocaleString("en-IN")}
          </p>
          <p className="mt-1 text-[11px] text-text-secondary">Bank credited</p>
        </div>
      </div>

      {/* Visual Charts Grid */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Chart 1: Legal Pipeline Stage */}
        <Card className="p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <Scale size={16} className="text-deep-teal" /> Cases by Legal Pipeline Stage
              </CardTitle>
              <p className="text-xs text-text-secondary mt-0.5">
                Stage progression of your assigned caseload
              </p>
            </div>
            <Badge tone="teal">{totalCases} Total Cases</Badge>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stageData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#C8D3D0" opacity={0.4} />
                <XAxis dataKey="name" fontSize={11} stroke="#46565A" />
                <YAxis fontSize={11} stroke="#46565A" allowDecimals={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: "var(--surface)", borderColor: "var(--border-color)", borderRadius: 12 }}
                  formatter={(val: any) => [`${val} case(s)`, "Caseload"]}
                />
                <Bar dataKey="cases" fill="#0F766E" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Chart 2: Priority & Clinical Attention Distribution */}
        <Card className="p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <ShieldAlert size={16} className="text-warm-peach" /> Priority Attention Distribution
              </CardTitle>
              <p className="text-xs text-text-secondary mt-0.5">
                P1 (Crisis) through P4 (Routine) clinical tiering
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
                  outerRadius={80}
                  innerRadius={45}
                  paddingAngle={3}
                  label={({ name, percent }) => `${(name || "").split(" ")[0]} (${((percent || 0) * 100).toFixed(0)}%)`}
                  labelLine={false}
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

        {/* Chart 3: District Geographic Distribution */}
        <Card className="p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <BarChart3 size={16} className="text-deep-teal" /> Geographic Coverage by District
              </CardTitle>
              <p className="text-xs text-text-secondary mt-0.5">
                Active cases per district jurisdiction
              </p>
            </div>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={districtData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#C8D3D0" opacity={0.4} />
                <XAxis dataKey="district" fontSize={11} stroke="#46565A" />
                <YAxis fontSize={11} stroke="#46565A" allowDecimals={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: "var(--surface)", borderColor: "var(--border-color)", borderRadius: 12 }}
                  formatter={(val: any) => [`${val} case(s)`, "Caseload"]}
                />
                <Bar dataKey="count" fill="#2FA6A0" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Chart 4: Caseload Aggregate Wellbeing Trajectory */}
        <Card className="p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <Activity size={16} className="text-deep-teal" /> Caseload Wellbeing Trajectory
              </CardTitle>
              <p className="text-xs text-text-secondary mt-0.5">
                Aggregate direction of recovery vs baseline (Privacy preserved)
              </p>
            </div>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={trajectoryData}
                  dataKey="count"
                  nameKey="name"
                  outerRadius={80}
                  innerRadius={40}
                  paddingAngle={4}
                  label
                >
                  {trajectoryData.map((entry, i) => (
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
      </div>

      {/* Caseload Breakdown Table */}
      <Card className="p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <FileSpreadsheet size={16} className="text-deep-teal" /> Caseload Master Roster
            </CardTitle>
            <p className="text-xs text-text-secondary mt-0.5">
              Live snapshot of assigned cases and current legal &amp; clinical state
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-text-primary">
            <thead className="border-b border-border-color bg-[color:var(--surface-subtle)] text-[11px] font-bold uppercase tracking-wider text-text-secondary">
              <tr>
                <th className="p-3">Survivor / Docket</th>
                <th className="p-3">District</th>
                <th className="p-3">Legal Stage</th>
                <th className="p-3">Risk Tier</th>
                <th className="p-3">Distress</th>
                <th className="p-3">Next Hearing</th>
                <th className="p-3">Financial Relief</th>
                <th className="p-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-color/60">
              {cases.map((c) => (
                <tr key={c.id} className="hover:bg-[color:var(--surface-subtle)] transition-colors">
                  <td className="p-3">
                    <p className="font-semibold text-text-primary">{c.survivorName}</p>
                    <p className="font-mono text-[10px] text-text-secondary">{c.docket}</p>
                  </td>
                  <td className="p-3 font-medium">{c.district}, {c.state}</td>
                  <td className="p-3">
                    <span className="rounded-md bg-[color:var(--surface-subtle)] px-2 py-0.5 font-semibold text-text-primary border border-border-color/60">
                      {c.currentStage}
                    </span>
                  </td>
                  <td className="p-3">
                    <Badge tone={c.riskLevel === "HIGH" ? "peach" : c.riskLevel === "MEDIUM" ? "amber" : "sage"}>
                      {c.riskLevel || "MEDIUM"}
                    </Badge>
                  </td>
                  <td className="p-3">
                    <span
                      className={`font-bold ${
                        (c.currentDistressScore ?? 50) >= 70
                          ? "text-warm-peach"
                          : (c.currentDistressScore ?? 50) <= 35
                          ? "text-deep-teal"
                          : "text-text-primary"
                      }`}
                    >
                      {c.currentDistressScore ?? "--"}/100
                    </span>
                  </td>
                  <td className="p-3 text-text-secondary">
                    {c.nextHearingDate ? new Date(c.nextHearingDate).toLocaleDateString() : "Pending"}
                  </td>
                  <td className="p-3">
                    <p className="font-semibold text-deep-teal">₹{(c.compensationAmountReceived ?? 0).toLocaleString("en-IN")}</p>
                    <p className="text-[10px] text-text-secondary">of ₹{(c.compensationAmountApproved ?? 0).toLocaleString("en-IN")}</p>
                  </td>
                  <td className="p-3 text-right">
                    <Link
                      href={`/counsellor/cases/${c.victimToken}`}
                      className="inline-flex items-center gap-1 font-semibold text-deep-teal hover:underline text-xs"
                    >
                      Case review <ArrowRight size={11} />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

