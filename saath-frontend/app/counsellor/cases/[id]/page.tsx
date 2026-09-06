"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Card, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { caseService } from "@/services/case";
import { aiService } from "@/services/ai";
import { CaseRecord, AiOutput, CheckIn, TimelineEvent } from "@/types";
import { formatDate } from "@/lib/utils";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

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
    aiService.getCheckInHistory(victimToken).then(setCheckIns);
    caseService.getTimeline(victimToken).then(setTimeline);
  }, [victimToken]);

  const latest = aiOutputs.at(-1);
  const chartData = aiOutputs.map((a) => ({ date: a.timestamp.slice(5), distress: a.distressScore, recovery: a.recoveryScore }));

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
              <Line type="monotone" dataKey="distress" stroke="#E89A78" strokeWidth={2} name="Distress" dot={false} />
              <Line type="monotone" dataKey="recovery" stroke="#0F766E" strokeWidth={2} name="Recovery" dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
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
