"use client";

import Link from "next/link";
import { ArrowLeft, ArrowRight, BookHeart, FileText, History, LockKeyhole, Settings2, SlidersHorizontal } from "lucide-react";
import { useAppStore } from "@/store/useAppStore";
import { MY_SPACE_ITEMS } from "@/data/translations";

const iconMap: Record<string, any> = {
  FileText,
  BookHeart,
  History,
  LockKeyhole,
  SlidersHorizontal,
};

export default function MySpacePage() {
  const language = useAppStore((state) => state.language);
  const hindi = language === "Hindi";

  return (
    <div className="px-5 pb-10 md:px-10 xl:px-14">
      <Link href="/survivor" className="inline-flex items-center gap-2 text-sm font-semibold text-text-secondary">
        <ArrowLeft size={16} /> {hindi ? "होम" : "Home"}
      </Link>

      <div className="saath-fade mt-6">
        <p className="text-xs font-bold uppercase tracking-[.2em] text-[#7e918b]">
          {hindi ? "मेरी जगह" : "My space"}
        </p>
        <h1 className="mt-3 font-display text-5xl leading-none text-[#172326] md:text-6xl">
          {hindi ? "एक जगह जो हमेशा आपकी है।" : "A place that stays yours."}
        </h1>
        <p className="mt-5 max-w-2xl text-lg leading-relaxed text-[#63736e]">
          {hindi
            ? "आपका केस, आपकी यात्रा और आपकी पसंद — एक शांत, निजी जगह में।"
            : "Your case, your journey, and your choices — gathered in one calm, private space."}
        </p>
      </div>

      <div className="mt-10 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {MY_SPACE_ITEMS.map(({ href, icon, titleEn, titleHi, descEn, descHi, tone }) => {
          const Icon = iconMap[icon] || FileText;
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
                {hindi ? "खोलें" : "Open"} <ArrowRight size={14} />
              </span>
            </Link>
          );
        })}
      </div>

      <div className="mt-8 flex items-center gap-4 rounded-[26px] border border-[#c8d3d0]/60 bg-[#f4f6ec]/70 p-5 text-sm text-[#60706a]">
        <Settings2 size={19} className="text-[#0f766e] shrink-0" />
        <span>
          {hindi
            ? "SAATH पूरी तरह सहमति पर आधारित है। सहायता हमेशा उपलब्ध रहेगी चाहे निगरानी सक्रिय हो, रुकी हो या बंद।"
            : "SAATH is built around consent. You can pause or stop monitoring while support remains available."}
        </span>
      </div>
    </div>
  );
}