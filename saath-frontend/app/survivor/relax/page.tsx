"use client";
import Link from "next/link";
import { ArrowLeft, Check, Moon, Play, Volume2, VolumeX } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import InterventionFeedback from "@/components/InterventionFeedback";
import { aiService } from "@/services/ai";
import { getRelaxContentForCaseType, RelaxLanguage } from "@/lib/RelaxContent";
import { useSpeech } from "@/lib/useSpeech";

import { useAppStore } from "@/store/useAppStore";

const PROMPT_INTERVAL_SECONDS = 40;

export default function RelaxPage() {
	const globalLang = useAppStore((state) => state.language);
	const setGlobalLang = useAppStore((state) => state.setLanguage);
	const [started, setStarted] = useState(false);
	const [done, setDone] = useState(false);
	const [timeLeft, setTimeLeft] = useState(300);
	const [caseType, setCaseType] = useState<string | null>(null);
	const [promptIndex, setPromptIndex] = useState(0);
	const [language, setLanguage] = useState<RelaxLanguage>(globalLang === "Hindi" ? "hi" : "en");
	const timerRef = useRef<NodeJS.Timeout | null>(null);

	useEffect(() => {
		setLanguage(globalLang === "Hindi" ? "hi" : "en");
	}, [globalLang]);

	const content = getRelaxContentForCaseType(caseType);
	const prompts = content.prompts[language];
	const currentPrompt = prompts[promptIndex % prompts.length];
	const { speak, stop, speaking, enabled, toggleEnabled, gender, setGender } = useSpeech();

	useEffect(() => {
		let cancelled = false;
		(async () => {
			try {
				const stored = typeof window !== "undefined" ? window.localStorage.getItem("saath_case_id") : null;
				if (!stored) return;
				const result = await aiService.getCaseProfile(stored);
				if (!cancelled && result && typeof result === "object" && "case_type" in (result as any)) {
					setCaseType((result as any).case_type ?? null);
				}
			} catch {
				// fall back to default content
			}
		})();
		return () => {
			cancelled = true;
		};
	}, []);

	useEffect(() => {
		if (started && !done && timeLeft > 0) {
			timerRef.current = setInterval(() => {
				setTimeLeft((prev) => {
					if (prev <= 1) {
						setDone(true);
						return 0;
					}
					return prev - 1;
				});
			}, 1000);
		} else if (timerRef.current) {
			clearInterval(timerRef.current);
		}
		return () => { if (timerRef.current) clearInterval(timerRef.current); };
	}, [started, done, timeLeft]);

	useEffect(() => {
		if (!started || done) return;
		speak(currentPrompt, language);

		const promptTimer = setInterval(() => {
			setPromptIndex((prev) => prev + 1);
		}, PROMPT_INTERVAL_SECONDS * 1000);

		return () => clearInterval(promptTimer);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [started, done, promptIndex, language]);

	useEffect(() => {
		if (done) stop();
		return () => stop();
	}, [done, stop]);

	const formatTime = (seconds: number) => {
		const mins = Math.floor(seconds / 60);
		const secs = seconds % 60;
		return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
	};

	const startRelaxation = () => {
		setStarted(true);
	};

	return (
		<div className="px-5 pb-10 md:px-10 xl:px-14">
			<Link href="/survivor/feel-better" className="inline-flex items-center gap-2 text-sm font-semibold text-[#75857f]">
				<ArrowLeft size={16} /> {language === "hi" ? "बेहतर महसूस करें" : "Feel better"}
			</Link>

			<div className="mx-auto mt-10 max-w-2xl text-center">
				<span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#eee8f5] text-[#8064a2]"><Moon size={24} /></span>
				<p className="mt-6 text-xs font-bold uppercase tracking-[.2em] text-[#7e918b]">{content.title[language]} · {language === "hi" ? "5 मिनट" : "5 min"}</p>
				<h1 className="mt-3 font-display text-5xl text-[#172326]">
					{language === "hi" ? "दिन के तनाव को हल्का होने दें।" : "Let the day soften."}
				</h1>
				<p className="mt-4 text-lg text-[#63736e]">
					{language === "hi"
						? "एक शांत गतिविधि जो आपके कंधों के तनाव को कम करने और ध्यान को स्थिर करने में मदद करे।"
						: "A slow, quiet activity to help your shoulders drop and your attention settle."}
				</p>

				{!started && (
					<div className="mt-6 flex flex-wrap items-center justify-center gap-3">
						<div className="inline-flex rounded-full border border-[#d8cfe8] p-1">
							<button
								onClick={() => { setLanguage("hi"); setGlobalLang("Hindi"); }}
								className={`rounded-full px-4 py-1.5 text-sm font-semibold transition ${language === "hi" ? "bg-[#8064a2] text-white" : "text-[#8064a2]"}`}
							>
								हिन्दी
							</button>
							<button
								onClick={() => { setLanguage("en"); setGlobalLang("English"); }}
								className={`rounded-full px-4 py-1.5 text-sm font-semibold transition ${language === "en" ? "bg-[#8064a2] text-white" : "text-[#8064a2]"}`}
							>
								English
							</button>
						</div>

						<div className="inline-flex rounded-full border border-[#d8cfe8] p-1">
							<button
								onClick={() => setGender("female")}
								className={`rounded-full px-4 py-1.5 text-sm font-semibold transition ${gender === "female" ? "bg-[#8064a2] text-white" : "text-[#8064a2]"}`}
							>
								{language === "hi" ? "स्त्री स्वर" : "Female voice"}
							</button>
							<button
								onClick={() => setGender("male")}
								className={`rounded-full px-4 py-1.5 text-sm font-semibold transition ${gender === "male" ? "bg-[#8064a2] text-white" : "text-[#8064a2]"}`}
							>
								{language === "hi" ? "पुरुष स्वर" : "Male voice"}
							</button>
						</div>
					</div>
				)}

				<div className="surface-soft mt-10 rounded-[28px] p-8">
					<div className="mx-auto flex h-28 w-28 items-center justify-center rounded-full bg-[#e8e0f3] text-3xl text-[#8064a2]">{done ? <Check /> : formatTime(timeLeft)}</div>

					{started && !done && (
						<p className="mt-6 min-h-12 text-base font-medium text-[#3f4f4a] transition-opacity duration-500">
							{currentPrompt}
						</p>
					)}
					{!started && (
						<p className="mt-6 text-sm text-[#6b7b75]">
							{language === "hi" ? "विश्राम करने के लिए एक पल निकालें।" : "Take a moment to relax."}
						</p>
					)}
					{done && <p className="mt-6 text-sm text-[#6b7b75]">You made space for yourself.</p>}

					<div className="mt-8 flex items-center justify-center gap-3">
						{!started ? (
							<button
								onClick={startRelaxation}
								className="flex items-center gap-2 rounded-full bg-[#8064a2] px-7 py-3 text-sm font-bold text-white shadow-sm"
							>
								<Play size={16} /> {language === "hi" ? "शुरू करें" : "Begin"}
							</button>
						) : (
							<button
								onClick={toggleEnabled}
								className="flex items-center gap-2 rounded-full bg-[#e8e0f3] px-6 py-3 text-sm font-bold text-[#8064a2]"
							>
								{enabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
								{enabled ? (language === "hi" ? "आवाज़ मार्गदर्शन चालू" : "Voice on") : (language === "hi" ? "आवाज़ बंद" : "Voice off")}
							</button>
						)}
					</div>

					{started && !done && speaking && (
						<p className="mt-3 text-xs text-[#9a8bb0]">Speaking…</p>
					)}
				</div>

				{done && <InterventionFeedback activity="relax" />}
			</div>
		</div>
	);
}