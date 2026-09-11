"use client";

// C05 — Distress trend widget / C06 — Recovery trend widget
// One reusable component powers both rows on the task board: they're the
// same chart shape, just pointed at a different score. Data comes from
// GET /api/v1/monitoring/trends.
import { useEffect, useState } from "react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { aiService } from "@/services/ai";

type Metric = "distress" | "recovery";

interface TrendPoint {
  date: string;
  score: number;
}

const METRIC_CONFIG: Record<Metric, { label: string; color: string; scoreKey: "distressScore" | "recoveryScore" }> = {
  distress: { label: "Distress trend", color: "#E89A78", scoreKey: "distressScore" },
  recovery: { label: "Recovery trend", color: "#0F766E", scoreKey: "recoveryScore" },
};

export function TrendWidget({ metric }: { metric: Metric }) {
  const config = METRIC_CONFIG[metric];
  const [points, setPoints] = useState<TrendPoint[] | null>(null);

  useEffect(() => {
    let active = true;
    aiService
      .getMonitoring("trends")
      .then((data: any) => {
        if (!active) return;
        const trendKey = metric === "distress" ? "distressTrend" : "recoveryTrend";
        const fromTrend = Array.isArray(data?.[trendKey]) ? data[trendKey] : [];
        // NOTE: the backend's /monitoring/trends currently returns
        // distressTrend/recoveryTrend as empty arrays (it's a stub — see
        // saath-backend/src/app.ts). Until that's filled in, fall back to
        // the recentObservations it already sends, so the widget still
        // shows real data instead of staying empty forever.
        const source = fromTrend.length
          ? fromTrend
          : (data?.recentObservations ?? []).map((o: any) => ({
              createdAt: o.createdAt,
              score: o.ml?.[config.scoreKey],
            }));
        const mapped: TrendPoint[] = source
          .filter((p: any) => typeof p.score === "number")
          .map((p: any) => ({
            date: new Date(p.createdAt ?? p.date).toLocaleDateString("en-IN", { day: "2-digit", month: "short" }),
            score: p.score,
          }));
        setPoints(mapped);
      })
      .catch(() => {
        if (active) setPoints([]);
      });
    return () => {
      active = false;
    };
  }, [metric, config.scoreKey]);

  return (
    <div className="surface rounded-[26px] p-6">
      <p className="text-xs font-bold uppercase tracking-[.18em] text-text-secondary">{config.label}</p>
      {points === null ? (
        <p className="mt-4 text-sm text-text-secondary">Loading…</p>
      ) : points.length < 2 ? (
        <p className="mt-4 text-sm text-text-secondary">Not enough check-ins yet to show a trend. This fills in after a couple more check-ins.</p>
      ) : (
        <div className="mt-4 h-40">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={points}>
              <CartesianGrid strokeDasharray="3 3" stroke="#C8D3D0" />
              <XAxis dataKey="date" fontSize={11} stroke="#46565A" />
              <YAxis fontSize={11} stroke="#46565A" domain={[0, 100]} width={28} />
              <Tooltip />
              <Line type="monotone" dataKey="score" stroke={config.color} strokeWidth={2} dot={false} name={config.label} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}