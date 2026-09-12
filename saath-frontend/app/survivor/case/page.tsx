"use client";

import { useEffect, useState } from "react";
import {
  ShieldAlert,
  Scale,
  Gavel,
  HandCoins,
  HeartHandshake,
  Activity,
  ClipboardList,
  ChevronDown,
  Copy,
  Check,
} from "lucide-react";
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

  const groups: { title: string; icon: typeof ShieldAlert; rows: { label: string; value: string }[] }[] = [
    {
      title: "Overview",
      icon: ClipboardList,
      rows: [
        { label: "Case category", value: formatValue(caseRecord.caseCategory) },
        { label: "Incident category", value: formatValue(caseRecord.incidentCategory) },
        { label: "Complainant type", value: formatValue(caseRecord.complainantType) },
        { label: "Age group", value: formatValue(caseRecord.ageGroup) },
        { label: "Gender", value: formatValue(caseRecord.gender) },
        { label: "Location", value: formatLocation(caseRecord.city, caseRecord.district, caseRecord.state) },
        { label: "Incident date", value: formatDateValue(caseRecord.incidentDate) },
        { label: "Registration date", value: formatDateValue(caseRecord.registrationDate) },
        { label: "Registration channel", value: formatValue(caseRecord.registrationChannel) },
        { label: "Preferred contact channel", value: formatValue(caseRecord.preferredContactChannel) },
        { label: "Preferred language", value: formatValue(caseRecord.preferredLanguage) },
        { label: "Registered mobile", value: formatValue(caseRecord.registeredPhone) },
        { label: "Complaint summary", value: formatValue(caseRecord.complaintSummary) },
      ],
    },
    {
      title: "Investigation",
      icon: ShieldAlert,
      rows: [
        { label: "FIR status", value: formatValue(caseRecord.firStatus) },
        { label: "FIR number", value: formatValue(caseRecord.firNumber) },
        { label: "FIR date", value: formatDateValue(caseRecord.firDate) },
        { label: "Police station", value: formatValue(caseRecord.policeStation) },
        { label: "Investigating officer", value: formatValue(caseRecord.investigatingOfficerId) },
        { label: "District nodal officer", value: formatValue(caseRecord.districtNodalOfficerId) },
        { label: "Investigation status", value: formatValue(caseRecord.investigationStatus) },
        { label: "Chargesheet status", value: formatValue(caseRecord.chargesheetStatus) },
        { label: "Stage started", value: formatDateValue(caseRecord.stageStartedAt) },
        { label: "Days in current stage", value: formatValue(caseRecord.daysInCurrentStage, "0") },
      ],
    },
    {
      title: "Court & Trial",
      icon: Gavel,
      rows: [
        { label: "Next hearing", value: formatDateValue(caseRecord.nextHearingDate) },
        { label: "Hearing count", value: formatValue(caseRecord.hearingCount, "0") },
        { label: "Adjournment count", value: formatValue(caseRecord.adjournmentCount, "0") },
        { label: "Accused arrest status", value: formatValue(caseRecord.accusedArrestStatus) },
      ],
    },
    {
      title: "Safety & Protection",
      icon: Scale,
      rows: [
        { label: "Previous threat reported", value: formatValue(caseRecord.previousThreatReported) },
        { label: "Last threat reported", value: formatDateValue(caseRecord.threatLastReported) },
        { label: "Protection requested", value: formatValue(caseRecord.protectionRequested) },
        { label: "Protection status", value: formatValue(caseRecord.protectionStatus) },
        { label: "Relocation requested", value: formatValue(caseRecord.relocationRequested) },
        { label: "Relocation status", value: formatValue(caseRecord.relocationStatus) },
      ],
    },
    {
      title: "Compensation & Relief",
      icon: HandCoins,
      rows: [
        { label: "Financial relief eligible", value: formatValue(caseRecord.financialReliefEligible) },
        { label: "Financial relief status", value: formatValue(caseRecord.compensationStatus) },
        { label: "Approved amount", value: formatValue(caseRecord.compensationAmountApproved, "0") },
        { label: "Disbursed amount", value: formatValue(caseRecord.compensationAmountReceived, "0") },
        { label: "Pending amount", value: formatValue(caseRecord.pendingAmount, "0") },
        { label: "Last payment date", value: formatDateValue(caseRecord.lastPaymentDate) },
      ],
    },
    {
      title: "Support & Rehabilitation",
      icon: HeartHandshake,
      rows: [
        {
          label: "Assigned counsellor",
          value:
            caseRecord.assignedCounsellor?.name ||
            (caseRecord.counsellorAssigned && caseRecord.counsellorAssigned !== "Not assigned"
              ? caseRecord.counsellorAssigned
              : formatValue(caseRecord.assignedCounsellorId)),
        },
        { label: "Follow-up frequency", value: formatValue(caseRecord.followupFrequency) },
        { label: "Legal aid", value: formatValue(caseRecord.legalAidStatus) },
        { label: "Rehabilitation", value: formatValue(caseRecord.rehabilitationStatus) },
      ],
    },
    {
      title: "Well-being Monitoring",
      icon: Activity,
      rows: [
        { label: "Monitoring consent", value: formatValue(caseRecord.monitoringConsent) },
        { label: "Monitoring started", value: formatDateValue(caseRecord.monitoringStarted) },
        { label: "Baseline completed", value: formatValue(caseRecord.baselineCompleted) },
        { label: "Baseline distress score", value: formatValue(caseRecord.baselineDistressScore, "Not assessed") },
        { label: "Current distress score", value: formatValue(caseRecord.currentDistressScore, "Not assessed") },
        { label: "Predicted 7-day score", value: formatValue(caseRecord.predicted7dScore, "Not assessed") },
        { label: "Risk level", value: formatValue(caseRecord.riskLevel) },
      ],
    },
  ];

  return (
    <div className="px-5 pb-10 md:px-10 xl:px-14 space-y-6">
      <CaseHeader caseRecord={caseRecord} />

      <Card className="!p-6">
        <CardTitle>Case Timeline</CardTitle>
        <div className="mt-6 flex items-start overflow-x-auto pb-2">
          {STAGES.map((stage, i) => (
            <div key={stage.id} className={`flex ${i < STAGES.length - 1 ? "flex-1 min-w-[110px]" : ""}`}>
              <div className="flex flex-col items-center text-center w-24 shrink-0">
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold ${
                    i < stageIndex
                      ? "bg-deep-teal text-white"
                      : i === stageIndex
                      ? "bg-amber text-white ring-4 ring-amber/20"
                      : "bg-pale-sage/60 text-text-secondary"
                  }`}
                >
                  {i < stageIndex ? <Check size={15} /> : i + 1}
                </div>
                <p className={`mt-2 text-xs leading-tight ${i === stageIndex ? "font-semibold text-text-primary" : "text-text-secondary"}`}>
                  {stage.label}
                </p>
                {i === stageIndex && (
                  <p className="mt-1 text-[11px] text-amber font-medium">Current</p>
                )}
              </div>
              {i < STAGES.length - 1 && (
                <div className={`mt-4 h-px flex-1 min-w-[24px] ${i < stageIndex ? "bg-deep-teal" : "bg-border-color"}`} />
              )}
            </div>
          ))}
        </div>
        {(caseRecord.investigationStatus || caseRecord.rehabilitationStatus) && (
          <p className="mt-4 rounded-xl bg-pale-sage/40 px-4 py-2.5 text-sm text-text-secondary">
            {caseRecord.investigationStatus || caseRecord.rehabilitationStatus}
          </p>
        )}
      </Card>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {groups.map((group) => (
          <DetailSection key={group.title} title={group.title} icon={group.icon} rows={group.rows} />
        ))}
      </div>

      {timeline.length > 0 && (
        <Card>
          <CardTitle>Case, Support & Well-being Events</CardTitle>
          <div className="mt-4 space-y-3">
            {timeline.map((e, i) => (
              <div key={i} className="flex items-center gap-3 text-sm">
                <span className="w-20 shrink-0 text-text-secondary">{formatDate(e.date)}</span>
                <Badge tone={e.type === "case" ? "teal" : e.type === "support" ? "sage" : "amber"} className="shrink-0">
                  {e.type}
                </Badge>
                <span className="text-text-primary">{e.label}</span>
              </div>
            ))}
          </div>
        </Card>
      )}

      <Card>
        <CardTitle>Monitoring</CardTitle>
        <p className="mt-2 text-sm text-text-secondary">
          Current status: <span className="font-medium text-text-primary capitalize">{monitoring}</span>
        </p>
        <p className="mt-2 text-xs text-text-secondary">
          No pressure. You remain in control. Support stays available even if you pause or stop.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
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

function CaseHeader({ caseRecord }: { caseRecord: CaseRecord }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(caseRecord.docket);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard access can fail silently; the docket is still visible on screen.
    }
  };

  const riskTone =
    caseRecord.riskLevel?.toLowerCase() === "high"
      ? "peach"
      : caseRecord.riskLevel?.toLowerCase() === "medium"
      ? "amber"
      : "sage";

  return (
    <div className="saath-fade">
      <p className="text-xs font-bold uppercase tracking-[.2em] text-[#7e918b]">My space</p>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-4">
        <h1 className="font-display text-4xl leading-none text-[#172326] md:text-5xl">My Case</h1>
        <button
          type="button"
          onClick={handleCopy}
          className="flex items-center gap-2 rounded-full border border-border-color bg-white/80 px-3.5 py-2 font-mono text-sm text-text-secondary hover:border-deep-teal hover:text-deep-teal"
          title="Copy case number"
        >
          {caseRecord.docket}
          {copied ? <Check size={14} className="text-deep-teal" /> : <Copy size={14} />}
        </button>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        {caseRecord.caseCategory && <Badge tone="teal">{caseRecord.caseCategory}</Badge>}
        {caseRecord.investigationStatus && <Badge tone="neutral">{caseRecord.investigationStatus}</Badge>}
        {caseRecord.riskLevel && <Badge tone={riskTone}>Risk: {caseRecord.riskLevel}</Badge>}
      </div>
    </div>
  );
}

function DetailSection({
  title,
  icon: Icon,
  rows,
}: {
  title: string;
  icon: typeof ShieldAlert;
  rows: { label: string; value: string }[];
}) {
  const [open, setOpen] = useState(true);
  return (
    <Card className="!p-0 overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left"
      >
        <span className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-pale-sage/60 text-deep-teal">
            <Icon size={16} />
          </span>
          <CardTitle className="!mb-0">{title}</CardTitle>
        </span>
        <ChevronDown size={16} className={`text-text-secondary transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="border-t border-border-color px-5 pb-2">
          {rows.map(({ label, value }) => (
            <Row key={label} label={label} value={value} />
          ))}
        </div>
      )}
    </Card>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 py-2.5 border-b border-border-color/70 last:border-0">
      <span className="text-sm text-text-secondary">{label}</span>
      <span className="text-sm font-medium text-text-primary text-right">{value}</span>
    </div>
  );
}