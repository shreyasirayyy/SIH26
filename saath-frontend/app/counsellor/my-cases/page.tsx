"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";
import { caseService } from "@/services/case";
import { aiService } from "@/services/ai";
import { CaseRecord, AiOutput } from "@/types";
import { formatRelativeTime } from "@/lib/utils";

const PRIORITY_TONE: Record<string, "peach" | "amber" | "teal" | "sage"> = {
  P1: "peach",
  P2: "amber",
  P3: "teal",
  P4: "sage",
};

// The backend now filters /api/v1/counsellor/cases to only the cases whose
// assignedCounsellorId matches the logged-in counsellor, so this genuinely
// shows just this counsellor's own patients, with search + stage filters.
export default function MyCasesPage() {
  const [rows, setRows] = useState<{ caseRecord: CaseRecord; latest: AiOutput | null }[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [stageFilter, setStageFilter] = useState<string>("All");

  useEffect(() => {
    caseService
      .listAllCases()
      .then(async (cases) => {
        const withAi = await Promise.all(
          cases.map(async (c) => ({ caseRecord: c, latest: await aiService.getLatestEstimate(c.victimToken) }))
        );
        setRows(withAi);
      })
      .catch(() => setRows([]))
      .finally(() => setLoading(false));
  }, []);

  const stages = useMemo(() => {
    const unique = new Set(rows.map((r) => r.caseRecord.currentStage));
    return ["All", ...Array.from(unique)];
  }, [rows]);

  const filtered = rows.filter(({ caseRecord }) => {
    const matchesQuery =
      !query ||
      caseRecord.survivorName.toLowerCase().includes(query.toLowerCase()) ||
      caseRecord.docket.toLowerCase().includes(query.toLowerCase()) ||
      caseRecord.district.toLowerCase().includes(query.toLowerCase());
    const matchesStage = stageFilter === "All" || caseRecord.currentStage === stageFilter;
    return matchesQuery && matchesStage;
  });

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold">My cases</h1>
        <p className="mt-1 text-sm text-text-secondary">Synthetic demonstration data — no real case records.</p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <Input
          placeholder="Search by name, docket, or district"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="sm:max-w-xs"
        />
        <div className="flex flex-wrap gap-2">
          {stages.map((stage) => (
            <button
              key={stage}
              onClick={() => setStageFilter(stage)}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
                stageFilter === stage
                  ? "bg-deep-teal text-white"
                  : "bg-pale-sage/40 text-text-secondary hover:bg-pale-sage/70"
              }`}
            >
              {stage}
            </button>
          ))}
        </div>
      </div>

      {loading && <p className="text-sm text-text-secondary">Loading cases...</p>}

      {!loading && filtered.length === 0 && (
        <div className="rounded-2xl border border-dashed border-border-color p-12 text-center text-sm text-text-secondary">
          No cases match this search or filter.
        </div>
      )}

      <div className="grid gap-3">
        {filtered.map(({ caseRecord, latest }) => (
          <Link key={caseRecord.victimToken} href={`/counsellor/cases/${caseRecord.victimToken}`}>
            <Card className="hover:border-deep-teal transition-colors">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-medium">{caseRecord.survivorName}</p>
                  <p className="text-xs text-text-secondary font-mono">{caseRecord.docket}</p>
                  <p className="mt-1 text-xs text-text-secondary">
                    {caseRecord.district}, {caseRecord.state} · {caseRecord.currentStage}
                  </p>
                </div>
                <div className="text-right shrink-0 space-y-1">
                  {latest && (
                    <>
                      {latest.insufficientEvidence ? (
                        <Badge tone="neutral">Insufficient evidence yet</Badge>
                      ) : (
                        <Badge tone={PRIORITY_TONE[latest.priorityLevel]}>{latest.priorityLevel}</Badge>
                      )}
                    </>
                  )}
                  <p className="text-[11px] text-text-secondary">
                    Active: <span className="font-medium text-text-primary">{formatRelativeTime(caseRecord.lastActive)}</span>
                  </p>
                </div>
              </div>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
