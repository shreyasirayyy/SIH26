"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function SplashPage() {
  const router = useRouter();

  useEffect(() => {
    const timer = window.setTimeout(() => router.replace("/welcome"), 1400);
    return () => window.clearTimeout(timer);
  }, [router]);

  return <main className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_50%_30%,#dcebdd,transparent_42%),linear-gradient(145deg,#fff9f0,#edf6ef)] px-6 text-center"><div className="saath-fade"><div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-deep-teal text-4xl text-amber shadow-xl">✦</div><h1 className="mt-6 font-display text-5xl font-bold text-deep-teal">SAATH</h1><p className="mt-2 text-xs font-bold uppercase tracking-[.28em] text-text-secondary">With you, over time</p><p className="mt-8 text-sm text-text-secondary">A quiet space to begin.</p><button onClick={() => router.replace("/welcome")} className="mt-6 rounded-full border border-border-color bg-white/70 px-5 py-2 text-sm font-semibold text-deep-teal">Continue</button></div></main>;
}
