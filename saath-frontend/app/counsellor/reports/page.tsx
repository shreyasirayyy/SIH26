"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, CardTitle } from "@/components/ui/Card";
import { caseService } from "@/services/case";
import { aiService } from "@/services/ai";
import { CaseRecord, AiOutput } from "@/types";
import {
  BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid, Legend,
} from "recharts";

const COLORS = ["#0F766E", "#2FA6A0", "#7FAF86", "#E89A78", "#5B8DB8", "#B08BBB"];
const PRIORITY_COLORS: Record<string, string> = { P1: "#E89A78", P2: "#E4B053", P3: "#2FA6A0", P4: "#7FAF86" };

function countBy<T>(items: T[], key: (item: T) => string) {
  const counts = new Map<string, number>();
  for (const item of items) {
    const k = key(item) || "Unknown";
    counts.set(k, (counts.get(k) ?? 0) + 1);
  }
  return Array.from(counts.entries()).map(([name, value]) => ({ name, value }));
}

// NOTE: this page is built entirely from real, already-working endpoints —
// GET /api/v1/counsellor/cases and GET /api/v1/counsellor/sahayak-assessments.
// There's no separate "reports" endpoint for counsellors (only admins have
// /api/v1/admin/reports, and that route is role-locked to admins), so every
// number here is computed client-side from the same case list the Overview
// and My Cases pages already use — nothing here is invented.
export default function ReportsPage() {
  const [cases, setCases] = useState<CaseRecord[]>([]);
  const [priorities, setPriorities] = useState<(AiOutput | null)[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    caseService
      .listAllCases()
      .then(async (list) => {
        setCases(list);
        const withPriority = await Promise.all(list.map((c) => aiService.getLatestEstimate(c.victimToken)));
        setPriorities(withPriority);
      })
      .catch(() => {
        setCases([]);
        setPriorities([]);
      })
      .finally(() => setLoading(false));
  }, []);

  const stageData = useMemo(() => countBy(cases, (c) => c.currentStage), [cases]);
  const districtData = useMemo(() => countBy(cases, (c) => c.district), [cases]);
  const compensationData = useMemo(() => countBy(cases, (c) => c.compensationStatus), [cases]);

  const priorityData = useMemo(() => {
    const counts = new Map<string, number>();
    for (const p of priorities) {
      const label = !p ? "No data yet" : p.insufficientEvidence ? "Insufficient evidence" : p.priorityLevel;
      counts.set(label, (counts.get(label) ?? 0) + 1);
    }
    return Array.from(counts.entries()).map(([name, value]) => ({ name, value }));
  }, [priorities]);

  const totalCompensationApproved = cases.reduce((sum, c) => sum + (c.compensationAmountApproved ?? 0), 0);
  const totalCompensationReceived = cases.reduce((sum, c) => sum + (c.compensationAmountReceived ?? 0), 0);

  if (loading) return <p className="text-sm text-text-secondary">Loading reports...</p>;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Reports</h1>
        <p className="mt-1 text-sm text-text-secondary">
          Computed from your live caseload — synthetic demonstration data, no real case records.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Stat label="Total cases" value={cases.length} />
        <Stat label="Districts covered" value={new Set(cases.map((c) => c.district)).size} />
        <Stat label="Compensation approved" value={`₹${totalCompensationApproved.toLocaleString("en-IN")}`} />
        <Stat label="Compensation received" value={`₹${totalCompensationReceived.toLocaleString("en-IN")}`} />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardTitle>Cases by stage</CardTitle>
          <div className="mt-3 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stageData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#C8D3D0" />
                <XAxis dataKey="name" fontSize={11} stroke="#46565A" />
                <YAxis fontSize={12} stroke="#46565A" allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="value" fill="#0F766E" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card>
          <CardTitle>Priority distribution</CardTitle>
          <div className="mt-3 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={priorityData} dataKey="value" nameKey="name" outerRadius={90} label>
                  {priorityData.map((entry, i) => (
                    <Cell key={i} fill={PRIORITY_COLORS[entry.name] ?? COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card>
          <CardTitle>Cases by district</CardTitle>
          <div className="mt-3 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={districtData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#C8D3D0" />
                <XAxis dataKey="name" fontSize={11} stroke="#46565A" />
                <YAxis fontSize={12} stroke="#46565A" allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="value" fill="#2FA6A0" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card>
          <CardTitle>Compensation status</CardTitle>
          <div className="mt-3 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={compensationData} dataKey="value" nameKey="name" outerRadius={90} label>
                  {compensationData.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <Card>
      <p className="text-2xl font-semibold text-deep-teal">{value}</p>
      <p className="mt-1 text-xs text-text-secondary">{label}</p>
    </Card>
  );
}
