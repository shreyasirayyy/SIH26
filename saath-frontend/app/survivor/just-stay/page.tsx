"use client";
import Link from "next/link";
import { ArrowLeft, Ear, Leaf, Wind } from "lucide-react";
import InterventionFeedback from "@/components/InterventionFeedback";

export default function JustStayPage() {
	return (
		<div className="flex min-h-[calc(100vh-100px)] flex-col items-center justify-center px-5 text-center">
			<Link href="/survivor/feel-better" className="absolute left-5 top-5 flex items-center gap-2 text-sm font-semibold text-[#75857f] md:left-10">
				<ArrowLeft size={16} /> Feel better
			</Link>

			<div className="star-breathe flex h-32 w-32 items-center justify-center rounded-full bg-[#dcebdd] text-7xl text-[#d69e2e] shadow-[0_0_0_22px_rgba(220,235,221,.45),0_0_75px_rgba(214,158,46,.22)]">✦</div>
			<p className="mt-12 text-xs font-bold uppercase tracking-[.2em] text-[#7e918b]">TAARA · quiet mode</p>
			<h1 className="mt-5 font-display text-5xl leading-none text-[#172326] md:text-7xl">You can just stay here.</h1>
			<p className="mt-5 max-w-md text-lg leading-relaxed text-[#63736e]">You don't have to talk right now. There is nothing you need to solve in this moment.</p>
			<p className="mt-8 font-display text-xl italic text-[#0f766e]">“I'm here.”</p>

			<div className="mt-10 flex flex-wrap justify-center gap-3">
				<Link href="/survivor/breathe" className="flex items-center gap-2 rounded-full bg-[#0f766e] px-5 py-3 text-sm font-bold text-white"><Wind size={16} /> Breathe</Link>
				<Link href="/survivor/listen" className="flex items-center gap-2 rounded-full bg-white px-5 py-3 text-sm font-bold text-[#456057] shadow-sm ring-1 ring-[#c8d3d0]"><Ear size={16} /> Listen</Link>
				<Link href="/survivor/ground" className="flex items-center gap-2 rounded-full bg-white px-5 py-3 text-sm font-bold text-[#456057] shadow-sm ring-1 ring-[#c8d3d0]"><Leaf size={16} /> Ground</Link>
			</div>

			<div className="mt-8 w-full max-w-md">
				<InterventionFeedback activity="just-stay" />
			</div>
		</div>
	);
}
