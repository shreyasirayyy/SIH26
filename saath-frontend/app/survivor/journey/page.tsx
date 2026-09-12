"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, Check } from "lucide-react";
import { aiService } from "@/services/ai";

export default function JourneyPage() {
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    aiService.getCheckInHistory().then((data: any) => {
      setHistory(data || []);
      setLoading(false);
    });
  }, []);

  const points = history.slice(-8).map((h: any) => {
    const score = h.ml?.distressScore ?? 50;
    return score;
  });
  console.log("History:", history);
  console.log("Points:", points);
  const latestMood = history.length > 0 ? history[history.length - 1].ml?.distressScore : null;
  const moodLabel = latestMood === null ? "Your rhythm will appear here as you check in" : latestMood > 70 ? "A harder stretch right now" : latestMood > 40 ? "Taking it day by day" : "Feeling a little steadier";

  return (
    <div className="px-5 pb-10 md:px-10 xl:px-14">
      <Link href="/survivor/my-space" className="inline-flex items-center gap-2 text-sm font-semibold text-[#75857f]">
        <ArrowLeft size={16} /> My space
      </Link>

      <div className="mt-6">
        <p className="text-xs font-bold uppercase tracking-[.2em] text-[#7e918b]">My journey</p>
        <h1 className="mt-3 font-display text-5xl text-[#172326] md:text-6xl">Small steps still count.</h1>
        <p className="mt-4 max-w-2xl text-lg text-[#63736e]">A gentle view of your check-ins and the support around you — not a scorecard.</p>
      </div>
      
      <div className="mt-10 grid gap-5 xl:grid-cols-[1.2fr_.8fr]">
        <div className="surface rounded-[28px] p-6 md:p-8">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[.18em] text-[#8a9b94]">Your rhythm</p>
              <h2 className="mt-2 font-display text-2xl text-[#263c35]">{moodLabel}</h2>
            </div>
            <span className="rounded-full bg-[#e5f2ec] px-3 py-1 text-xs font-bold text-[#327d70]">Last {history.length} check-ins</span>
          </div>
          
          {history.length === 0 ? (
            <div className="mt-10 h-48 flex items-center justify-center text-text-secondary">Your rhythm will appear here as you check in</div>
          ) : (
            <>
              <div className="mt-10 flex h-48 items-end gap-2 border-b border-[#dce5df] px-2">
                {points.map((p, i) => (
                  <div key={i} className="group flex flex-1 flex-col items-center gap-2">
                    <div className="w-full rounded-t-full bg-linear-to-t from-[#2fa6a0] to-[#a8d7c0] transition-all group-hover:from-[#0f766e]" style={{ height: `${p}%` }} />
                    <span className="text-[10px] text-[#95a29d]">{i + 1}</span>
                  </div>
                ))}
              </div>
              <div className="mt-4 flex justify-between text-xs text-[#82908a]"><span>Earlier</span><span>Now</span></div>
            </>
          )}
        </div>

        <div className="surface-soft rounded-[28px] p-6">
          <p className="text-xs font-bold uppercase tracking-[.18em] text-[#8a9b94]">Milestones</p>
          <div className="mt-5 space-y-5">
            { [
              { label: "First check-in completed", done: history.length > 0 },
              { label: "Grounding activity tried", done: false },
              { label: "Support team connected", done: false }
            ].map((item) => (
              <div className="flex gap-3" key={item.label}>
                <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${item.done ? "bg-[#dcebdd] text-[#3e8061]" : "bg-border-color text-text-secondary"}`}>
                  <Check size={15} />
                </span>
                <div>
                  <p className="text-sm font-semibold text-[#385048]">{item.label}</p>
                  <p className="mt-1 text-xs text-[#82908a]">{item.done ? "A moment worth noticing" : "Keep going"}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}