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

const formatValue = (value: string | number | boolean | null | undefined, fallback = "Not available") => {
  if (value === null || value === undefined || value === "") return fallback;
  if (typeof value === "boolean") return value ? "Yes" : "No";
  return String(value);
};

const formatDateValue = (value: string | null | undefined) => (value ? formatDate(value) : "Not available");

const formatLocation = (city?: string, district?: string, state?: string) => {
  if (city && district && state) return `${city}, ${district}, ${state}`;
  if (city && district) return `${city}, ${district}`;
  if (district && state) return `${district}, ${state}`;
  if (city) return city;
  return "Not available";
};

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
  const detailRows = [
    { label: "Case category", value: formatValue(caseRecord.caseCategory) },
    { label: "Complainant type", value: formatValue(caseRecord.complainantType) },
    { label: "Age group", value: formatValue(caseRecord.ageGroup) },
    { label: "Gender", value: formatValue(caseRecord.gender) },
    { label: "Registration channel", value: formatValue(caseRecord.registrationChannel) },
    { label: "Preferred contact channel", value: formatValue(caseRecord.preferredContactChannel) },
    { label: "Preferred language", value: formatValue(caseRecord.preferredLanguage) },
    { label: "Registered mobile", value: formatValue(caseRecord.registeredPhone) },
    { label: "Registration date", value: formatDateValue(caseRecord.registrationDate) },
    { label: "Incident date", value: formatDateValue(caseRecord.incidentDate) },
    { label: "Location", value: formatLocation(caseRecord.city, caseRecord.district, caseRecord.state) },
    { label: "Incident category", value: formatValue(caseRecord.incidentCategory) },
    { label: "Complaint summary", value: formatValue(caseRecord.complaintSummary) },
    { label: "Stage started at", value: formatDateValue(caseRecord.stageStartedAt) },
    { label: "Days in current stage", value: formatValue(caseRecord.daysInCurrentStage, "0") },
    { label: "FIR status", value: formatValue(caseRecord.firStatus) },
    { label: "FIR number", value: formatValue(caseRecord.firNumber) },
    { label: "FIR date", value: formatDateValue(caseRecord.firDate) },
    { label: "Police station", value: formatValue(caseRecord.policeStation) },
    { label: "Investigating officer", value: formatValue(caseRecord.investigatingOfficerId) },
    { label: "District nodal officer", value: formatValue(caseRecord.districtNodalOfficerId) },
    { label: "Investigation status", value: formatValue(caseRecord.investigationStatus) },
    { label: "Chargesheet status", value: formatValue(caseRecord.chargesheetStatus) },
    { label: "Next hearing", value: formatDateValue(caseRecord.nextHearingDate) },
    { label: "Hearing count", value: formatValue(caseRecord.hearingCount, "0") },
    { label: "Adjournment count", value: formatValue(caseRecord.adjournmentCount, "0") },
    { label: "Accused arrest status", value: formatValue(caseRecord.accusedArrestStatus) },
    { label: "Previous threat reported", value: formatValue(caseRecord.previousThreatReported) },
    { label: "Last threat reported", value: formatDateValue(caseRecord.threatLastReported) },
    { label: "Financial relief eligible", value: formatValue(caseRecord.financialReliefEligible) },
    { label: "Financial relief status", value: formatValue(caseRecord.compensationStatus) },
    { label: "Approved amount", value: formatValue(caseRecord.compensationAmountApproved, "0") },
    { label: "Disbursed amount", value: formatValue(caseRecord.compensationAmountReceived, "0") },
    { label: "Last payment date", value: formatDateValue(caseRecord.lastPaymentDate) },
    { label: "Pending amount", value: formatValue(caseRecord.pendingAmount, "0") },
    { label: "Protection requested", value: formatValue(caseRecord.protectionRequested) },
    { label: "Protection status", value: formatValue(caseRecord.protectionStatus) },
    { label: "Relocation requested", value: formatValue(caseRecord.relocationRequested) },
    { label: "Relocation status", value: formatValue(caseRecord.relocationStatus) },
    { label: "Legal aid", value: formatValue(caseRecord.legalAidStatus) },
    { label: "Rehabilitation", value: formatValue(caseRecord.rehabilitationStatus) },
    { label: "Monitoring consent", value: formatValue(caseRecord.monitoringConsent) },
    { label: "Monitoring started", value: formatDateValue(caseRecord.monitoringStarted) },
    { label: "Baseline completed", value: formatValue(caseRecord.baselineCompleted) },
    { label: "Baseline distress score", value: formatValue(caseRecord.baselineDistressScore, "Not assessed") },
    { label: "Current distress score", value: formatValue(caseRecord.currentDistressScore, "Not assessed") },
    { label: "Predicted 7-day score", value: formatValue(caseRecord.predicted7dScore, "Not assessed") },
    { label: "Risk level", value: formatValue(caseRecord.riskLevel) },
    { label: "Assigned counsellor", value: caseRecord.assignedCounsellor?.name || formatValue(caseRecord.assignedCounsellorId) },
    { label: "Follow-up frequency", value: formatValue(caseRecord.followupFrequency) },
    { label: "Support", value: caseRecord.assignedCounsellor?.name ? `Assigned counsellor: ${caseRecord.assignedCounsellor.name}` : caseRecord.counsellorAssigned && caseRecord.counsellorAssigned !== "Not assigned" ? `Counsellor assigned: ${caseRecord.counsellorAssigned}` : "Not yet assigned" },
  ];

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
        {detailRows.map(({ label, value }) => (
          <Row key={label} label={label} value={value} />
        ))}
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
