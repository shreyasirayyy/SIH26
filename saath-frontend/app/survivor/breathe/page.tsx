"use client";

import Link from "next/link";
import { ArrowLeft, Wind } from "lucide-react";
import { useState } from "react";
import InterventionFeedback from "@/components/InterventionFeedback";

export default function BreathePage() {
	const [phase, setPhase] = useState("Ready");

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
					<div className="flex h-40 w-40 items-center justify-center rounded-full bg-[#bfe3d6] font-display text-2xl text-[#2e7468] transition-all">{phase}</div>
				</div>

				<button
					onClick={() => setPhase(phase === "Ready" || phase === "Exhale" ? "Inhale" : phase === "Inhale" ? "Hold" : "Exhale")}
					className="mt-12 rounded-full bg-[#0f766e] px-7 py-3 text-sm font-bold text-white"
				>
					{phase === "Ready" ? "Begin" : "Next phase"}
				</button>

				<InterventionFeedback activity="breathe" />
			</div>
		</div>
	);
}
