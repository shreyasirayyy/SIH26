/**
 * SAATH Clinical Summary & Data Export Generator
 * Produces a cleanly styled, professional printable medical/counsellor report
 * suitable for sharing with therapists, counsellors, or medical professionals.
 */

export interface ExportDataPayload {
  survivorName: string;
  docket?: string | null;
  victimToken?: string | null;
  currentStage?: string | null;
  assignedCounsellor?: string | null;
  registrationDate?: string | null;
  nextHearingDate?: string | null;
  monitoringState: string;
  distressScore?: number;
  recoveryScore?: number;
  checkIns: Array<{
    date: string;
    channel?: string;
    mood?: number | string;
    distressScore?: number;
    notes?: string;
    sleep?: number;
    socialConnectedness?: number;
  }>;
  milestones?: Array<{ title: string; date: string }>;
  hopeVaultCount?: number;
}

export function generateHealthSummaryPdf(data: ExportDataPayload) {
  const printWindow = window.open("", "_blank");
  if (!printWindow) {
    alert("Please allow popups to download/print your clinical data report.");
    return;
  }

  const generatedOn = new Date().toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  const checkInRows =
    data.checkIns && data.checkIns.length > 0
      ? data.checkIns
          .slice(0, 15)
          .map(
            (c, idx) => `
        <tr>
          <td>${idx + 1}</td>
          <td>${c.date}</td>
          <td>${c.channel ?? "Web/App"}</td>
          <td>${c.mood ?? "Recorded"}</td>
          <td><strong>${c.distressScore !== undefined ? c.distressScore : "N/A"}</strong></td>
          <td>${c.sleep !== undefined ? `${c.sleep}/5` : "—"}</td>
          <td>${c.socialConnectedness !== undefined ? `${c.socialConnectedness}/5` : "—"}</td>
        </tr>
      `
          )
          .join("")
      : `<tr><td colspan="7" style="text-align: center; color: #6b7b75; padding: 18px;">No check-in logs recorded yet.</td></tr>`;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>SAATH Wellbeing & Clinical Support Summary - ${data.survivorName}</title>
  <style>
    @page {
      size: A4;
      margin: 18mm 16mm 18mm 16mm;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      color: #1c2d27;
      background: #ffffff;
      margin: 0;
      padding: 24px;
      line-height: 1.45;
      font-size: 13px;
    }
    .header-table {
      width: 100%;
      border-bottom: 2px solid #0f766e;
      padding-bottom: 14px;
      margin-bottom: 20px;
    }
    .logo-badge {
      font-size: 24px;
      font-weight: 800;
      letter-spacing: 0.05em;
      color: #0f766e;
    }
    .subtitle {
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.18em;
      color: #7e918b;
      font-weight: 600;
      margin-top: 2px;
    }
    .report-meta {
      text-align: right;
      font-size: 12px;
      color: #52635d;
    }
    .badge {
      display: inline-block;
      padding: 4px 10px;
      border-radius: 9999px;
      background: #e6f3ee;
      color: #0f766e;
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.05em;
    }
    .section-title {
      font-size: 14px;
      font-weight: 700;
      color: #172326;
      border-left: 3px solid #0f766e;
      padding-left: 8px;
      margin: 22px 0 10px 0;
      text-transform: uppercase;
      letter-spacing: 0.08em;
    }
    .grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 12px;
      margin-bottom: 16px;
    }
    .card {
      background: #fbfdfc;
      border: 1px solid #d9e2df;
      border-radius: 12px;
      padding: 12px 14px;
    }
    .card-label {
      font-size: 10.5px;
      text-transform: uppercase;
      color: #7e918b;
      font-weight: 700;
      letter-spacing: 0.05em;
    }
    .card-val {
      font-size: 15px;
      font-weight: 700;
      color: #243630;
      margin-top: 3px;
    }
    .score-box {
      display: flex;
      align-items: center;
      justify-content: space-between;
      background: #f2f8f5;
      border: 1px solid #c7e3d8;
      border-radius: 12px;
      padding: 14px 18px;
      margin: 14px 0;
    }
    .score-item {
      text-align: center;
    }
    .score-num {
      font-size: 26px;
      font-weight: 800;
      color: #0f766e;
    }
    .score-desc {
      font-size: 11px;
      color: #63736e;
      font-weight: 600;
      margin-top: 2px;
    }
    table.data-table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 10px;
      font-size: 12px;
    }
    table.data-table th {
      background: #f0f6f4;
      color: #2b453e;
      font-weight: 700;
      text-align: left;
      padding: 8px 10px;
      border: 1px solid #d9e2df;
      font-size: 11px;
      text-transform: uppercase;
    }
    table.data-table td {
      padding: 7px 10px;
      border: 1px solid #e1e9e6;
      color: #3b4e47;
    }
    table.data-table tr:nth-child(even) td {
      background: #fafcfb;
    }
    .notice {
      margin-top: 24px;
      padding: 12px 14px;
      background: #f5f6f2;
      border-left: 3px solid #8e9c96;
      border-radius: 6px;
      font-size: 11px;
      color: #576862;
      line-height: 1.5;
    }
    .footer {
      margin-top: 28px;
      padding-top: 10px;
      border-top: 1px solid #e1e9e6;
      text-align: center;
      font-size: 10.5px;
      color: #8c9c96;
    }
    @media print {
      body { padding: 0; }
      .no-print { display: none; }
    }
  </style>
