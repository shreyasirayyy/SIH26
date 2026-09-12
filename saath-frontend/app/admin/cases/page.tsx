"use client";

import { useEffect, useState } from "react";
import { Card, CardTitle } from "@/components/ui/Card";
import { staffService } from "@/services/case";
import { AdminReport } from "@/types";

export default function AdminCasesPage() {
  const [report, setReport] = useState<AdminReport | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    staffService.getReport().then(setReport).finally(() => setLoading(false));
  }, []);

  const total = report?.caseStats.caseCount ?? 0;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Cases</h1>
        <p className="mt-1 text-sm text-text-secondary">
          Aggregated case-stage and recovery breakdown. Individual survivor identities aren&apos;t shown at this access level — see the counsellor workspace for case-level detail.
        </p>
      </div>

      {loading && <p className="text-sm text-text-secondary">Loading...</p>}

      {report && (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Card><CardTitle>Total cases</CardTitle><p className="mt-2 text-2xl font-semibold">{total}</p></Card>
            <Card><CardTitle>Improving</CardTitle><p className="mt-2 text-2xl font-semibold text-sage">{report.distressStats.trend.improving}</p></Card>
            <Card><CardTitle>Stable</CardTitle><p className="mt-2 text-2xl font-semibold">{report.distressStats.trend.stable}</p></Card>
            <Card><CardTitle>Worsening</CardTitle><p className="mt-2 text-2xl font-semibold text-[#a2542f]">{report.distressStats.trend.worsening}</p></Card>
          </div>

          <Card>
            <CardTitle>Cases by stage</CardTitle>
            <div className="mt-4 space-y-3">
              {report.caseStats.stageStats.map((row) => {
                const pct = total ? Math.round((row.count / total) * 100) : 0;
                return (
                  <div key={row.stage}>
                    <div className="flex justify-between text-sm">
                      <span className="font-medium">{row.stage}</span>
                      <span className="text-text-secondary">{row.count} ({pct}%)</span>
                    </div>
                    <div className="mt-1 h-2 rounded-full bg-pale-sage/50">
                      <div className="h-2 rounded-full bg-deep-teal" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>

          <Card>
            <CardTitle>Risk distribution</CardTitle>
            <div className="mt-4 grid gap-3 sm:grid-cols-4">
              {Object.entries(report.distressStats.distressDistribution).map(([level, count]) => (
                <div key={level} className="rounded-xl bg-greenish-cream p-4 text-center">
                  <p className="text-2xl font-semibold text-deep-teal">{count}</p>
                  <p className="mt-1 text-xs text-text-secondary">{level}</p>
                </div>
              ))}
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
