"use client";

import Link from "next/link";
import { ArrowLeft, Eye, Hand, Headphones, Leaf } from "lucide-react";
import { useState, useEffect } from "react";
import InterventionFeedback from "@/components/InterventionFeedback";
import { useSpeech } from "@/lib/useSpeech";

type Language = "hi" | "en";

const STEPS = [
	{
		n: 5,
		icon: Eye,
		label: { hi: "cheezein jo tum dekh sakte ho", en: "things you can see" },
		prompt: {
			hi: "Apne aas paas paanch cheezein dhoondo jo tum dekh sakte ho. Har ek ko dhyaan se dekho.",
			en: "Find five things around you that you can see. Notice each one carefully.",
		},
	},
	{
		n: 4,
		icon: Hand,
		label: { hi: "cheezein jo tum mehsoos kar sakte ho", en: "things you can feel" },
		prompt: {
			hi: "Ab chaar cheezein dhoondo jo tum chhoo kar mehsoos kar sakte ho.",
			en: "Now find four things you can touch and feel.",
		},
	},
	{
		n: 3,
		icon: Headphones,
		label: { hi: "cheezein jo tum sun sakte ho", en: "things you can hear" },
		prompt: {
			hi: "Teen aawazein sunno jo abhi tumhare aas paas ho rahi hain.",
			en: "Listen for three sounds happening around you right now.",
		},
	},
	{
		n: 2,
		icon: Leaf,
		label: { hi: "cheezein jo tum sungh sakte ho", en: "things you can smell" },
		prompt: {
			hi: "Do khushboo ya gandh mehsoos karne ki koshish karo apne aas paas.",
			en: "Try to notice two smells around you.",
		},
	},
	{
		n: 1,
		icon: Leaf,
		label: { hi: "cheez jo tum chakh sakte ho", en: "thing you can taste" },
		prompt: {
			hi: "Ek cheez jo tum abhi apne muh me chakh sakte ho, uspar dhyaan do.",
			en: "Notice one thing you can taste right now.",
		},
	},
];

import { useAppStore } from "@/store/useAppStore";

export default function GroundPage() {
	const globalLang = useAppStore((state) => state.language);
	const setGlobalLang = useAppStore((state) => state.setLanguage);
	const [step, setStep] = useState(0);
	const [language, setLanguage] = useState<Language>(globalLang === "Hindi" ? "hi" : "en");
	const { speak, stop, enabled, toggleEnabled } = useSpeech();
	const current = STEPS[step];

	useEffect(() => {
		setLanguage(globalLang === "Hindi" ? "hi" : "en");
	}, [globalLang]);

	useEffect(() => {
		speak(current.prompt[language], language);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [step, language]);

	useEffect(() => {
		return () => stop();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	return (
		<div className="px-5 pb-10 md:px-10 xl:px-14">
			<Link href="/survivor/feel-better" className="inline-flex items-center gap-2 text-sm font-semibold text-[#75857f]">
				<ArrowLeft size={16} /> {language === "hi" ? "बेहतर महसूस करें" : "Feel better"}
			</Link>

			<div className="mx-auto mt-10 max-w-2xl">
				<div className="flex items-center justify-between">
					<div>
						<p className="text-xs font-bold uppercase tracking-[.2em] text-[#7e918b]">
							{language === "hi" ? "5–4–3–2–1 ग्राउंडिंग" : "5–4–3–2–1 grounding"}
						</p>
						<h1 className="mt-3 font-display text-5xl text-[#172326]">
							{language === "hi" ? "वर्तमान में वापस आएँ।" : "Come back to now."}
						</h1>
					</div>
					<span className="font-display text-5xl text-[#d69e2e]">{current.n}</span>
				</div>

				<div className="mt-4 inline-flex rounded-full border border-[#d8cfe8] p-1">
					<button
						onClick={() => { setLanguage("hi"); setGlobalLang("Hindi"); }}
						className={`rounded-full px-4 py-1.5 text-sm font-semibold transition ${language === "hi" ? "bg-[#0f766e] text-white" : "text-[#0f766e]"}`}
					>
						हिन्दी
					</button>
					<button
						onClick={() => { setLanguage("en"); setGlobalLang("English"); }}
						className={`rounded-full px-4 py-1.5 text-sm font-semibold transition ${language === "en" ? "bg-[#0f766e] text-white" : "text-[#0f766e]"}`}
					>
						English
					</button>
					<button
						onClick={toggleEnabled}
						className="ml-1 rounded-full px-4 py-1.5 text-sm font-semibold text-[#0f766e]"
					>
						{enabled ? "🔊" : "🔇"}
					</button>
				</div>

				<div className="mt-8 h-2 rounded-full bg-[#e1e8e1]">
					<div className="h-2 rounded-full bg-[#7faf86] transition-all" style={{ width: `${(step / 5) * 100}%` }} />
				</div>

				<div className="surface mt-10 rounded-[28px] p-8 text-center md:p-12">
					<span className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-[#f2ecd9] text-[#a47730]"><current.icon size={27} /></span>
					<p className="mt-8 text-xs font-bold uppercase tracking-[.18em] text-[#8a9b94]">{language === "hi" ? "Dhyaan do" : "Notice"}</p>
					<h2 className="mt-3 font-display text-3xl text-[#263c35]">{current.n} {current.label[language]}</h2>
					<p className="mt-4 text-sm leading-relaxed text-[#6b7b75]">
						{language === "hi" ? "Apna samay lo. Inhe chup chaap ya bol kar naam de sakte ho." : "Take your time. You can name them silently or out loud."}
					</p>

					<button
						onClick={() => {
							if (step < 4) setStep(step + 1);
						}}
						className="mt-8 rounded-full bg-[#0f766e] px-7 py-3 text-sm font-bold text-white"
					>
						{step === 4 ? (language === "hi" ? "Tum yahan ho" : "You're here") : language === "hi" ? "Agla" : "Next"}
					</button>

					{step === 4 && <InterventionFeedback activity="ground" />}
				</div>
			</div>
		</div>
	);
}