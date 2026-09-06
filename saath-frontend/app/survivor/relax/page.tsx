"use client";
import Link from "next/link";
import { ArrowLeft, Check, Moon, Play } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import InterventionFeedback from "@/components/InterventionFeedback";

export default function RelaxPage() {
	const [started, setStarted] = useState(false);
	const [done, setDone] = useState(false);
	const [timeLeft, setTimeLeft] = useState(300);
	const timerRef = useRef<NodeJS.Timeout | null>(null);

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

	const formatTime = (seconds: number) => {
		const mins = Math.floor(seconds / 60);
		const secs = seconds % 60;
		return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
	};

	return (
		<div className="px-5 pb-10 md:px-10 xl:px-14">
			<Link href="/survivor/feel-better" className="inline-flex items-center gap-2 text-sm font-semibold text-[#75857f]"><ArrowLeft size={16} /> Feel better</Link>

			<div className="mx-auto mt-10 max-w-2xl text-center">
				<span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#eee8f5] text-[#8064a2]"><Moon size={24} /></span>
				<p className="mt-6 text-xs font-bold uppercase tracking-[.2em] text-[#7e918b]">Guided relaxation · 5 min</p>
				<h1 className="mt-3 font-display text-5xl text-[#172326]">Let the day soften.</h1>
				<p className="mt-4 text-lg text-[#63736e]">A slow, quiet activity to help your shoulders drop and your attention settle.</p>

				<div className="surface-soft mt-10 rounded-[28px] p-8">
					<div className="mx-auto flex h-28 w-28 items-center justify-center rounded-full bg-[#e8e0f3] text-3xl text-[#8064a2]">{done ? <Check /> : formatTime(timeLeft)}</div>
					<p className="mt-6 text-sm text-[#6b7b75]">{done ? "You made space for yourself." : started ? "Follow the gentle prompts. Nothing else is needed." : "Take a moment to relax."}</p>
					<button onClick={() => setStarted(true)} className="mt-6 inline-flex items-center gap-2 rounded-full bg-[#8064a2] px-6 py-3 text-sm font-bold text-white" disabled={started}>
						{started ? "Activity in progress" : <><Play size={15} /> Begin</>}
					</button>
				</div>

				{done && <InterventionFeedback activity="relax" />}
			</div>
		</div>
	);
}
