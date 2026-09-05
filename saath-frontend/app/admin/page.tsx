"use client";

import { Card, CardTitle } from "@/components/ui/Card";
import { DEMO_ADMIN_TRENDS } from "@/data/demo/cases";
import { useAppStore } from "@/store/useAppStore";
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend,
} from "recharts";

const COLORS = ["#0F766E", "#2FA6A0", "#7FAF86", "#E89A78", "#5B8DB8"];

export default function AdminDashboardPage() {
  const { districts, monthlyDistressTrend, interventionCoverage } = DEMO_ADMIN_TRENDS;
  const role = useAppStore((state) => state.role);
  const scope = role === "district" ? "District" : role === "state" ? "State" : "National";
  const totalCaseload = districts.reduce((s, d) => s + d.caseload, 0);
  const totalHighPriority = districts.reduce((s, d) => s + d.highPriority, 0);

  return (
    <div className="space-y-6">
      <div>
        <div className="flex flex-col justify-between gap-3 md:flex-row md:items-end"><div><p className="text-xs font-bold uppercase tracking-[.18em] text-deep-teal">{scope} administration</p><h1 className="mt-1 text-3xl font-semibold">Aggregated Overview</h1></div><span className="rounded-full bg-pale-sage px-3 py-1 text-xs font-bold text-deep-teal">Synthetic Demonstration Data</span></div>
        <p className="mt-1 text-sm text-text-secondary">
          {scope === "District" ? "Jaipur district operational view with case-level counts." : scope === "State" ? "Rajasthan state view with district comparisons." : "National view with aggregated intelligence only."}
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Stat label="Total caseload" value={totalCaseload} />
        <Stat label="High-priority cases" value={totalHighPriority} />
        <Stat label="Avg response (hrs)" value={Math.round(districts.reduce((s, d) => s + d.avgResponseHrs, 0) / districts.length)} />
        <Stat label={scope === "National" ? "Districts with rising trends" : "Districts covered"} value={scope === "National" ? 8 : districts.length} />
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.25fr_.75fr]"><Card className="bg-deep-teal text-white"><CardTitle className="text-white">{scope === "District" ? "Today in Jaipur" : scope === "State" ? "Districts needing attention" : "National signal"}</CardTitle><div className="mt-5 grid gap-4 sm:grid-cols-3"><div><p className="text-3xl font-semibold">{scope === "District" ? "6" : scope === "State" ? "2" : "8"}</p><p className="mt-1 text-xs text-white/70">rising distress signals</p></div><div><p className="text-3xl font-semibold">{scope === "District" ? "14h" : scope === "State" ? "12h" : "16h"}</p><p className="mt-1 text-xs text-white/70">median alert response</p></div><div><p className="text-3xl font-semibold">{scope === "District" ? "71%" : scope === "State" ? "68%" : "74%"}</p><p className="mt-1 text-xs text-white/70">follow-up completion</p></div></div></Card><Card><CardTitle>Privacy boundary</CardTitle><p className="mt-3 text-sm leading-relaxed text-text-secondary">This workspace shows aggregated intelligence. Individual survivor names, detailed signals, and clinical labels are not available at {scope.toLowerCase()} scope.</p><div className="mt-4 flex items-center gap-2 text-xs font-semibold text-deep-teal"><span className="h-2 w-2 rounded-full bg-sage" />Role-based access active</div></Card></div>

      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardTitle>Distress vs Recovery Trend</CardTitle>
          <div className="mt-3 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={monthlyDistressTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#C8D3D0" />
                <XAxis dataKey="month" fontSize={12} stroke="#46565A" />
                <YAxis fontSize={12} stroke="#46565A" />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="avgDistress" name="Avg Distress" stroke="#E89A78" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="avgRecovery" name="Avg Recovery" stroke="#0F766E" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card>
          <CardTitle>Intervention Coverage</CardTitle>
          <div className="mt-3 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={interventionCoverage} dataKey="value" nameKey="name" outerRadius={90} label>
                  {interventionCoverage.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="md:col-span-2">
          <CardTitle>Caseload &amp; High-Priority by District</CardTitle>
          <div className="mt-3 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={districts}>
                <CartesianGrid strokeDasharray="3 3" stroke="#C8D3D0" />
                <XAxis dataKey="district" fontSize={12} stroke="#46565A" />
                <YAxis fontSize={12} stroke="#46565A" />
                <Tooltip />
                <Legend />
                <Bar dataKey="caseload" name="Total caseload" fill="#2FA6A0" radius={[6, 6, 0, 0]} />
                <Bar dataKey="highPriority" name="High priority" fill="#E89A78" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      <Card><CardTitle>Audit log</CardTitle><div className="mt-3 divide-y divide-border-color text-sm">{[{ time: "09:31", actor: "COUNSELLOR_391", action: "VIEW_CASE", target: "VIC_8291", reason: "CRITICAL_ALERT_REVIEW" }, { time: "09:18", actor: "ADMIN_204", action: "VIEW_AGGREGATE", target: "RAJASTHAN", reason: "WEEKLY_RESPONSE_REVIEW" }].map((entry) => <div key={entry.time} className="grid gap-1 py-3 md:grid-cols-[70px_1fr_1fr_1.4fr]"><span className="text-text-secondary">{entry.time}</span><span className="font-medium">{entry.actor}</span><span>{entry.action} · {entry.target}</span><span className="text-text-secondary">{entry.reason}</span></div>)}</div></Card>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <Card>
      <p className="text-2xl font-semibold text-deep-teal">{value}</p>
      <p className="mt-1 text-xs text-text-secondary">{label}</p>
    </Card>
  );
}
