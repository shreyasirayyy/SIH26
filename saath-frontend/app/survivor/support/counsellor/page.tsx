"use client";

import Link from "next/link";
import { ArrowLeft, CalendarClock, MessageCircle, Phone, PhoneCall } from "lucide-react";
import { useAppStore } from "@/store/useAppStore";

const FALLBACK_COUNSELLOR = {
  name: "Dr. Neha Sharma",
  specialisation: "Trauma & Rehabilitation Counsellor",
  phone: "+91 80000 22110",
};

export default function CounsellorPage() {
  const { currentCase } = useAppStore();
  const counsellor =
    currentCase?.assignedCounsellor ??
    (currentCase?.counsellorAssigned && currentCase.counsellorAssigned !== "Not assigned"
      ? { name: currentCase.counsellorAssigned, specialisation: undefined, phone: undefined }
      : null) ??
    FALLBACK_COUNSELLOR;

  return (
    <div className="px-5 pb-10 md:px-10 xl:px-14">
      <Link href="/survivor/support" className="inline-flex items-center gap-2 text-sm font-semibold text-[#75857f]">
        <ArrowLeft size={16} /> Back to Support
      </Link>

      <div className="mx-auto mt-10 max-w-2xl">
        <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#e5f2ec] text-[#327d70]"><PhoneCall size={24} /></span>
        <h1 className="mt-6 font-display text-4xl text-[#172326]">Talk to a counsellor</h1>

        <div className="surface mt-8 rounded-[28px] p-8">
          <p className="text-sm font-bold uppercase tracking-[.18em] text-[#7e918b]">Your assigned counsellor</p>
          <h2 className="mt-3 font-display text-3xl text-[#263c35]">{counsellor.name}</h2>
          {counsellor.specialisation && (
            <p className="mt-1 text-sm text-[#7e918b]">{counsellor.specialisation}</p>
          )}
          <p className="mt-4 text-sm leading-relaxed text-[#6b7b75]">
            Your counsellor is here to support your journey. You can request a follow-up call or send a
            message, and they will get back to you, usually within a day.
          </p>

          <div className="mt-7 flex flex-wrap gap-3">
            
              href={`tel:${(counsellor.phone ?? FALLBACK_COUNSELLOR.phone).replace(/[^\d+]/g, "")}`}
              className="flex items-center gap-2 rounded-full bg-[#0f766e] px-5 py-2.5 text-sm font-bold text-white"
            >
              <Phone size={15} /> Call {counsellor.phone ?? FALLBACK_COUNSELLOR.phone}
            </a>
            <button className="flex items-center gap-2 rounded-full border border-border-color bg-white px-5 py-2.5 text-sm font-bold text-[#263c35] hover:border-deep-teal">
              <CalendarClock size={15} /> Request a follow-up
            </button>
            <button className="flex items-center gap-2 rounded-full border border-border-color bg-white px-5 py-2.5 text-sm font-bold text-[#263c35] hover:border-deep-teal">
              <MessageCircle size={15} /> Send a message
            </button>
          </div>
        </div>

        <div className="mt-5 rounded-2xl bg-[#f4f6ec] p-4 text-sm text-[#5c6d66]">
          Support stays available even if you pause or stop monitoring. Reaching out here never affects
          your case record.
        </div>
      </div>
    </div>
  );
}