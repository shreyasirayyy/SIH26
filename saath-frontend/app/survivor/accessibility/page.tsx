"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Accessibility, ArrowLeft, Check, Contrast, Ear, MousePointer2, Volume2 } from "lucide-react";
type Prefs = { size: string; contrast: boolean; motion: boolean; voice: boolean; controls: boolean };
const defaults: Prefs = { size: "Default", contrast: false, motion: false, voice: false, controls: false };
const applyPrefs = (next: Prefs) => { const root = document.documentElement; root.dataset.saathTextSize = next.size.toLowerCase().replace(" ", "-"); root.dataset.saathContrast = String(next.contrast); root.dataset.saathMotion = next.motion ? "reduced" : "full"; root.dataset.saathControls = String(next.controls); };
import { useAppStore } from "@/store/useAppStore";

export default function AccessibilityPage() {
  const globalLang = useAppStore((state) => state.language);
  const hindi = globalLang === "Hindi";

  const [prefs, setPrefs] = useState<Prefs>(() => {
    if (typeof window === "undefined") return defaults;
    const raw = window.localStorage.getItem("saath-accessibility");
    return raw ? { ...defaults, ...JSON.parse(raw) } : defaults;
  });

  useEffect(() => {
    applyPrefs(prefs);
  }, [prefs]);

  function update(p: Partial<Prefs>) {
    const next = { ...prefs, ...p };
    setPrefs(next);
    localStorage.setItem("saath-accessibility", JSON.stringify(next));
  }

  const controlsList = [
    {
      key: "contrast",
      label: hindi ? "उच्च कंट्रास्ट" : "High contrast",
      icon: Contrast,
      desc: hindi ? "पृष्ठभूमि और पाठ के बीच दृश्य अंतर बढ़ाएँ।" : "Increase definition between surfaces and text.",
    },
    {
      key: "motion",
      label: hindi ? "गति कम करें" : "Reduce motion",
      icon: MousePointer2,
      desc: hindi ? "पृष्ठ संक्रमणों और एनिमेशन को शांत रखें।" : "Keep transitions calm and minimal.",
    },
    {
      key: "voice",
      label: hindi ? "आवाज़ मार्गदर्शन" : "Voice guidance",
      icon: Volume2,
      desc: hindi ? "जहाँ उपलब्ध हो, बोलकर मार्गदर्शन प्रदान करें।" : "Offer spoken guidance where available.",
    },
    {
      key: "controls",
      label: hindi ? "बड़े बटन और नियंत्रण" : "Larger controls",
      icon: Ear,
      desc: hindi ? "आसान उपयोग के लिए टच लक्ष्यों का आकार बढ़ाएँ।" : "Increase touch target sizes for easier use.",
    },
  ];

  return (
    <div className="px-5 pb-10 md:px-10 xl:px-14">
      <Link href="/survivor/my-space" className="inline-flex items-center gap-2 text-sm font-semibold text-[#75857f]">
        <ArrowLeft size={16} /> {hindi ? "मेरी जगह" : "My space"}
      </Link>

      <div className="mt-8">
        <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#f1ecd9] text-[#9f7835]">
          <Accessibility size={23} />
        </span>
        <h1 className="mt-6 font-display text-5xl text-[#172326]">
          {hindi ? "SAATH को अपने अनुकूल बनाएँ।" : "Make SAATH work for you."}
        </h1>
        <p className="mt-4 max-w-2xl text-lg text-[#63736e]">
          {hindi
            ? "ये प्राथमिकताएँ इस उपकरण पर सुरक्षित रहती हैं और इन्हें कभी भी बदला जा सकता है।"
            : "These preferences are saved on this device and can be changed whenever you like."}
        </p>
      </div>

      <div className="surface mt-10 max-w-3xl rounded-[28px] p-7 md:p-10">
        <section>
          <p className="text-xs font-bold uppercase tracking-[.18em] text-[#8a9b94]">
            {hindi ? "अक्षर का आकार (Text size)" : "Text size"}
          </p>
          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {[
              { id: "Small", label: hindi ? "छोटा" : "Small" },
              { id: "Default", label: hindi ? "सामान्य" : "Default" },
              { id: "Large", label: hindi ? "बड़ा" : "Large" },
              { id: "Extra Large", label: hindi ? "अति बड़ा" : "Extra Large" },
            ].map(({ id, label }) => (
              <button
                onClick={() => update({ size: id })}
                className={`rounded-xl px-3 py-3 text-sm font-bold transition-all ${
                  prefs.size === id ? "bg-[#0f766e] text-white" : "bg-[#f4f6ec] text-[#60706a]"
                }`}
                key={id}
              >
                {label}
              </button>
            ))}
          </div>
        </section>

        <div className="my-8 h-px bg-[#dce5df]" />

        {controlsList.map(({ key, label, icon: Icon, desc }) => (
          <button
            key={key}
            onClick={() => update({ [key]: !prefs[key as keyof Prefs] })}
            className="flex w-full items-center gap-4 border-b border-[#e7eee8] py-5 text-left last:border-b-0"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#eaf2ed] text-[#327d70]">
              <Icon size={18} />
            </span>
            <span className="flex-1">
              <span className="block text-sm font-bold text-[#385048]">{label}</span>
              <span className="mt-1 block text-xs text-[#7b8983]">{desc}</span>
            </span>
            <span
              className={`flex h-6 w-6 items-center justify-center rounded-full transition-colors ${
                prefs[key as keyof Prefs] ? "bg-[#0f766e] text-white" : "border border-[#c8d3d0] text-transparent"
              }`}
            >
              <Check size={14} />
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

