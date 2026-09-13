/**
 * SAATH District Admin PDF Reporting Engine
 * Synthesizes a structured, highly formatted printable PDF document
 * adhering to all SAATH security, privacy boundaries, and branding.
 */

import { AdminReport } from "@/types";

export function generateAdminReportPdf(report: AdminReport) {
  const printWindow = window.open("", "_blank");
  if (!printWindow) {
    alert("Please allow popups to download the PDF report.");
    return;
  }

  const generatedDate = new Date(report.generatedAt).toLocaleString("en-IN", {
    dateStyle: "long",
    timeStyle: "short",
  });
  const fileDate = new Date(report.generatedAt).toISOString().slice(0, 10).replace(/-/g, "_");

  const totalCases = report.caseStats.caseCount;
  const criticalHighRisk =
    (report.distressStats.distressDistribution.CRITICAL ?? 0) +
    (report.distressStats.distressDistribution.HIGH ?? 0);
  const openAlerts = report.operationalMetrics.openAlerts;
  const resolvedAlerts = report.operationalMetrics.resolvedAlerts;
  const avgAckTime = report.operationalMetrics.avgAcknowledgeTimeMs
    ? `${Math.round(report.operationalMetrics.avgAcknowledgeTimeMs / 60000)}m`
    : "—";
  const avgResTime = report.operationalMetrics.avgResolutionTimeMs
    ? `${Math.round(report.operationalMetrics.avgResolutionTimeMs / 3600000)}h`
    : "—";

  const stageRows = (report.caseStats.stageStats || [])
    .map((s) => {
      const pct = totalCases ? Math.round((s.count / totalCases) * 100) : 0;
      return `<tr>
        <td style="padding: 8px 12px; border-bottom: 1px solid #e2e8f0; font-weight: 500;">${s.stage}</td>
        <td style="padding: 8px 12px; border-bottom: 1px solid #e2e8f0; text-align: right; font-weight: 600;">${s.count}</td>
        <td style="padding: 8px 12px; border-bottom: 1px solid #e2e8f0; text-align: right; color: #64748b;">${pct}%</td>
      </tr>`;
    })
    .join("");

  const districtRows = (report.caseStats.districtStats || [])
    .map((d) => {
      const pct = totalCases ? Math.round((d.count / totalCases) * 100) : 0;
      return `<tr>
        <td style="padding: 8px 12px; border-bottom: 1px solid #e2e8f0; font-weight: 500;">${d.district}</td>
        <td style="padding: 8px 12px; border-bottom: 1px solid #e2e8f0; text-align: right; font-weight: 600;">${d.count}</td>
        <td style="padding: 8px 12px; border-bottom: 1px solid #e2e8f0; text-align: right; color: #64748b;">${pct}%</td>
      </tr>`;
    })
    .join("");

  const riskRows = Object.entries(report.distressStats.distressDistribution || {})
    .map(([level, count]) => {
      const pct = totalCases ? Math.round((count / totalCases) * 100) : 0;
      const color =
        level === "CRITICAL"
          ? "#e11d48"
          : level === "HIGH"
          ? "#d97706"
          : level === "MODERATE"
          ? "#0284c7"
          : "#16a34a";
      return `<tr>
        <td style="padding: 8px 12px; border-bottom: 1px solid #e2e8f0; font-weight: 600; color: ${color};">${level}</td>
        <td style="padding: 8px 12px; border-bottom: 1px solid #e2e8f0; text-align: right; font-weight: 600;">${count}</td>
        <td style="padding: 8px 12px; border-bottom: 1px solid #e2e8f0; text-align: right; color: #64748b;">${pct}%</td>
      </tr>`;
    })
    .join("");

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>SAATH_District_Report_${fileDate}</title>
  <style>
    @page {
      size: A4;
      margin: 18mm 16mm;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      color: #1e293b;
      line-height: 1.45;
      font-size: 11pt;
      margin: 0;
      padding: 0;
      background: #ffffff;
    }
    .header {
      border-bottom: 2px solid #0f766e;
      padding-bottom: 12px;
      margin-bottom: 20px;
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
    }
    .title-block h1 {
      font-size: 20pt;
      margin: 0;
      color: #0f766e;
      font-weight: 700;
      letter-spacing: -0.5px;
    }
    .title-block p {
      margin: 4px 0 0 0;
      color: #64748b;
      font-size: 9pt;
      font-weight: 500;
      text-transform: uppercase;
      letter-spacing: 1px;
    }
    .meta-block {
      text-align: right;
      font-size: 9pt;
      color: #475569;
    }
    .badge {
      display: inline-block;
      padding: 3px 8px;
      border-radius: 4px;
      background-color: #f1f5f9;
      color: #0f766e;
      font-weight: 600;
      font-size: 8pt;
      margin-top: 4px;
    }
    .kpi-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 12px;
      margin-bottom: 22px;
    }
    .kpi-card {
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 10px 14px;
      background: #f8fafc;
    }
    .kpi-label {
      font-size: 8pt;
      font-weight: 600;
      color: #64748b;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 4px;
    }
    .kpi-value {
      font-size: 16pt;
      font-weight: 700;
      color: #0f766e;
      margin: 0;
    }
    .section-title {
      font-size: 12pt;
      font-weight: 700;
      color: #0f172a;
      border-left: 3px solid #0f766e;
      padding-left: 8px;
      margin: 20px 0 10px 0;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .grid-2 {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
      margin-bottom: 18px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 9.5pt;
      margin-bottom: 12px;
    }
    th {
      background: #f1f5f9;
      padding: 8px 12px;
      text-align: left;
      font-size: 8.5pt;
      font-weight: 700;
      color: #475569;
      text-transform: uppercase;
      border-bottom: 1px solid #cbd5e1;
    }
    .notice-box {
      border: 1px solid #cbd5e1;
      background-color: #f8fafc;
      border-radius: 6px;
      padding: 10px 14px;
      font-size: 8.5pt;
      color: #475569;
      margin-top: 24px;
    }
    .footer {
      margin-top: 30px;
      border-top: 1px solid #e2e8f0;
      padding-top: 10px;
      font-size: 8pt;
      color: #94a3b8;
      display: flex;
      justify-content: space-between;
    }
    @media print {
      body { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="title-block">
      <h1>SAATH</h1>
      <p>District Operational Intelligence & Caseload Report</p>
    </div>
    <div class="meta-block">
      <div><strong>Report Date:</strong> ${generatedDate}</div>
      <div><strong>Jurisdiction:</strong> ${report.scope.toUpperCase()} ADMINISTRATION</div>
      <div class="badge">AGGREGATED DATA ONLY · ROLE RESTRICTED</div>
    </div>
  </div>

  <div class="kpi-grid">
    <div class="kpi-card">
      <div class="kpi-label">Total Caseload</div>
      <div class="kpi-value">${totalCases}</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-label">Critical / High Risk</div>
      <div class="kpi-value" style="color: #d97706;">${criticalHighRisk}</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-label">Open Alerts</div>
      <div class="kpi-value" style="color: #e11d48;">${openAlerts}</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-label">Avg Resolution Time</div>
      <div class="kpi-value">${avgResTime}</div>
    </div>
  </div>

  <div class="grid-2">
    <div>
      <div class="section-title">Case Stage Progression</div>
      <table>
        <thead>
          <tr>
            <th>Stage</th>
            <th style="text-align: right;">Count</th>
            <th style="text-align: right;">Share</th>
          </tr>
        </thead>
        <tbody>
          ${stageRows}
        </tbody>
      </table>
    </div>

    <div>
      <div class="section-title">Caseload Risk Distribution</div>
      <table>
        <thead>
          <tr>
            <th>Risk Tier</th>
            <th style="text-align: right;">Count</th>
            <th style="text-align: right;">Share</th>
          </tr>
        </thead>
        <tbody>
          ${riskRows}
        </tbody>
      </table>
    </div>
  </div>

  <div class="grid-2">
    <div>
      <div class="section-title">Geographic Coverage by District</div>
      <table>
        <thead>
          <tr>
            <th>District</th>
            <th style="text-align: right;">Active Cases</th>
            <th style="text-align: right;">Caseload %</th>
          </tr>
        </thead>
        <tbody>
          ${districtRows || '<tr><td colspan="3" style="padding: 8px 12px; text-align: center; color: #94a3b8;">No district breakdown available</td></tr>'}
        </tbody>
      </table>
    </div>

    <div>
      <div class="section-title">Operational Response Metrics</div>
      <table>
        <thead>
          <tr>
            <th>Metric</th>
            <th style="text-align: right;">Value</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style="padding: 8px 12px; border-bottom: 1px solid #e2e8f0;">Total Alerts Logged</td>
            <td style="padding: 8px 12px; border-bottom: 1px solid #e2e8f0; text-align: right; font-weight: 600;">${report.operationalMetrics.totalAlerts}</td>
          </tr>
          <tr>
            <td style="padding: 8px 12px; border-bottom: 1px solid #e2e8f0;">Active / Open Alerts</td>
            <td style="padding: 8px 12px; border-bottom: 1px solid #e2e8f0; text-align: right; font-weight: 600; color: #e11d48;">${openAlerts}</td>
          </tr>
          <tr>
            <td style="padding: 8px 12px; border-bottom: 1px solid #e2e8f0;">Resolved Alerts</td>
            <td style="padding: 8px 12px; border-bottom: 1px solid #e2e8f0; text-align: right; font-weight: 600; color: #16a34a;">${resolvedAlerts}</td>
          </tr>
          <tr>
            <td style="padding: 8px 12px; border-bottom: 1px solid #e2e8f0;">Avg Acknowledge Time</td>
            <td style="padding: 8px 12px; border-bottom: 1px solid #e2e8f0; text-align: right; font-weight: 600;">${avgAckTime}</td>
          </tr>
          <tr>
            <td style="padding: 8px 12px; border-bottom: 1px solid #e2e8f0;">Urgent (P1) Alerts</td>
            <td style="padding: 8px 12px; border-bottom: 1px solid #e2e8f0; text-align: right; font-weight: 600; color: #e11d48;">${report.operationalMetrics.urgentAlertCount}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>

  <div class="section-title">Wellbeing & Recovery Dynamics</div>
  <div class="grid-2">
    <div style="border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; background: #fafafa;">
      <div style="font-weight: 600; font-size: 10pt; color: #0f766e; margin-bottom: 6px;">Distress Trend Delta (vs Baseline)</div>
      <div style="font-size: 9pt; color: #475569;">
        <div><strong>Improving (Delta &le; -8):</strong> ${report.distressStats.trend.improving} cases</div>
        <div><strong>Stable (&plusmn;7 pts):</strong> ${report.distressStats.trend.stable} cases</div>
        <div><strong>Worsening (Delta &ge; +8):</strong> ${report.distressStats.trend.worsening} cases</div>
        <div><strong>Sample Size:</strong> ${report.distressStats.trend.sampleSize} scored cases</div>
      </div>
    </div>
    <div style="border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; background: #fafafa;">
      <div style="font-weight: 600; font-size: 10pt; color: #0f766e; margin-bottom: 6px;">Recovery Trajectory</div>
      <div style="font-size: 9pt; color: #475569;">
        <div><strong>Active Recovery:</strong> ${report.recoveryStats.recoveryTrend.recovering} cases</div>
        <div><strong>Plateau / Flat:</strong> ${report.recoveryStats.recoveryTrend.flat} cases</div>
        <div><strong>Elevated Care Needed:</strong> ${report.recoveryStats.recoveryTrend.relapsing} cases</div>
        <div><strong>Sample Size:</strong> ${report.recoveryStats.recoveryTrend.sampleSize} scored cases</div>
      </div>
    </div>
  </div>

  <div class="notice-box">
    <strong>Privacy & Compliance Boundary Notice:</strong><br/>
    This document was generated automatically by the SAATH Operational Intelligence Platform for official district monitoring. In strict adherence to victim data protection standards, this report contains aggregated statistical counts only. No survivor names, contact records, victim identification tokens, private counsellor notes, or raw conversation signals are included or accessible at this administrative scope.
    <br/><br/>
    <strong>Synthetic Demonstration Data:</strong><br/>
    All metrics and figures presented reflect synthetic test records created exclusively for Smart India Hackathon (SIH) prototype demonstration.
  </div>

  <div class="footer">
    <div>SAATH Platform · National Health & Legal Assistance Authority</div>
    <div>Report ID: SAATH_REP_${fileDate} · Confidential</div>
  </div>

  <script>
    window.onload = function() {
      setTimeout(function() {
        window.print();
      }, 500);
    };
  </script>
</body>
</html>
  `;

  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
}
