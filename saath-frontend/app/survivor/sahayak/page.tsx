"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Sahayak } from "@/components/Sahayak";

export default function SahayakPage() {
  return (
    <div className="mx-auto min-h-[calc(100vh-8rem)] max-w-3xl px-5 pb-10 md:px-10">
      <Link href="/survivor" className="mb-5 inline-flex items-center gap-2 text-sm font-semibold text-[#0f766e]"><ArrowLeft size={16} /> Back home</Link>
      <div className="mb-6"><p className="text-xs font-bold uppercase tracking-[.2em] text-[#7e918b]">Your private support space</p><h1 className="mt-3 font-display text-5xl text-[#172326] md:text-6xl">Talk with Sahayak.</h1><p className="mt-4 max-w-2xl text-lg leading-relaxed text-[#63736e]">Share what is on your mind. Sahayak uses your case and wellbeing check-in context to ask thoughtful follow-up questions.</p></div>
      <Sahayak fullPage />
    </div>
  );
}