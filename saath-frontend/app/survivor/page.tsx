"use client";

import Link from "next/link";
import { ArrowRight, CalendarDays, Check, CloudDrizzle, CloudRain, CloudSun, Leaf, Mic2, ShieldCheck, Sun, Wind } from "lucide-react";
import { useEffect, useState } from "react";
import { useAppStore } from "@/store/useAppStore";
import { caseService } from "@/services/case";
import { CaseRecord } from "@/types";
import { formatDate } from "@/lib/utils";
import { Sahayak } from "@/components/Sahayak";

const moods = [
  { key: "light", icon: CloudDrizzle, tone: "bg-[color:var(--success-bg)] text-[color:var(--success)]" },
  { key: "heavy", icon: CloudRain, tone: "bg-[color:var(--warning-bg)] text-[color:var(--warning)]" },
  { key: "veryHeavy", icon: CloudSun, tone: "bg-[color:var(--error-bg)] text-[color:var(--error)]" },
  { key: "okay", icon: Sun, tone: "bg-[color:var(--surface-subtle)] text-[color:var(--primary-teal-light)]" },
] as const;
const moodScores = { light: 2, heavy: 3, veryHeavy: 4, okay: 5 };

export default function SurvivorHomePage() {
  const { victimToken, survivorName, language, currentCase, docket } = useAppStore();
  const [caseRecord, setCaseRecord] = useState<CaseRecord | null>(currentCase ?? null);
  const [selectedMood, setSelectedMood] = useState<string | null>(null);
  const hindi = language === "Hindi";
  const copy = hindi ? {
    greeting: "नमस्ते", enough: "आप यहाँ हैं। इतना काफ़ी है।", private: "आपकी जगह निजी और आपकी सहमति के अनुसार है", checkin: "आज आप कैसा महसूस कर रहे हैं?", noWrong: "आधार बनें, बस उस भाव को चुनें जो सबसे सही लगे।", moodPrompt: "एक पल रुकें और वह भाव चुनें जो अभी सबसे ज़्यादा फिट बैठता है।", moods: { light: "ठीक हूँ", heavy: "थोड़ा मुश्किल है", veryHeavy: "बहुत मुश्किल है", okay: "बहुत भारी लग रहा है" }, selected: "चुना गया", continue: "चेक-इन जारी रखें", care: "आपके लिए कुछ", careText: "दो मिनट रुककर एक शांत गतिविधि करें।", way: "अपने तरीके से चेक-इन", wayText: "टेक्स्ट, आवाज़ या IVRS में से जो सहज लगे चुनें।", case: "आपका केस", connect: "केस कनेक्ट करें", hearing: "अगली सुनवाई", support: "आपकी सहायता टीम आपके साथ है", privacy: "आपकी पसंद, सहमति और गोपनीयता नियंत्रण हमेशा आपके पास हैं", demo: "सिंथेटिक डेमो डेटा" } : {
    greeting: new Date().getHours() < 12 ? "Good morning" : new Date().getHours() < 17 ? "Good afternoon" : "Good evening", enough: "Take today at your own pace.", checkin: "How are things feeling today?", noWrong: "Choose the feeling that fits best right now.", moodPrompt: "Take a moment and pick the one that feels closest.", moods: { light: "I'm okay", heavy: "A little heavy", veryHeavy: "Quite heavy", okay: "I'm overwhelmed" }, selected: "Selected", continue: "Continue check-in", care: "Something for you", careText: "Take two minutes to slow down with a gentle grounding activity.", way: "Check in your way", wayText: "Text, voice, or IVRS. Choose what feels most comfortable today.", case: "Your case", connect: "Connect your case", hearing: "Next hearing", support: "Your support team is with you", privacy: "Your choices, consent, and privacy controls are always visible.", demo: "Synthetic demonstration data" };

  useEffect(() => {
    if (victimToken) {
      caseService.getCase(victimToken).then((c: CaseRecord | null) => {
        if (c) {
          setCaseRecord(c);
        } else if (currentCase) {
          setCaseRecord(currentCase);
        }
      });
    } else if (currentCase) {
      setCaseRecord(currentCase);
    }
  }, [victimToken, currentCase]);
  const activeCase = caseRecord ?? currentCase ?? (docket ? { docket, currentStage: "Investigation", nextHearingDate: "2026-09-18" } as Partial<CaseRecord> : null);
  const displayName = survivorName?.trim() || caseRecord?.survivorName?.trim() || currentCase?.survivorName?.trim();

  return (
    <div className="px-5 pb-10 md:px-10 md:pb-16 xl:px-14">
      {/* Editorial Header */}
      <div className="mb-10 flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <h1 className="font-editorial text-[38px] leading-[1.05] tracking-tight text-text-primary md:text-[54px]">
            {copy.greeting}
            {displayName ? (
              <>
                , <span className="font-normal italic text-deep-teal">{displayName}</span>
              </>
            ) : (
              ""
            )}
          </h1>
          <p className="mt-3 text-base text-text-secondary md:text-lg">
            {hindi ? (
              <span>आप यहाँ हैं। <strong className="font-semibold text-text-primary">इतना काफ़ी है।</strong></span>
            ) : (
              <span>Take today <strong className="font-semibold text-text-primary">at your own pace.</strong></span>
            )}
          </p>
        </div>
        <div className="hidden items-center gap-2 text-xs font-medium text-text-secondary md:flex">
          <ShieldCheck size={14} className="text-deep-teal" />
          <span>{copy.private}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.25fr)_minmax(330px,.75fr)]">
        <section className="space-y-6">
          {/* Quick Check-in Card */}
          <div className="surface overflow-hidden rounded-[28px] p-6 md:p-8 transition-all hover:border-[color:var(--primary-teal-light)]/40">
            <div className="space-y-3">
              <div className="inline-flex w-fit items-center rounded-full border border-border-color/70 bg-[color:var(--surface-subtle)] px-3 py-1 text-[11px] font-bold uppercase tracking-[0.16em] text-text-secondary">
                Quick check-in
              </div>
              <h2 className="font-editorial text-2xl text-text-primary md:text-[34px] leading-tight">
                {hindi ? (
                  <>आज आप <span className="italic text-deep-teal">कैसा महसूस</span> कर रहे हैं?</>
                ) : (
                  <>How are things <span className="italic text-deep-teal">feeling today?</span></>
                )}
              </h2>
              <p className="text-sm leading-relaxed text-text-secondary max-w-xl">
                {copy.moodPrompt}
              </p>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-3.5 lg:grid-cols-4">
              {moods.map(({ key, icon: Icon, tone }) => (
                <button
                  key={key}
                  onClick={() => setSelectedMood(key)}
                  className={`group flex min-h-[124px] flex-col items-start justify-between rounded-2xl border p-4 text-left transition-all duration-200 ${
                    selectedMood === key
                      ? "border-[color:var(--primary-teal)] bg-[color:var(--primary-teal-dark)] ring-3 ring-[color:var(--primary-teal)]/15 shadow-sm"
                      : "border-border-color bg-[color:var(--surface)] hover:-translate-y-0.5 hover:border-[color:var(--primary-teal-light)] hover:shadow-sm"
                  }`}
                >
                  <span className={`inline-flex h-10 w-10 items-center justify-center rounded-full ${tone} transition-transform group-hover:scale-105`}>
                    <Icon size={19} />
                  </span>
                  <span className="block text-sm font-semibold leading-snug text-text-primary">
                    {copy.moods[key]}
                  </span>
                  {selectedMood === key && (
                    <span className="flex items-center gap-1 text-[11px] font-bold text-[color:var(--primary-teal)]">
                      <Check size={13} /> {copy.selected}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {selectedMood && (
              <div className="mt-5 flex items-center justify-between rounded-2xl bg-[color:var(--surface-subtle)] px-4 py-3.5 text-sm text-text-secondary border border-border-color/50">
                <span>{copy.noWrong}</span>
                <Link
                  href="/survivor/check-in"
                  className="group ml-3 inline-flex items-center gap-1 whitespace-nowrap text-sm font-semibold text-deep-teal hover:underline"
                >
                  <span>{copy.continue}</span>
                  <ArrowRight size={14} className="transition-transform duration-200 group-hover:translate-x-1" />
                </Link>
              </div>
            )}
          </div>

          {/* Editorial Navigation Cards */}
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <Link
              href="/survivor/feel-better"
              className="surface-soft group rounded-[26px] p-6 hover:-translate-y-0.5 hover:shadow-md transition-all duration-200"
            >
              <div className="flex items-center justify-between">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[color:var(--surface)] text-deep-teal shadow-xs">
                  <Wind size={19} />
                </div>
                <ArrowRight size={18} className="text-text-secondary transition-all duration-200 group-hover:translate-x-1 group-hover:text-deep-teal" />
              </div>
              <h3 className="mt-6 font-editorial text-2xl text-text-primary">
                {hindi ? (
                  <>आपके लिए <span className="italic text-deep-teal">कुछ</span></>
                ) : (
                  <>Something <span className="italic text-deep-teal">for you</span></>
                )}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-text-secondary">
                {copy.careText}
              </p>
            </Link>

            <Link
              href="/survivor/check-in"
              className="surface-soft group rounded-[26px] p-6 hover:-translate-y-0.5 hover:shadow-md transition-all duration-200"
            >
              <div className="flex items-center justify-between">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[color:var(--surface)] text-warm-peach shadow-xs">
                  <Mic2 size={19} />
                </div>
                <ArrowRight size={18} className="text-text-secondary transition-all duration-200 group-hover:translate-x-1 group-hover:text-deep-teal" />
              </div>
              <h3 className="mt-6 font-editorial text-2xl text-text-primary">
                {hindi ? (
                  <>अपने तरीके से <span className="italic text-deep-teal">चेक-इन</span></>
                ) : (
                  <>Check in <span className="italic text-deep-teal">your way</span></>
                )}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-text-secondary">
                {copy.wayText}
              </p>
            </Link>
          </div>
        </section>

        {/* Sidebar Panel */}
        <aside className="space-y-5">
          <Sahayak />

          {/* Case Card */}
          <div className="surface rounded-[26px] p-6 transition-all hover:border-[color:var(--primary-teal-light)]/40">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-text-secondary">
                  {copy.case}
                </p>
                {activeCase ? (
                  <p className="mt-2 font-mono text-sm font-semibold text-text-primary tracking-wide">
                    {activeCase.docket}
                  </p>
                ) : (
                  <p className="mt-2 text-sm text-text-secondary">{copy.connect}</p>
                )}
              </div>
              <Link
                href={activeCase ? "/survivor/case" : "/connect-case"}
                aria-label={copy.case}
                className="group rounded-full p-2 text-text-secondary hover:bg-[color:var(--surface-subtle)] hover:text-deep-teal transition-colors"
              >
                <ArrowRight size={18} className="transition-transform duration-200 group-hover:translate-x-0.5" />
              </Link>
            </div>

            {activeCase && (
              <>
                <div className="mt-5 flex items-center gap-3 rounded-2xl bg-[color:var(--success-bg)] p-3.5">
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[color:var(--surface)] text-[color:var(--success)] shadow-xs">
                    <Leaf size={17} />
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-[color:var(--success)]">
                      {activeCase.currentStage ?? "Investigation"}
                    </p>
                    <p className="mt-0.5 text-xs text-text-secondary">{copy.support}</p>
                  </div>
                </div>

                <div className="mt-5 flex items-center justify-between border-t border-border-color/60 pt-4">
                  <div className="flex items-center gap-2 text-xs font-medium text-text-secondary">
                    <CalendarDays size={15} /> {copy.hearing}
                  </div>
                  <span className="text-sm font-semibold text-text-primary">
                    {activeCase.nextHearingDate ? formatDate(activeCase.nextHearingDate) : "—"}
                  </span>
                </div>
              </>
            )}
          </div>

          <div className="flex items-center gap-3 px-2 text-xs leading-relaxed text-text-secondary">
            <ShieldCheck size={16} className="shrink-0 text-sage" />
            <span>{copy.privacy}</span>
          </div>
          <div className="flex items-center gap-2 px-2 text-xs text-text-secondary">
            <Leaf size={13} className="text-sage" />
            <span>{copy.demo}</span>
          </div>
        </aside>
      </div>
    </div>
  );
}
