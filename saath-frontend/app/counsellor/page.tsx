"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Card, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { caseService } from "@/services/case";
import { aiService } from "@/services/ai";
import { useAppStore } from "@/store/useAppStore";
import { CaseRecord } from "@/types";

const RISK_TONE: Record<string, "peach" | "amber" | "teal" | "sage" | "neutral"> = {
  CRITICAL: "peach",
  HIGH: "amber",
  MODERATE: "teal",
  LOW: "sage",
};

function riskTone(level?: string) {
  return RISK_TONE[level ?? ""] ?? "neutral";
}

export default function CounsellorOverviewPage() {
  const counsellorProfile = useAppStore((s) => s.counsellorProfile);
  const [cases, setCases] = useState<CaseRecord[]>([]);
    const [voiceCheckIns, setVoiceCheckIns] = useState
    Array<{
      id: string;
      victimToken?: string;
      survivorName?: string;
      docket?: string;
      createdAt: string;
      transcript?: string;
      channel?: string;
      requestCounsellorCall?: boolean;
    }>
  >([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    aiService.getCounsellorVoiceCheckIns().then(setVoiceCheckIns).catch(() => setVoiceCheckIns([]));
    caseService
      .getMyCases()
      .then(setCases)
      .catch(() => setCases([]))
      .finally(() => setLoading(false));
  }, []);

  const stats = useMemo(() => {
    const total = cases.length;
    const byRisk = { CRITICAL: 0, HIGH: 0, MODERATE: 0, LOW: 0 } as Record<string, number>;
    let distressSum = 0;
    let distressCount = 0;
    for (const c of cases) {
      if (c.riskLevel && byRisk[c.riskLevel] !== undefined) byRisk[c.riskLevel] += 1;
      if (typeof c.currentDistressScore === "number") {
        distressSum += c.currentDistressScore;
        distressCount += 1;
      }
    }
    const avgDistress = distressCount ? Math.round(distressSum / distressCount) : null;
    return { total, byRisk, avgDistress };
  }, [cases]);

  const sortedCases = useMemo(() => {
    const order: Record<string, number> = { CRITICAL: 0, HIGH: 1, MODERATE: 2, LOW: 3 };
    return [...cases].sort((a, b) => (order[a.riskLevel ?? ""] ?? 4) - (order[b.riskLevel ?? ""] ?? 4));
  }, [cases]);

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Overview</h1>
        {counsellorProfile ? (
          <p className="mt-1 text-sm text-text-secondary">
            {counsellorProfile.name}
            {counsellorProfile.specialisation ? ` · ${counsellorProfile.specialisation}` : ""}
            {counsellorProfile.state ? ` · ${counsellorProfile.state}` : ""}
          </p>
        ) : (
          <p className="mt-1 text-sm text-text-secondary">Your assigned patients, at a glance.</p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Card>
          <CardTitle>Assigned patients</CardTitle>
          <p className="mt-2 text-2xl font-semibold">{stats.total}</p>
        </Card>
        <Card>
          <CardTitle>Critical / High risk</CardTitle>
          <p className="mt-2 text-2xl font-semibold text-[#a2542f]">
            {stats.byRisk.CRITICAL + stats.byRisk.HIGH}
          </p>
        </Card>
        <Card>
          <CardTitle>Moderate risk</CardTitle>
          <p className="mt-2 text-2xl font-semibold">{stats.byRisk.MODERATE}</p>
        </Card>
        <Card>
          <CardTitle>Avg. distress score</CardTitle>
          <p className="mt-2 text-2xl font-semibold">{stats.avgDistress ?? "—"}</p>
        </Card>
      </div>

            {voiceCheckIns.length > 0 && (
        <section className="rounded-2xl border border-border-color bg-pale-sage/40 p-4">
          <p className="text-sm font-semibold text-deep-teal">Voice check-ins awaiting review</p>
          <div className="mt-3 space-y-2">
            {voiceCheckIns.map((item) => (
              <Link
                key={item.id}
                href={item.victimToken ? `/counsellor/cases/${item.victimToken}` : "#"}
                className="block rounded-xl bg-white p-3 text-sm hover:border-deep-teal border border-transparent transition-colors"
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="font-semibold text-text-primary">
                    {item.survivorName ?? "Unknown survivor"}
                    {item.docket ? <span className="ml-2 font-mono text-xs text-text-secondary">{item.docket}</span> : null}
                  </p>
                  {item.requestCounsellorCall && (
                    <span className="shrink-0 rounded-full bg-[#a2542f]/10 px-2 py-0.5 text-xs font-medium text-[#a2542f]">
                      Call requested
                    </span>
                  )}
                </div>
                <p className="mt-1 text-xs text-text-secondary">
                  {new Date(item.createdAt).toLocaleString()}
                  {item.channel ? ` · ${item.channel === "ivrs" ? "Phone (IVRS)" : "Voice"}` : ""}
                </p>
                <p className="mt-1">{item.transcript ?? "Transcript unavailable"}</p>
              </Link>
            ))}
          </div>
        </section>
      )}
      <div>
        <h2 className="text-sm font-semibold text-text-secondary uppercase tracking-wide">Your patients</h2>

        {loading && <p className="mt-3 text-sm text-text-secondary">Loading your patients...</p>}

        {!loading && sortedCases.length === 0 && (
          <div className="mt-3 rounded-2xl border border-dashed border-border-color p-12 text-center text-sm text-text-secondary">
            No patients are currently assigned to you.
          </div>
        )}

        <div className="mt-3 grid gap-3">
          {sortedCases.map((caseRecord) => (
            <Link key={caseRecord.victimToken} href={`/counsellor/cases/${caseRecord.victimToken}`}>
              <Card className="hover:border-deep-teal transition-colors">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-medium">{caseRecord.survivorName}</p>
                    <p className="text-xs text-text-secondary font-mono">{caseRecord.docket}</p>
                    <p className="mt-1 text-xs text-text-secondary">
                      {caseRecord.district}, {caseRecord.state} · {caseRecord.currentStage}
                    </p>
                    {caseRecord.followupFrequency && (
                      <p className="mt-1 text-xs text-text-secondary">
                        Follow-up: {caseRecord.followupFrequency.replace(/_/g, " ")}
                      </p>
                    )}
                  </div>
                  <div className="text-right shrink-0 space-y-1">
                    {caseRecord.riskLevel && <Badge tone={riskTone(caseRecord.riskLevel)}>{caseRecord.riskLevel}</Badge>}
                    {typeof caseRecord.currentDistressScore === "number" && (
                      <p className="text-xs text-text-secondary">Distress: {caseRecord.currentDistressScore}</p>
                    )}
                  </div>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
