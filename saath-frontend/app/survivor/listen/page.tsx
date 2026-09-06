"use client";

import Link from "next/link";
import { ArrowLeft, Headphones, Pause, Play, SkipBack, SkipForward } from "lucide-react";
import { useState } from "react";
import InterventionFeedback from "@/components/InterventionFeedback";

export default function ListenPage() {
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(34);

  return (
    <div className="px-5 pb-10 md:px-10 xl:px-14">
      <Link href="/survivor/feel-better" className="inline-flex items-center gap-2 text-sm font-semibold text-[#75857f]"><ArrowLeft size={16} /> Feel better</Link>

      <div className="mx-auto mt-8 max-w-3xl">
        <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#f9e9e3] text-[#b26b55]"><Headphones size={22} /></span>
        <p className="mt-6 text-xs font-bold uppercase tracking-[.2em] text-[#7e918b]">Listen</p>
        <h1 className="mt-3 font-display text-5xl text-[#172326]">A quiet sound to sit with.</h1>
        <p className="mt-4 text-lg text-[#63736e]">Choose a calm audio space. Mock audio for this demonstration.</p>

        <div className="mt-8 flex gap-2 overflow-x-auto pb-2">
          {["Calm", "Sleep", "Grounding", "Quiet Moments"].map((x, i) => (
            <button key={x} className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-bold ${i === 0 ? "bg-[#0f766e] text-white" : "bg-white text-[#63736e] ring-1 ring-[#c8d3d0]"}`}>
              {x}
            </button>
          ))}
        </div>

        <div className="mt-8 rounded-[30px] bg-[#0f766e] p-8 text-white md:p-12">
          <div className="mx-auto flex h-28 w-28 items-center justify-center rounded-full bg-white/12 text-[#f9ca64] shadow-[0_0_0_18px_rgba(255,255,255,.06)]"><Headphones size={38} /></div>
          <h2 className="mt-8 text-center font-display text-3xl">A softer evening</h2>
          <p className="mt-2 text-center text-sm text-white/65">Quiet Moments · 04:20</p>

          <div className="mt-8 h-1.5 rounded-full bg-white/20">
            <div className="h-1.5 rounded-full bg-[#f9ca64]" style={{ width: `${progress}%` }} />
          </div>

          <div className="mt-3 flex justify-between text-xs text-white/55"><span>01:28</span><span>04:20</span></div>

          <div className="mt-7 flex items-center justify-center gap-7">
            <SkipBack size={19} />
            <button onClick={() => setPlaying(!playing)} className="flex h-14 w-14 items-center justify-center rounded-full bg-white text-[#0f766e]">
              {playing ? <Pause size={22} /> : <Play size={22} />}
            </button>
            <SkipForward size={19} />
          </div>
        </div>

        <InterventionFeedback activity="listen" />
      </div>
    </div>
  );
}
