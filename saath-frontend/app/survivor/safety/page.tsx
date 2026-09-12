import Link from "next/link";
import { LifeBuoy, PhoneCall, HeartHandshake, Leaf, ShieldCheck } from "lucide-react";

// N06 — Safety resources screen
// A single screen with the fastest paths to safety: helpline, assigned
// counsellor, a grounding space, and the Safe Circle. Reachable in one
// tap from anywhere via the shield icon in SurvivorHeader.
const HELPLINE = "+91-0000000000"; // TODO: replace with real helpline from config
const COUNSELLOR_CONTACT = "+91-9876543210"; // TODO: fetch assigned counsellor contact from case data

export default function SafetyPage() {
  return (
    <div className="px-5 pb-10 md:px-10 xl:px-14">
      <div className="rounded-[30px] bg-[#a15f4e] p-8 text-white md:p-12">
        <p className="text-xs font-bold uppercase tracking-[.2em] text-white/70">Safety</p>
        <h1 className="mt-4 font-display text-4xl leading-tight md:text-5xl">If you’re unsafe right now, help is one tap away.</h1>
        <p className="mt-5 max-w-2xl text-base leading-relaxed text-white/80">These options work even if monitoring is paused or stopped.</p>
      </div>

      <div className="mt-8 grid gap-4 md:grid-cols-2">
        <a href={`tel:${HELPLINE}`} className="surface flex items-center gap-4 rounded-[26px] p-6 hover:-translate-y-0.5 hover:shadow-lg">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#fbe6e0] text-[#a15f4e]"><LifeBuoy size={21} /></span>
          <div>
            <h2 className="font-display text-xl text-text-primary">Call helpline</h2>
            <p className="mt-1 text-sm text-text-secondary">Free, confidential, available now.</p>
          </div>
        </a>
        <a href={`tel:${COUNSELLOR_CONTACT}`} className="surface flex items-center gap-4 rounded-[26px] p-6 hover:-translate-y-0.5 hover:shadow-lg">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#e5f2ec] text-[#327d70]"><PhoneCall size={21} /></span>
          <div>
            <h2 className="font-display text-xl text-text-primary">Call your counsellor</h2>
            <p className="mt-1 text-sm text-text-secondary">Reach the person assigned to support you.</p>
          </div>
        </a>
        <Link href="/survivor/just-stay" className="surface flex items-center gap-4 rounded-[26px] p-6 hover:-translate-y-0.5 hover:shadow-lg">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#dcebdd] text-[#488056]"><Leaf size={21} /></span>
          <div>
            <h2 className="font-display text-xl text-text-primary">Just stay here</h2>
            <p className="mt-1 text-sm text-text-secondary">A quiet grounding space — nothing to solve right now.</p>
          </div>
        </Link>
        <Link href="/survivor/support/safe-circle" className="surface flex items-center gap-4 rounded-[26px] p-6 hover:-translate-y-0.5 hover:shadow-lg">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#fff0e5] text-[#b56e4e]"><HeartHandshake size={21} /></span>
          <div>
            <h2 className="font-display text-xl text-text-primary">Contact your Safe Circle</h2>
            <p className="mt-1 text-sm text-text-secondary">Reach a trusted person you’ve prepared in advance.</p>
          </div>
        </Link>
      </div>

      <div className="mt-6 flex items-center gap-3 rounded-2xl bg-[#f4f6ec] p-4 text-sm text-[#5c6d66]">
        <ShieldCheck size={18} className="text-[#0f766e]" /> This screen is always one tap away from the shield icon at the top of the app.
      </div>
    </div>
  );
}