"use client";

// C08 — Recent interventions list
// The task board points this at GET /api/v1/check-ins/history, so "recent
// interventions" here means the survivor's last 5 check-ins (that's the
// endpoint that already exists — see services/ai/index.ts getCheckInHistory).
import { useEffect, useState } from "react";
import { aiService } from "@/services/ai";
import { formatDate } from "@/lib/utils";

interface CheckInRecord {
  id: string;
  type: string;
  createdAt: string;
  analyticalState?: string;
}

const TYPE_LABELS: Record<string, string> = {
  mood: "Mood check-in",
  quick_mood: "Quick check-in",
  text: "Text check-in",
  voice: "Voice check-in",
  ivrs: "IVRS check-in",
};

export function RecentInterventions() {
  const [items, setItems] = useState<CheckInRecord[] | null>(null);

  useEffect(() => {
    let active = true;
    aiService
      .getCheckInHistory()
      .then((history: any) => {
        if (!active) return;
        const list: CheckInRecord[] = Array.isArray(history) ? history : [];
        setItems(list.slice(-5).reverse());
      })
      .catch(() => {
        if (active) setItems([]);
      });
    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="surface rounded-[26px] p-6">
      <p className="text-xs font-bold uppercase tracking-[.18em] text-text-secondary">Recent check-ins</p>
      {items === null ? (
        <p className="mt-4 text-sm text-text-secondary">Loading…</p>
      ) : items.length === 0 ? (
        <p className="mt-4 text-sm text-text-secondary">No check-ins yet. Your recent activity will show up here.</p>
      ) : (
        <ul className="mt-4 space-y-3">
          {items.map((item) => (
            <li key={item.id} className="flex items-center justify-between border-b border-border-color pb-3 last:border-0 last:pb-0">
              <div>
                <p className="text-sm font-semibold text-text-primary">{TYPE_LABELS[item.type] ?? "Check-in"}</p>
                <p className="text-xs text-text-secondary">{formatDate(item.createdAt)}</p>
              </div>
              <span className="text-xs font-medium text-text-secondary">
                {item.analyticalState === "insufficient_evidence" ? "Recorded" : "Reviewed"}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}