"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Card, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { caseService } from "@/services/case";
import { aiService } from "@/services/ai";
import { CaseRecord, AiOutput, CheckIn, TimelineEvent } from "@/types";
import { formatDate } from "@/lib/utils";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ReferenceLine } from "recharts";

// Lightweight client-side baseline approximation for demo purposes.
// The real "personal baseline" (rolling mean/stddev, persisted per survivor)
// is computed server-side; this just gives counsellors a visual sense of it
// using the check-ins already loaded on this page.
// NOTE: this is intentionally counsellor-only. We do not show baseline
// comparisons to the survivor — comparing them against "past them" is not
// something we want to surface on their side of the product.
const BASELINE_DIMENSIONS: { key: keyof CheckIn; label: string; higherIsWorse: boolean }[] = [
  { key: "sleep", label: "Sleep difficulty", higherIsWorse: true },
  { key: "intrusion", label: "Intrusive memories", higherIsWorse: true },
  { key: "avoidance", label: "Avoidance", higherIsWorse: true },
  { key: "socialConnectedness", label: "Social engagement", higherIsWorse: false },
];

function average(nums: number[]) {
  return nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : null;
}

function computeBaselineComparison(checkIns: CheckIn[]) {
  if (checkIns.length < 4) return null; // not enough data to compare periods yet
  const splitPoint = Math.max(2, Math.floor(checkIns.length / 2));
  const baselineWindow = checkIns.slice(0, splitPoint);
  const recentWindow = checkIns.slice(-splitPoint);

  return BASELINE_DIMENSIONS.map(({ key, label, higherIsWorse }) => {
    const baselineAvg = average(baselineWindow.map((c) => Number(c[key])));
    const recentAvg = average(recentWindow.map((c) => Number(c[key])));
    if (baselineAvg === null || recentAvg === null) return { label, direction: "flat" as const, baselineAvg, recentAvg };
    const diff = recentAvg - baselineAvg;
    const THRESHOLD = 0.4; // demo threshold on a 1-5 scale
    let direction: "worse" | "better" | "flat" = "flat";
    if (Math.abs(diff) >= THRESHOLD) {
      const rose = diff > 0;
      direction = rose === higherIsWorse ? "worse" : "better";
    }
    return { label, direction, baselineAvg, recentAvg };
  });
}

