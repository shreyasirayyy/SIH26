"use client";

import Link from "next/link";
import { ArrowRight, ExternalLink, HeartHandshake, MapPinned, MessagesSquare, PhoneCall, ShieldCheck, UsersRound } from "lucide-react";
import { useAppStore } from "@/store/useAppStore";
import { SUPPORT_ITEMS } from "@/data/translations";

const iconMap: Record<string, any> = {
  PhoneCall,
  HeartHandshake,
  MapPinned,
  UsersRound,
};

export default function SupportPage() {
  const language = useAppStore((state) => state.language);
  const hindi = language === "Hindi";

  return (
    <div className="px-5 pb-10 md:px-10 xl:px-14">
      <div className="rounded-[30px] bg-[#0f766e] p-8 text-white md:p-12">
        <p className="text-xs font-bold uppercase tracking-[.2em] text-[#bde5d1]">
          {hindi ? "सहायता" : "Support"}
        </p>
        <h1 className="mt-4 font-display text-5xl leading-none md:text-6xl">
          {hindi ? "आपको यह अकेले सहने की ज़रूरत नहीं है।" : "You do not have to carry this alone."}
        </h1>
        <p className="mt-5 max-w-2xl text-lg leading-relaxed text-white/75">
          {hindi
            ? "वह सहायता चुनें जो आज सही लगे। एक पेशेवर व्यक्ति, कोई संसाधन, एक भरोसेमंद साथी, या सिर्फ़ अकेलापन कम करने की जगह।"
            : "Choose the kind of support that feels right today. A human, a resource, a trusted person, or simply a place to feel less alone."}
        </p>
      </div>

      <div className="mt-8 grid gap-4 md:grid-cols-2">
        {SUPPORT_ITEMS.map(({ href, icon, titleEn, titleHi, descEn, descHi, tone }) => {
          const Icon = iconMap[icon] || PhoneCall;
          return (
            <Link
              href={href}
              key={titleEn}
              className="surface group rounded-[26px] p-6 hover:-translate-y-1 hover:shadow-xl transition-all"
            >
              <span className={`flex h-12 w-12 items-center justify-center rounded-2xl ${tone}`}>
                <Icon size={21} />
              </span>
              <h2 className="mt-6 font-display text-2xl text-[#243630]">
                {hindi ? titleHi : titleEn}
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-[#6b7b75]">
                {hindi ? descHi : descEn}
              </p>
              <span className="mt-6 inline-flex items-center gap-2 text-xs font-bold text-[#0f766e]">
                {hindi ? "देखें" : "Explore"} <ArrowRight size={14} />
              </span>
            </Link>
          );
        })}
      </div>

      <div className="mt-6 flex items-center gap-3 rounded-2xl bg-[#f4f6ec] p-4 text-sm text-[#5c6d66]">
        <ShieldCheck size={18} className="text-[#0f766e] shrink-0" />
        {hindi
          ? "निगरानी रोके जाने या बंद किए जाने पर भी सभी सहायता सेवाएँ उपलब्ध रहेंगी।"
          : "Support remains available even if monitoring is paused or stopped."}
      </div>

      <a
        href="https://www.dosje.gov.in/organisation/national-helpline-against-atrocities/"
        target="_blank"
        rel="noopener noreferrer"
        className="mt-4 flex items-center justify-between gap-3 rounded-2xl border border-border-color bg-white/70 p-4 text-sm text-[#3f504a] hover:border-deep-teal hover:bg-white transition-all"
      >
        <span>
          {hindi ? (
            <>क्या नई शिकायत दर्ज करानी है? <span className="font-semibold text-[#0f766e]">NHAA एकीकृत पोर्टल</span> पर जाएँ।</>
          ) : (
            <>Need to register a new grievance? Visit the <span className="font-semibold text-[#0f766e]">NHAA Integrated Portal</span>.</>
          )}
        </span>
        <ExternalLink size={16} className="shrink-0 text-[#0f766e]" />
      </a>
    </div>
  );
}