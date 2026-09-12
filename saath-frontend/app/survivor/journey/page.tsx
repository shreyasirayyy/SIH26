"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, Check } from "lucide-react";
import { aiService } from "@/services/ai";

import { useAppStore } from "@/store/useAppStore";

export default function JourneyPage() {
  const language = useAppStore((state) => state.language);
  const hindi = language === "Hindi";
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    aiService.getCheckInHistory().then((data: any) => {
      setHistory(data || []);
      setLoading(false);
    });
  }, []);

  // Convert distress → calm score (higher = better feeling, which is more intuitive for the user)
  const points = history.slice(-8).map((h: any) => {
    const distress = h.ml?.distressScore ?? 50;
    return Math.round(100 - distress); // calm score: higher = feeling better
  });
  console.log("History:", history);
  console.log("Calm points:", points);
  const latestDistress = history.length > 0 ? history[history.length - 1].ml?.distressScore : null;
  const moodLabel =
    latestDistress === null
      ? (hindi ? "जैसे-जैसे आप चेक-इन करेंगे, आपकी लय यहाँ दिखेगी" : "Your rhythm will appear here as you check in")
      : latestDistress < 30
      ? (hindi ? "शांत और स्थिर महसूस कर रहे हैं 🌿" : "Feeling calm and steady 🌿")
      : latestDistress < 55
      ? (hindi ? "कदम दर कदम, अपनी स्थिरता पा रहे हैं" : "Finding your ground, one day at a time")
      : (hindi ? "आप उपस्थित रहे — यह अपने आप में एक शक्ति है" : "You showed up — that takes strength");

  return (
    <div className="px-5 pb-10 md:px-10 xl:px-14">
      <Link href="/survivor/my-space" className="inline-flex items-center gap-2 text-sm font-semibold text-[#75857f]">
        <ArrowLeft size={16} /> {hindi ? "मेरी जगह" : "My space"}
      </Link>

      <div className="mt-6">
        <p className="text-xs font-bold uppercase tracking-[.2em] text-[#7e918b]">
          {hindi ? "मेरी यात्रा" : "My journey"}
        </p>
        <h1 className="mt-3 font-display text-5xl text-[#172326] md:text-6xl">
          {hindi ? "छोटे कदम भी मायने रखते हैं।" : "Small steps still count."}
        </h1>
        <p className="mt-4 max-w-2xl text-lg text-[#63736e]">
          {hindi
            ? "आपके चेक-इन और सहयोग का एक सौम्य नज़रिया — कोई स्कोरकार्ड नहीं।"
            : "A gentle view of your check-ins and the support around you — not a scorecard."}
        </p>
      </div>
      
      <div className="mt-10 grid gap-5 xl:grid-cols-[1.2fr_.8fr]">
        <div className="surface rounded-[28px] p-6 md:p-8">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[.18em] text-[#8a9b94]">
                {hindi ? "आपकी मानसिक लय" : "Your rhythm"}
              </p>
              <h2 className="mt-2 font-display text-2xl text-[#263c35]">{moodLabel}</h2>
            </div>
            <span className="rounded-full bg-[#e5f2ec] px-3 py-1 text-xs font-bold text-[#327d70]">
              {hindi ? `पिछले ${history.length} चेक-इन` : `Last ${history.length} check-ins`}
            </span>
          </div>
          
          <RhythmChart points={points} loading={loading} />
        </div>

        <div className="surface-soft rounded-[28px] p-6">
          <p className="text-xs font-bold uppercase tracking-[.18em] text-[#8a9b94]">
            {hindi ? "महत्वपूर्ण पड़ाव" : "Milestones"}
          </p>
          <div className="mt-5 space-y-5">
            { [
              {
                label: hindi ? "पहला चेक-इन पूरा हुआ" : "First check-in completed",
                done: history.length > 0,
                subDone: hindi ? "सराहनीय पल" : "A moment worth noticing",
                subPending: hindi ? "जारी रखें" : "Keep going"
              },
              {
                label: hindi ? "शांत व्यायाम आज़माया" : "Grounding activity tried",
                done: false,
                subDone: hindi ? "सराहनीय पल" : "A moment worth noticing",
                subPending: hindi ? "जारी रखें" : "Keep going"
              },
              {
                label: hindi ? "सहायता टीम से जुड़े" : "Support team connected",
                done: false,
                subDone: hindi ? "सराहनीय पल" : "A moment worth noticing",
                subPending: hindi ? "जारी रखें" : "Keep going"
              }
            ].map((item) => (
              <div className="flex gap-3" key={item.label}>
                <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${item.done ? "bg-[#dcebdd] text-[#3e8061]" : "bg-border-color text-text-secondary"}`}>
                  <Check size={15} />
                </span>
                <div>
                  <p className="text-sm font-semibold text-[#385048]">{item.label}</p>
                  <p className="mt-1 text-xs text-[#82908a]">{item.done ? item.subDone : item.subPending}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Rhythm Chart ────────────────────────────────────────────────────────────

function RhythmChart({ points, loading }: { points: number[]; loading: boolean }) {
  // Demo data: calm scores that gently improve over time (lower distress = higher calm)
  const DEMO = [38, 42, 35, 48, 52, 55, 58, 63];
  const isDemo = points.length === 0;
  const raw = isDemo ? DEMO : points;

  const W = 560;
  const H = 160;
  const PAD_X = 20;
  const PAD_Y = 16;

  const min = Math.min(...raw);
  const max = Math.max(...raw);
  const range = max - min || 1;

  // Map to SVG coords — lower distress = higher on chart (inverted)
  const coords = raw.map((v, i) => ({
    x: PAD_X + (i / (raw.length - 1)) * (W - PAD_X * 2),
    y: PAD_Y + ((v - min) / range) * (H - PAD_Y * 2),
    // Invert so "better" is higher
    yi: H - PAD_Y - ((v - min) / range) * (H - PAD_Y * 2),
  }));

  // Smooth cubic bezier path
  function smoothPath(pts: { x: number; yi: number }[]) {
    if (pts.length < 2) return "";
    let d = `M ${pts[0].x},${pts[0].yi}`;
    for (let i = 1; i < pts.length; i++) {
      const prev = pts[i - 1];
      const curr = pts[i];
      const cpx = (prev.x + curr.x) / 2;
      d += ` C ${cpx},${prev.yi} ${cpx},${curr.yi} ${curr.x},${curr.yi}`;
    }
    return d;
  }

  const linePath = smoothPath(coords);
  // Area fill: close path down to baseline
  const areaPath =
    linePath +
    ` L ${coords[coords.length - 1].x},${H - PAD_Y} L ${coords[0].x},${H - PAD_Y} Z`;

  const labels = isDemo
    ? ["", "", "", "", "", "", "", "Now"]
    : raw.map((_, i) => (i === raw.length - 1 ? "Now" : i === 0 ? "Earlier" : ""));

  return (
    <div className="mt-6 select-none">
      <svg
        viewBox={`0 0 ${W} ${H + 28}`}
        className="w-full overflow-visible"
        aria-label="Your wellbeing rhythm over recent check-ins"
      >
        <defs>
          <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#2fa6a0" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#2fa6a0" stopOpacity="0.02" />
          </linearGradient>
          <linearGradient id="lineGrad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#a8d7c0" />
            <stop offset="100%" stopColor="#0f766e" />
          </linearGradient>
        </defs>

        {/* Horizontal grid lines */}
        {[0.25, 0.5, 0.75].map((t) => (
          <line
            key={t}
            x1={PAD_X}
            y1={PAD_Y + t * (H - PAD_Y * 2)}
            x2={W - PAD_X}
            y2={PAD_Y + t * (H - PAD_Y * 2)}
            stroke="#dce5df"
            strokeWidth="1"
            strokeDasharray="4 4"
          />
        ))}

        {/* Area fill */}
        <path d={areaPath} fill="url(#chartGrad)" />

        {/* Line */}
        <path
          d={linePath}
          fill="none"
          stroke="url(#lineGrad)"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Dots + labels */}
        {coords.map((c, i) => (
          <g key={i}>
            <circle cx={c.x} cy={c.yi} r="5" fill="white" stroke="#0f766e" strokeWidth="2" />
            <circle cx={c.x} cy={c.yi} r="2.5" fill="#0f766e" />
            {labels[i] && (
              <text
                x={c.x}
                y={H + 18}
                textAnchor={i === 0 ? "start" : i === raw.length - 1 ? "end" : "middle"}
                fontSize="11"
                fill="#95a29d"
              >
                {labels[i]}
              </text>
            )}
          </g>
        ))}
      </svg>

      {isDemo && !loading && (
        <p className="mt-1 text-center text-xs text-[#aab6b0]">
          Complete a check-in to see your real rhythm here
        </p>
      )}
    </div>
  );
}