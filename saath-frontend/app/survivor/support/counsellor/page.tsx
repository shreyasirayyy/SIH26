"use client";

import Link from "next/link";
import { ArrowLeft, PhoneCall } from "lucide-react";
import { useAppStore } from "@/store/useAppStore";

export default function CounsellorPage() {
  const { currentCase } = useAppStore();
  const counsellor = currentCase?.counsellorAssigned;

  return (
    <div className="px-5 pb-10 md:px-10 xl:px-14">
      <Link href="/survivor/support" className="inline-flex items-center gap-2 text-sm font-semibold text-[#75857f]">
        <ArrowLeft size={16} /> Back to Support
      </Link>

      <div className="mx-auto mt-10 max-w-2xl">
        <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#e5f2ec] text-[#327d70]"><PhoneCall size={24} /></span>
        <h1 className="mt-6 font-display text-4xl text-[#172326]">Talk to a counsellor</h1>
        
        <div className="surface mt-8 rounded-[28px] p-8">
          {counsellor && counsellor !== "Not assigned" ? (
            <div>
              <p className="text-sm font-bold uppercase tracking-[.18em] text-[#7e918b]">Your assigned counsellor</p>
              <h2 className="mt-3 font-display text-3xl text-[#263c35]">{counsellor}</h2>
              <p className="mt-4 text-sm text-[#6b7b75]">Your counsellor is here to support your journey. You can request a follow-up or check-in through your case manager.</p>
            </div>
          ) : (
            <div>
              <h2 className="font-display text-2xl text-[#263c35]">Counsellor not yet assigned</h2>
              <p className="mt-4 text-sm text-[#6b7b75]">We are working on connecting you with a counsellor. Please check back soon or contact your case manager for an update.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}