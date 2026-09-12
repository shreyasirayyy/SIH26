"use client";
import Link from "next/link";
import { ArrowLeft, Ear, Leaf, Wind } from "lucide-react";
import InterventionFeedback from "@/components/InterventionFeedback";

import { useAppStore } from "@/store/useAppStore";

export default function JustStayPage() {
	const language = useAppStore((state) => state.language);
	const hindi = language === "Hindi";

	return (
		<div className="relative flex min-h-[calc(100vh-100px)] flex-col items-center justify-center px-5 text-center">
			<Link href="/survivor/feel-better" className="absolute left-5 top-5 flex items-center gap-2 text-sm font-semibold text-[#75857f] md:left-10">
				<ArrowLeft size={16} /> {hindi ? "बेहतर महसूस करें" : "Feel better"}
			</Link>

			<div className="star-breathe flex h-32 w-32 items-center justify-center rounded-full bg-[#dcebdd] text-7xl text-[#d69e2e] shadow-[0_0_0_22px_rgba(220,235,221,.45),0_0_75px_rgba(214,158,46,.22)]">✦</div>
			<p className="mt-12 text-xs font-bold uppercase tracking-[.2em] text-[#7e918b]">
				{hindi ? "तारा · शांत मोड" : "TAARA · quiet mode"}
			</p>
			<h1 className="mt-5 font-display text-5xl leading-none text-[#172326] md:text-7xl">
				{hindi ? "आप बस यहीं रह सकते हैं।" : "You can just stay here."}
			</h1>
			<p className="mt-5 max-w-md text-lg leading-relaxed text-[#63736e]">
				{hindi
					? "आपको अभी बोलने की ज़रूरत नहीं है। इस पल में आपको कुछ भी सुलझाने की ज़रूरत नहीं है।"
					: "You don't have to talk right now. There is nothing you need to solve in this moment."}
			</p>
			<p className="mt-8 font-display text-xl italic text-[#0f766e]">
				{hindi ? "“मैं आपके साथ हूँ।”" : "“I'm here.”"}
			</p>

			<div className="mt-10 flex flex-wrap justify-center gap-3">
				<Link href="/survivor/breathe" className="flex items-center gap-2 rounded-full bg-[#0f766e] px-5 py-3 text-sm font-bold text-white shadow-sm">
					<Wind size={16} /> {hindi ? "साँस लें" : "Breathe"}
				</Link>
				<Link href="/survivor/listen" className="flex items-center gap-2 rounded-full bg-white px-5 py-3 text-sm font-bold text-[#456057] shadow-sm ring-1 ring-[#c8d3d0]">
					<Ear size={16} /> {hindi ? "सुनें" : "Listen"}
				</Link>
				<Link href="/survivor/ground" className="flex items-center gap-2 rounded-full bg-white px-5 py-3 text-sm font-bold text-[#456057] shadow-sm ring-1 ring-[#c8d3d0]">
					<Leaf size={16} /> {hindi ? "ज़मीन से जुड़ें" : "Ground"}
				</Link>
			</div>


			<div className="mt-8 w-full max-w-md">
				<InterventionFeedback activity="just-stay" />
			</div>
		</div>
	);
}