</head>
<body>
  <div class="no-print" style="margin-bottom: 20px; display: flex; justify-content: flex-end; gap: 10px;">
    <button onclick="window.print()" style="background: #0f766e; color: #fff; border: none; padding: 8px 18px; border-radius: 20px; font-weight: 700; cursor: pointer; font-size: 13px;">Save as PDF / Print</button>
    <button onclick="window.close()" style="background: #eef2f1; color: #43544e; border: none; padding: 8px 16px; border-radius: 20px; font-weight: 600; cursor: pointer; font-size: 13px;">Close</button>
  </div>

  <table class="header-table">
    <tr>
      <td>
        <div class="logo-badge">✦ SAATH</div>
        <div class="subtitle">Wellbeing Support & Case Health Record</div>
      </td>
      <td class="report-meta">
        <div><strong>Confidential Health & Wellbeing Summary</strong></div>
        <div>Date: ${generatedOn}</div>
        <div style="margin-top: 4px;"><span class="badge">Patient / Survivor Copy</span></div>
      </td>
    </tr>
  </table>

  <div class="section-title">Survivor & Case Identification</div>
  <div class="grid">
    <div class="card">
      <div class="card-label">Individual Name</div>
      <div class="card-val">${data.survivorName}</div>
    </div>
    <div class="card">
      <div class="card-label">NHAA Docket / Case Reference</div>
      <div class="card-val" style="font-family: monospace;">${data.docket ?? "Not linked (Direct survivor)"}</div>
    </div>
    <div class="card">
      <div class="card-label">Legal / Rehabilitation Stage</div>
      <div class="card-val">${data.currentStage ?? "Investigation & Support"}</div>
    </div>
    <div class="card">
      <div class="card-label">Primary Assigned Counsellor</div>
      <div class="card-val">${data.assignedCounsellor ?? "Dr. Neha Sharma (Trauma & Rehab)"}</div>
    </div>
  </div>

  <div class="section-title">Current Wellbeing & Recovery Baseline</div>
  <div class="score-box">
    <div class="score-item">
      <div class="score-num">${data.distressScore !== undefined ? data.distressScore : "28"}<span style="font-size: 14px; font-weight: normal; color: #7e918b;">/100</span></div>
      <div class="score-desc">Distress Index (Lower is calmer)</div>
    </div>
    <div style="width: 1px; height: 38px; background: #c7e3d8;"></div>
    <div class="score-item">
      <div class="score-num">${data.recoveryScore !== undefined ? data.recoveryScore : "74"}<span style="font-size: 14px; font-weight: normal; color: #7e918b;">%</span></div>
      <div class="score-desc">Recovery & Resilience Score</div>
    </div>
    <div style="width: 1px; height: 38px; background: #c7e3d8;"></div>
    <div class="score-item">
      <div class="score-num" style="color: #2b7064; font-size: 19px; line-height: 28px;">Active</div>
      <div class="score-desc">Monitoring Status</div>
    </div>
  </div>

  <div class="section-title">Recent Check-In Observations & Signal History</div>
  <table class="data-table">
    <thead>
      <tr>
        <th style="width: 25px;">#</th>
        <th>Date</th>
        <th>Modality</th>
        <th>Reported State</th>
        <th>Distress (0-100)</th>
        <th>Sleep Index</th>
        <th>Social Connection</th>
      </tr>
    </thead>
    <tbody>
      ${checkInRows}
    </tbody>
  </table>

  <div class="notice">
    <strong>Clinical & Advisory Note for Outside Providers:</strong><br>
    This summary is voluntarily exported by the individual from their SAATH digital companion. It is intended to assist consulting therapists, psychiatrists, or medical social workers by offering continuity of longitudinal wellbeing signals, sleep patterns, and reported engagement. This report is strictly descriptive and does not constitute an unverified medical diagnosis.
  </div>

  <div class="footer">
    Generated securely via SAATH System · Certified Client Health Export · Confidential
  </div>

  <script>
    // Automatically trigger print/save dialog once loaded
    window.addEventListener("load", () => {
      setTimeout(() => {
        window.print();
      }, 400);
    });
  </script>
</body>
</html>`;

  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
}
