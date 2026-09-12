"use client";

import { useEffect, useState } from "react";
import { Card, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { useAppStore } from "@/store/useAppStore";
import { caseService } from "@/services/case";
import { CaseRecord, TimelineEvent } from "@/types";
import { formatDate } from "@/lib/utils";

const STAGES = [
  { id: "Registered", label: "Registered" },
  { id: "Investigation", label: "Investigation" },
  { id: "Trial", label: "Trial" },
  { id: "Compensation", label: "Compensation" },
  { id: "Rehabilitation", label: "Rehabilitation" }
];

export default function MyCasePage() {
  const { victimToken, currentCase, monitoring, setMonitoring } = useAppStore();
  const [caseRecord, setCaseRecord] = useState<CaseRecord | null>(null);
  const [timeline, setTimeline] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!victimToken) {
      if (currentCase) setCaseRecord(currentCase);
      setLoading(false);
      setError(currentCase ? null : "Connect your case to view its details.");
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);
    Promise.all([caseService.getCase(victimToken), caseService.getTimeline(victimToken)])
      .then(([record, events]) => {
        if (cancelled) return;
        if (!record) {
          setCaseRecord(currentCase);
          setError("We could not load your case details. Please try again.");
          return;
        }
        setCaseRecord(record);
        setTimeline(events);
      })
      .catch(() => {
        if (!cancelled) {
          setCaseRecord(currentCase);
          setError("We could not load your case details. Please try again.");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [currentCase, victimToken]);

  if (loading) return <div className="px-6 py-8 text-text-secondary">Loading your case...</div>;
  if (!caseRecord) return <div className="px-6 py-8 text-text-secondary">{error}</div>;

  const stageIndex = STAGES.findIndex(s => s.id === caseRecord.currentStage);

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
            <div key={stage.id} className="flex gap-3">
              <div className="flex flex-col items-center">
                <div
                  className={`h-3 w-3 rounded-full ${
                    i < stageIndex ? "bg-deep-teal" : i === stageIndex ? "bg-amber" : "bg-border-color"
                  }`}
                />
                {i < STAGES.length - 1 && <div className="w-px flex-1 bg-border-color" />}
              </div>
              <div className="pb-5">
                <p className={`text-sm ${i === stageIndex ? "font-semibold" : "text-text-secondary"}`}>
                  {stage.label} {i === stageIndex && "· Current"}
                </p>
                {i === stageIndex && (
                  <p className="text-xs text-text-secondary mt-1">
                    {caseRecord.investigationStatus || caseRecord.rehabilitationStatus || "In progress"}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Card className="space-y-2">
        <CardTitle>Case Details</CardTitle>
        <Row label="Case category" value={caseRecord.caseCategory || "Not available"} />
        <Row label="Registered" value={caseRecord.registrationDate ? formatDate(caseRecord.registrationDate) : "Not available"} />
        <Row label="Registration channel" value={caseRecord.registrationChannel || "Not available"} />
        <Row label="Location" value={caseRecord.district && caseRecord.state ? `${caseRecord.district}, ${caseRecord.state}` : "Not available"} />
        <Row label="Incident date" value={caseRecord.incidentDate ? formatDate(caseRecord.incidentDate) : "Not available"} />
        <Row label="FIR" value={caseRecord.firStatus || "Not registered"} />
        <Row label="Investigation status" value={caseRecord.investigationStatus || "Not available"} />
        <Row label="Chargesheet" value={caseRecord.chargesheetStatus || "Not available"} />
        <Row label="Next milestone" value={caseRecord.nextHearingDate ? formatDate(caseRecord.nextHearingDate) : "No upcoming hearings"} />
        <Row label="Hearing count" value={String(caseRecord.hearingCount ?? 0)} />
        <Row label="Protection" value={caseRecord.protectionStatus || "Not requested"} />
        <Row label="Compensation" value={caseRecord.compensationStatus || "Not assessed"} />
        <Row label="Legal aid" value={caseRecord.legalAidStatus || "Not connected"} />
        <Row label="Rehabilitation" value={caseRecord.rehabilitationStatus || "Not started"} />
        <Row label="Preferred language" value={caseRecord.preferredLanguage || "Not available"} />
        <Row label="Risk level" value={caseRecord.riskLevel || "Not assessed"} />
        <Row
          label="Support"
          value={caseRecord.counsellorAssigned && caseRecord.counsellorAssigned !== "Not assigned"
            ? `Counsellor assigned: ${caseRecord.counsellorAssigned}`
            : "Not yet assigned"}
        />
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
