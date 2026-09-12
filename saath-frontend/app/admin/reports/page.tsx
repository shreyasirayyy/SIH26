"use client";

import { useEffect, useState } from "react";
import { Card, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { staffService } from "@/services/case";
import { AdminReport } from "@/types";
import { Download } from "lucide-react";

export default function AdminReportsPage() {
  const [report, setReport] = useState<AdminReport | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    staffService.getReport().then(setReport).finally(() => setLoading(false));
  }, []);

  function downloadJson() {
    if (!report) return;
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "saath-admin-report.json";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
        <div>
          <h1 className="text-xl font-semibold">Reports</h1>
          <p className="mt-1 text-sm text-text-secondary">A generated, aggregated-only snapshot of the current caseload.</p>
        </div>
        <Button onClick={downloadJson} disabled={!report} className="gap-2">
          <Download size={16} /> Download JSON
        </Button>
      </div>

      {loading && <p className="text-sm text-text-secondary">Generating report...</p>}

      {report && (
        <Card>
          <CardTitle>Report summary</CardTitle>
          <dl className="mt-4 grid gap-4 sm:grid-cols-2 text-sm">
            <div><dt className="text-text-secondary">Generated at</dt><dd className="font-medium">{new Date(report.generatedAt).toLocaleString()}</dd></div>
            <div><dt className="text-text-secondary">Scope</dt><dd className="font-medium">{report.scope}</dd></div>
            <div><dt className="text-text-secondary">Privacy boundary</dt><dd className="font-medium">{report.privacyBoundary}</dd></div>
            <div><dt className="text-text-secondary">Total cases</dt><dd className="font-medium">{report.caseStats.caseCount}</dd></div>
            <div><dt className="text-text-secondary">Open alerts</dt><dd className="font-medium">{report.operationalMetrics.openAlerts}</dd></div>
            <div><dt className="text-text-secondary">Resolved alerts</dt><dd className="font-medium">{report.operationalMetrics.resolvedAlerts}</dd></div>
          </dl>
        </Card>
      )}
    </div>
  );
}
