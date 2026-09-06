"use client";

import { useEffect, useState } from "react";
import { Card, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { useAppStore } from "@/store/useAppStore";
import { caseService } from "@/services/case";
import { CaseRecord, TimelineEvent } from "@/types";
import { formatDate } from "@/lib/utils";

const STAGES = ["Registered", "Investigation", "Trial", "Compensation", "Rehabilitation"];

export default function MyCasePage() {
  const { victimToken, monitoring, setMonitoring } = useAppStore();
  const [caseRecord, setCaseRecord] = useState<CaseRecord | null>(null);
  const [timeline, setTimeline] = useState<TimelineEvent[]>([]);

  useEffect(() => {
    if (!victimToken) return;
    caseService.getCase(victimToken).then(setCaseRecord);
    caseService.getTimeline(victimToken).then(setTimeline);
  }, [victimToken]);

  if (!caseRecord) return <div className="px-6 py-8 text-text-secondary">Loading...</div>;

  const stageIndex = STAGES.indexOf(caseRecord.currentStage);

  return (
    <div className="px-6 py-8 space-y-6">
      <div>
        <h1 className="text-lg font-semibold">My Case</h1>
        <p className="mt-1 font-mono text-sm">{caseRecord.docket}</p>
      </div>

      <Card>
        <CardTitle>Timeline</CardTitle>
        <div className="mt-4 space-y-0">
          {STAGES.map((stage, i) => (
            <div key={stage} className="flex gap-3">
              <div className="flex flex-col items-center">
                <div
                  className={`h-3 w-3 rounded-full ${
                    i < stageIndex ? "bg-deep-teal" : i === stageIndex ? "bg-amber" : "bg-border-color"
                  }`}
                />
                {i < STAGES.length - 1 && <div className="w-px flex-1 bg-border-color" />}
              </div>
              <p className={`pb-5 text-sm ${i === stageIndex ? "font-semibold" : "text-text-secondary"}`}>
                {stage} {i === stageIndex && "· Current"}
              </p>
            </div>
          ))}
        </div>
      </Card>

      <Card className="space-y-2">
        <CardTitle>Case Details</CardTitle>
        <Row label="Registered" value={formatDate(caseRecord.registrationDate)} />
        <Row label="Next milestone" value={caseRecord.nextHearingDate ? formatDate(caseRecord.nextHearingDate) : "—"} />
        <Row label="Protection" value={caseRecord.protectionStatus} />
        <Row label="Compensation" value={caseRecord.compensationStatus} />
        <Row label="Legal aid" value={caseRecord.legalAidStatus} />
        <Row label="Support" value={`Counsellor: ${caseRecord.counsellorAssigned}`} />
      </Card>

      {timeline.length > 0 && (
        <Card>
          <CardTitle>Case + Support + Well-being Events</CardTitle>
          <div className="mt-3 space-y-3">
            {timeline.map((e, i) => (
              <div key={i} className="flex gap-3 text-sm">
                <span className="text-text-secondary w-20 shrink-0">{formatDate(e.date)}</span>
                <Badge tone={e.type === "case" ? "teal" : e.type === "support" ? "sage" : "amber"} className="h-fit shrink-0">
                  {e.type}
                </Badge>
                <span>{e.label}</span>
              </div>
            ))}
          </div>
        </Card>
      )}

      <Card>
        <CardTitle>Monitoring</CardTitle>
        <p className="mt-2 text-sm text-text-secondary">
          Current status: <span className="font-medium text-text-primary">{monitoring}</span>
        </p>
        <p className="mt-2 text-xs text-text-secondary">
          No pressure. You remain in control. Support stays available even if you pause or stop.
        </p>
        <div className="mt-3 flex gap-2">
          {monitoring !== "active" && (
            <Button size="sm" onClick={() => setMonitoring("active")}>
              Resume monitoring
            </Button>
          )}
          {monitoring === "active" && (
            <Button size="sm" variant="secondary" onClick={() => setMonitoring("paused")}>
              Pause monitoring
            </Button>
          )}
          {monitoring !== "stopped" && (
            <Button size="sm" variant="danger" onClick={() => setMonitoring("stopped")}>
              Stop monitoring
            </Button>
          )}
        </div>
      </Card>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between py-2 border-b border-border-color last:border-0">
      <span className="text-sm text-text-secondary">{label}</span>
      <span className="text-sm font-medium text-text-primary">{value}</span>
    </div>
  );
}
