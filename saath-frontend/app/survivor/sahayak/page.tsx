"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Sahayak } from "@/components/Sahayak";

export default function SahayakPage() {
  return (
    <div className="mx-auto min-h-[calc(100vh-8rem)] w-full max-w-[1200px] px-4 pb-10 pt-4 md:px-8 lg:px-12">
      <Link href="/survivor" className="mb-5 inline-flex items-center gap-2 text-sm font-semibold text-[#0f766e]"><ArrowLeft size={16} /> Back home</Link>
      <div className="mb-6 max-w-5xl">
        <p className="text-xs font-bold uppercase tracking-[.2em] text-[#7e918b]">Your private support space</p>
        <h1 className="mt-3 font-display text-4xl leading-none text-[#172326] md:text-5xl">Talk with Sahayak.</h1>
        <p className="mt-3 max-w-3xl text-base leading-relaxed text-[#63736e] md:text-lg">Share what is on your mind. Sahayak uses your case and wellbeing check-in context to ask thoughtful follow-up questions.</p>
      </div>
      <div className="w-full max-w-[1100px]">
        <Sahayak fullPage />
      </div>
    </div>
  );
}