export default function CounsellorCaseDetailPage() {
  const params = useParams<{ id: string }>();
  const victimToken = params.id;

  const [caseRecord, setCaseRecord] = useState<CaseRecord | null>(null);
  const [aiOutputs, setAiOutputs] = useState<AiOutput[]>([]);
  const [checkIns, setCheckIns] = useState<CheckIn[]>([]);
  const [timeline, setTimeline] = useState<TimelineEvent[]>([]);

  useEffect(() => {
    caseService.getCase(victimToken).then(setCaseRecord);
    aiService.getDistressTrajectory(victimToken).then(setAiOutputs);
    aiService.getCheckInHistory().then((history) => setCheckIns(history as CheckIn[]));
    caseService.getTimeline(victimToken).then(setTimeline);
  }, [victimToken]);

  const latest = aiOutputs.at(-1);
  const chartData = aiOutputs.map((a) => ({ date: a.timestamp.slice(5), distress: a.distressScore, recovery: a.recoveryScore }));
  const baselineComparison = computeBaselineComparison(checkIns);
  const baselineDistressAvg =
    aiOutputs.length >= 4
      ? average(aiOutputs.slice(0, Math.max(2, Math.floor(aiOutputs.length / 2))).map((a) => a.distressScore))
      : null;

  if (!caseRecord) return <p className="text-text-secondary">Loading...</p>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">{caseRecord.survivorName}</h1>
        <p className="text-xs text-text-secondary font-mono">{caseRecord.docket}</p>
      </div>

      {latest && (
        <Card className="bg-pale-sage/40 border-none">
          <CardTitle>Why is this case being prioritised now?</CardTitle>
          <ul className="mt-3 space-y-1.5 text-sm">
            {latest.contributingSignals.map((s, i) => (
              <li key={i}>+ {s}</li>
            ))}
            {caseRecord.nextHearingDate && <li>+ Upcoming hearing on {formatDate(caseRecord.nextHearingDate)}</li>}
          </ul>
          <div className="mt-3 flex items-center gap-2 text-sm">
            <span className="text-text-secondary">Confidence:</span>
            {latest.insufficientEvidence || checkIns.length < 2 ? (
              <Badge tone="neutral">Insufficient evidence yet — continue monitoring</Badge>
            ) : (
              <Badge tone="teal">{latest.confidence}</Badge>
            )}
          </div>
          <p className="mt-2 text-sm font-medium">{latest.recommendedIntervention}</p>
        </Card>
      )}

      <Card>
        <CardTitle>Distress &amp; Recovery Trajectory</CardTitle>
        <div className="mt-3 h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#C8D3D0" />
              <XAxis dataKey="date" fontSize={12} stroke="#46565A" />
              <YAxis fontSize={12} stroke="#46565A" domain={[0, 100]} />
              <Tooltip />
              {baselineDistressAvg !== null && (
                <ReferenceLine
                  y={baselineDistressAvg}
                  stroke="#8a9b94"
                  strokeDasharray="4 4"
                  label={{ value: "Personal baseline", position: "insideTopLeft", fontSize: 11, fill: "#8a9b94" }}
                />
              )}
              <Line type="monotone" dataKey="distress" stroke="#E89A78" strokeWidth={2} name="Distress" dot={false} />
              <Line type="monotone" dataKey="recovery" stroke="#0F766E" strokeWidth={2} name="Recovery" dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <Card>
        <CardTitle>Compared with personal baseline</CardTitle>
        {baselineComparison ? (
          <>
            <p className="mt-1 text-xs text-text-secondary">
              Comparing this survivor&apos;s earlier check-ins against their most recent ones — not against a universal norm.
            </p>
            <div className="mt-3 space-y-2">
              {baselineComparison.map((row) => (
                <div key={row.label} className="flex items-center justify-between text-sm">
                  <span className="text-text-secondary">{row.label}</span>
                  {row.direction === "worse" && <Badge tone="amber">↑ Above baseline</Badge>}
                  {row.direction === "better" && <Badge tone="teal">↓ Below baseline (improving)</Badge>}
                  {row.direction === "flat" && <Badge tone="neutral">≈ Within baseline</Badge>}
                </div>
              ))}
            </div>
          </>
        ) : (
          <p className="mt-2 text-sm text-text-secondary">Not enough check-ins yet to compare against a personal baseline.</p>
        )}
      </Card>

      <Card>
        <CardTitle>Case Context</CardTitle>
        <div className="mt-3 grid grid-cols-2 gap-y-2 text-sm">
          <span className="text-text-secondary">Stage</span>
          <span className="text-right font-medium">{caseRecord.currentStage}</span>
          <span className="text-text-secondary">FIR status</span>
          <span className="text-right font-medium">{caseRecord.firStatus}</span>
          <span className="text-text-secondary">Protection</span>
          <span className="text-right font-medium">{caseRecord.protectionStatus}</span>
          <span className="text-text-secondary">Compensation</span>
          <span className="text-right font-medium">{caseRecord.compensationStatus}</span>
        </div>
      </Card>

      {timeline.length > 0 && (
        <Card>
          <CardTitle>Event Timeline</CardTitle>
          <div className="mt-3 space-y-2 text-sm">
            {timeline.map((e, i) => (
              <div key={i} className="flex gap-3">
                <span className="w-20 shrink-0 text-text-secondary">{formatDate(e.date)}</span>
                <span>{e.label}</span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {checkIns.length > 0 && (
        <Card>
          <CardTitle>Recent Check-in Signals</CardTitle>
          <table className="mt-3 w-full text-xs text-left">
            <thead className="text-text-secondary">
              <tr>
                <th className="py-1">Date</th>
                <th>Sleep</th>
                <th>Fear</th>
                <th>Intrusion</th>
                <th>Social</th>
              </tr>
            </thead>
            <tbody>
              {checkIns.slice(-5).map((c, i) => (
                <tr key={i} className="border-t border-border-color">
                  <td className="py-1.5">{formatDate(c.timestamp)}</td>
                  <td>{c.sleep}</td>
                  <td>{c.fear}</td>
                  <td>{c.intrusion}</td>
                  <td>{c.socialConnectedness}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}