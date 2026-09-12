"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Card, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { caseService } from "@/services/case";
import { aiService } from "@/services/ai";
import { useAppStore } from "@/store/useAppStore";
import { CaseRecord } from "@/types";
import { ArrowRight, Bell, ClipboardList, Mic, UsersRound } from "lucide-react";

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
  const followUps = useAppStore((s) => s.followUps);
  const [cases, setCases] = useState<CaseRecord[]>([]);
  const [voiceCheckIns, setVoiceCheckIns] = useState<
    Array<{
      id: string;
      victimToken?: string;
      survivorName?: string;
      docket?: string;
      createdAt: string;
      transcript?: string;
      channel?: string;
      requestCounsellorCall?: boolean;
      signals?: {
        sleep?: number;
        socialConnectedness?: number;
        mood?: number;
        fear?: number;
        perceivedSafety?: number;
        distressScore?: number;
        summary?: string;
      };
    }>
  >([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    aiService.getCounsellorVoiceCheckIns().then(setVoiceCheckIns).catch(() => setVoiceCheckIns([]));
    caseService.getMyCases().then(setCases).catch(() => setCases([])).finally(() => setLoading(false));
  }, []);

  const stats = useMemo(() => {
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
    return {
      total: cases.length,
      criticalHigh: byRisk.CRITICAL + byRisk.HIGH,
      moderate: byRisk.MODERATE,
      avgDistress: distressCount ? Math.round(distressSum / distressCount) : null,
    };
  }, [cases]);

  const priorityCases = useMemo(() => {
    const order: Record<string, number> = { CRITICAL: 0, HIGH: 1, MODERATE: 2, LOW: 3 };
    return [...cases]
      .filter((c) => c.riskLevel === "CRITICAL" || c.riskLevel === "HIGH")
      .sort((a, b) => (order[a.riskLevel ?? ""] ?? 4) - (order[b.riskLevel ?? ""] ?? 4))
      .slice(0, 3);
  }, [cases]);

  const upcomingFollowUps = useMemo(
    () => followUps.filter((f) => f.status === "SCHEDULED").sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()).slice(0, 3),
    [followUps]
  );

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
          <p className="mt-1 text-sm text-text-secondary">Your day, at a glance.</p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Card><CardTitle>Assigned patients</CardTitle><p className="mt-2 text-2xl font-semibold">{stats.total}</p></Card>
        <Card><CardTitle>Critical / High risk</CardTitle><p className="mt-2 text-2xl font-semibold text-[#a2542f]">{stats.criticalHigh}</p></Card>
        <Card><CardTitle>Moderate risk</CardTitle><p className="mt-2 text-2xl font-semibold">{stats.moderate}</p></Card>
        <Card><CardTitle>Avg. distress score</CardTitle><p className="mt-2 text-2xl font-semibold">{stats.avgDistress ?? "—"}</p></Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <div className="flex items-center justify-between">
            <CardTitle>Priority attention</CardTitle>
            <Link href="/counsellor/my-cases" className="inline-flex items-center gap-1 text-xs font-semibold text-deep-teal">
              View all cases <ArrowRight size={13} />
            </Link>
          </div>
          {loading && <p className="mt-3 text-sm text-text-secondary">Loading...</p>}
          {!loading && priorityCases.length === 0 && (
            <p className="mt-3 text-sm text-text-secondary">No critical or high-risk cases right now.</p>
          )}
          <div className="mt-3 space-y-2">
            {priorityCases.map((c) => (
              <Link key={c.victimToken} href={`/counsellor/cases/${c.victimToken}`} className="flex items-center justify-between rounded-xl bg-greenish-cream p-3 text-sm hover:bg-pale-sage/40">
                <div>
                  <p className="font-medium">{c.survivorName}</p>
                  <p className="text-xs text-text-secondary font-mono">{c.docket}</p>
                </div>
                {c.riskLevel && <Badge tone={riskTone(c.riskLevel)}>{c.riskLevel}</Badge>}
              </Link>
            ))}
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between">
            <CardTitle>Upcoming follow-ups</CardTitle>
            <Link href="/counsellor/follow-ups" className="inline-flex items-center gap-1 text-xs font-semibold text-deep-teal">
              View all <ArrowRight size={13} />
            </Link>
          </div>
          {upcomingFollowUps.length === 0 && <p className="mt-3 text-sm text-text-secondary">No follow-ups scheduled.</p>}
          <div className="mt-3 space-y-2">
            {upcomingFollowUps.map((f) => (
              <div key={f.id} className="rounded-xl bg-greenish-cream p-3 text-sm">
                <div className="flex items-center justify-between">
                  <p className="font-medium">{f.survivorName}</p>
                  <span className="text-xs text-text-secondary">{new Date(f.date).toLocaleDateString()}</span>
                </div>
                <p className="text-xs text-text-secondary font-mono">{f.docket}</p>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {voiceCheckIns.length > 0 && (
        <section className="rounded-2xl border border-border-color bg-pale-sage/40 p-4">
          <p className="flex items-center gap-2 text-sm font-semibold text-deep-teal">
            <Mic size={15} /> Voice check-ins awaiting review
          </p>
          <div className="mt-3 space-y-2">
            {voiceCheckIns.slice(0, 5).map((item) => (
              <Link
                key={item.id}
                href={item.victimToken ? `/counsellor/cases/${item.victimToken}` : "#"}
                className="block rounded-xl bg-white p-3.5 text-sm hover:border-deep-teal border border-transparent transition-colors shadow-sm"
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="font-semibold text-text-primary">
                    {item.survivorName ?? "Unknown survivor"}
                    {item.docket ? (
                      <span className="ml-2 font-mono text-xs text-text-secondary">{item.docket}</span>
                    ) : null}
                  </p>
                  {item.requestCounsellorCall && (
                    <span className="shrink-0 rounded-full bg-[#a2542f]/10 px-2.5 py-0.5 text-xs font-semibold text-[#a2542f]">
                      Call requested
                    </span>
                  )}
                </div>
                <p className="mt-1 text-xs text-text-secondary">
                  {new Date(item.createdAt).toLocaleString()}
                  {item.channel ? ` · ${item.channel === "ivrs" ? "Phone (IVRS)" : "Voice check-in"}` : " · Voice check-in"}
                </p>
                <p className="mt-1.5 text-sm text-text-primary italic">
                  &ldquo;{item.transcript ?? "Transcript unavailable"}&rdquo;
                </p>
                {item.signals && (
                  <div className="mt-2.5 flex flex-wrap gap-1.5 text-[11px]">
                    {typeof item.signals.sleep === "number" && (
                      <span className="rounded-md bg-pale-sage px-2 py-0.5 font-medium text-deep-teal">
                        Sleep difficulty: {item.signals.sleep}/5
                      </span>
                    )}
                    {typeof item.signals.socialConnectedness === "number" && (
                      <span className="rounded-md bg-greenish-cream px-2 py-0.5 font-medium text-text-secondary">
                        Engagement: {item.signals.socialConnectedness}/5
                      </span>
                    )}
                    {typeof item.signals.distressScore === "number" && (
                      <span className="rounded-md bg-amber/15 px-2 py-0.5 font-medium text-[#a2542f]">
                        Distress: {item.signals.distressScore}
                      </span>
                    )}
                  </div>
                )}
              </Link>
            ))}
          </div>
        </section>
      )}

      <div className="grid grid-cols-3 gap-3">
        <Link href="/counsellor/my-cases" className="flex items-center gap-2 rounded-xl border border-border-color p-3 text-sm font-medium hover:border-deep-teal"><UsersRound size={16} /> My cases</Link>
        <Link href="/counsellor/alerts" className="flex items-center gap-2 rounded-xl border border-border-color p-3 text-sm font-medium hover:border-deep-teal"><Bell size={16} /> Alerts</Link>
        <Link href="/counsellor/follow-ups" className="flex items-center gap-2 rounded-xl border border-border-color p-3 text-sm font-medium hover:border-deep-teal"><ClipboardList size={16} /> Follow-ups</Link>
      </div>
    </div>
  );
}
