"use client";

import Link from "next/link";
import { ArrowLeft, Wind, Volume2, VolumeX } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import InterventionFeedback from "@/components/InterventionFeedback";
import { useAppStore } from "@/store/useAppStore";

const PHASES = [
  { label: "Inhale", duration: 4000 },
  { label: "Hold", duration: 4000 },
  { label: "Exhale", duration: 6000 },
];

export default function BreathePage() {
  const [phaseIndex, setPhaseIndex] = useState(-1);
  const [isRunning, setIsRunning] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const language = useAppStore((state) => state.language);

  useEffect(() => {
    if (isRunning && !isMuted) {
      const phase = phaseIndex === -1 ? PHASES[0] : PHASES[phaseIndex];
      const utterance = new SpeechSynthesisUtterance(phase.label);
      utterance.lang = language === "Hindi" ? "hi-IN" : "en-US";
      utterance.rate = 0.8;
      window.speechSynthesis.speak(utterance);
    }
  }, [phaseIndex, isRunning, isMuted, language]);

  useEffect(() => {
    if (isRunning) {
      const nextPhase = () => {
        setPhaseIndex((prev) => (prev + 1) % PHASES.length);
      };
      timerRef.current = setTimeout(nextPhase, phaseIndex === -1 ? 0 : PHASES[phaseIndex].duration);
    } else if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [isRunning, phaseIndex]);

  const currentPhase = phaseIndex === -1 ? { label: "Ready" } : PHASES[phaseIndex];

  return (
    <div className="px-5 pb-10 md:px-10 xl:px-14">
      <Link href="/survivor/feel-better" className="inline-flex items-center gap-2 text-sm font-semibold text-[#75857f]">
        <ArrowLeft size={16} /> Feel better
      </Link>

      <div className="mx-auto mt-10 max-w-2xl text-center">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#e5f2ec] text-[#327d70]"><Wind size={24} /></span>
        <p className="mt-6 text-xs font-bold uppercase tracking-[.2em] text-[#7e918b]">A gentle breathing space</p>
        <h1 className="mt-3 font-display text-5xl text-[#172326]">Follow your breath.</h1>
        <p className="mt-4 text-lg text-[#63736e]">Inhale, hold, exhale. There is no need to force it.</p>

        <div className="mx-auto mt-12 flex h-56 w-56 items-center justify-center rounded-full bg-[#dcebdd] shadow-[0_0_0_25px_rgba(220,235,221,.45)]">
          <div className="flex h-40 w-40 items-center justify-center rounded-full bg-[#bfe3d6] font-display text-2xl text-[#2e7468] transition-all">{currentPhase.label}</div>
        </div>

        <div className="mt-12 flex items-center justify-center gap-4">
          <button
            onClick={() => setIsRunning(!isRunning)}
            className="rounded-full bg-[#0f766e] px-7 py-3 text-sm font-bold text-white"
          >
            {isRunning ? "Pause" : phaseIndex === -1 ? "Begin" : "Resume"}
          </button>
          <button
            onClick={() => setIsMuted(!isMuted)}
            className="rounded-full bg-[#e5f2ec] p-3 text-[#327d70]"
          >
            {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
          </button>
        </div>

        <InterventionFeedback activity="breathe" />
      </div>
    </div>
  );
}
