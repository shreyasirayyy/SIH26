"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { caseService } from "@/services/case";
import { aiService } from "@/services/ai";
import { CaseRecord, AiOutput } from "@/types";

const PRIORITY_TONE: Record<string, "peach" | "amber" | "teal" | "sage"> = {
  P1: "peach",
  P2: "amber",
  P3: "teal",
  P4: "sage",
};

export default function CounsellorQueuePage() {
  const [rows, setRows] = useState<{ caseRecord: CaseRecord; latest: AiOutput | null }[]>([]);

  useEffect(() => {
    caseService.listAllCases().then(async (cases) => {
      const withAi = await Promise.all(
        cases.map(async (c) => ({ caseRecord: c, latest: await aiService.getLatestEstimate(c.victimToken) }))
      );
      withAi.sort((a, b) => {
        const order = { P1: 0, P2: 1, P3: 2, P4: 3 };
        return (order[a.latest?.priorityLevel ?? "P4"] ?? 3) - (order[b.latest?.priorityLevel ?? "P4"] ?? 3);
      });
      setRows(withAi);
    });
  }, []);

  return (
    <div>
      <h1 className="text-xl font-semibold">Priority Queue</h1>
      <p className="mt-1 text-sm text-text-secondary">Synthetic demonstration data — no real case records.</p>

      <div className="mt-6 grid gap-3">
        {rows.map(({ caseRecord, latest }) => (
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
                      <Badge tone={PRIORITY_TONE[latest.priorityLevel]}>{latest.priorityLevel}</Badge>
                      <p className="text-xs text-text-secondary">{latest.escalationEstimate}</p>
                    </>
                  )}
                </div>
              </div>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
