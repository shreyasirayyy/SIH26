"use client";
import Link from "next/link";
import { ArrowRight, BookOpen, Ear, Heart, Leaf, Moon, Play, Sparkles, Wind } from "lucide-react";
import { useEffect, useState } from "react";
import { EXERCISE_LIBRARY } from "@/data/exercises";
import { useAppStore } from "@/store/useAppStore";
import { aiService } from "@/services/ai";

const iconMap: Record<string, any> = { Wind, Leaf, Moon, Ear, Sparkles, BookOpen };

export default function FeelBetterPage() { 
  const { currentCase, language } = useAppStore();
  const hindi = language === "Hindi";
  const [recommendations, setRecommendations] = useState<any[]>([]);

  useEffect(() => {
    async function fetchPersonalization() {
      try {
        const recs = await aiService.getInterventionRecommendations();
        if (Array.isArray(recs)) {
          setRecommendations(recs);
        }
      } catch (e) {
        console.error("Personalization failed", e);
      }
    }
    fetchPersonalization();
  }, [currentCase]);

  const sortedExercises = [...EXERCISE_LIBRARY].map((ex: any) => {
    const rec = recommendations.find((r: any) => r.type === ex.id);
    return { ...ex, priority: rec ? rec.priority : 99, reason: rec ? rec.reason : "" };
  }).sort((a: any, b: any) => a.priority - b.priority);

  return (
    <div className="px-5 pb-10 md:px-10 xl:px-14">
      <div className="saath-fade max-w-3xl">
        <p className="text-xs font-bold uppercase tracking-[.2em] text-[#7e918b]">
          {hindi ? "बेहतर महसूस करें" : "Feel better"}
        </p>
        <h1 className="mt-3 font-display text-5xl leading-none text-[#172326] md:text-6xl">
          {hindi ? "साँस लेने के लिए थोड़ा और सुकून।" : "A little more room to breathe."}
        </h1>
        <p className="mt-5 max-w-2xl text-lg leading-relaxed text-[#63736e]">
          {hindi
            ? "कुछ ऐसा चुनें जो अभी संभव लगे। आप कभी भी रुक सकते हैं — यहाँ कुछ भी पूरा करना ज़रूरी नहीं है।"
            : "Choose something that feels possible right now. You can stop at any time — nothing here needs to be completed."}
        </p>
      </div>
      <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {sortedExercises.map((exercise) => {
          const Icon = iconMap[exercise.icon];
          const isRecommended = exercise.priority < 3;
          return (
            <Link
              href={exercise.href}
              key={exercise.id}
              className={`surface group relative flex flex-col justify-between overflow-hidden rounded-[26px] p-6 transition-all duration-200 hover:-translate-y-1 hover:shadow-xl ${
                isRecommended ? "border-2 border-deep-teal ring-4 ring-deep-teal/10" : ""
              }`}
            >
              <div>
                <div className="flex items-start justify-between">
                  <span className={`flex h-12 w-12 items-center justify-center rounded-2xl ${exercise.tone}`}>
                    <Icon size={22} />
                  </span>
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[color:var(--surface-subtle)] text-[#7e918b] transition-transform group-hover:translate-x-0.5 group-hover:text-deep-teal">
                    <ArrowRight size={16} />
                  </span>
                </div>
                <h2 className="mt-6 font-display text-2xl text-[#243630]">
                  {hindi ? exercise.titleHi || exercise.title : exercise.title}
                </h2>
                {isRecommended && (
                  <p className="mt-1 inline-block rounded-md bg-[color:var(--primary-teal-dark)]/15 px-2 py-0.5 text-xs font-bold text-deep-teal">
                    {hindi ? "आपके लिए अनुशंसित" : (exercise.reason || "Recommended for you")}
                  </p>
                )}
                <p className="mt-2 min-h-12 text-sm leading-relaxed text-[#6b7b75]">
                  {hindi ? exercise.descHi || exercise.desc : exercise.desc}
                </p>
              </div>
              <div className="mt-5 flex items-center gap-2 text-xs font-bold text-[#0f766e]">
                <Play size={13} /> {hindi ? exercise.timeHi || exercise.time : exercise.time}
              </div>
            </Link>
          );
        })}
      </div>

      {/* Prominent, dedicated TAARA Quiet Space banner */}
      <div className="mt-10 overflow-hidden rounded-[30px] border border-deep-teal/20 bg-gradient-to-br from-[#0c4e48] via-[#0f766e] to-[#16554f] p-8 text-white shadow-[0_20px_45px_rgba(15,118,110,.25)] md:p-10">
        <div className="relative flex flex-col items-start justify-between gap-6 md:flex-row md:items-center">
          <div className="max-w-2xl space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3.5 py-1 text-xs font-bold uppercase tracking-[.2em] text-[#a7f3d0] backdrop-blur-md">
              <Sparkles size={13} className="text-[#a7f3d0]" />
              {hindi ? "तारा · आपकी सौम्य मार्गदर्शिका" : "TAARA · Your Gentle Guide"}
            </div>
            <h2 className="font-display text-3xl leading-tight text-white md:text-4xl">
              {hindi
                ? "एक बार में एक कदम। आपको अभी सब कुछ सुलझाने की ज़रूरत नहीं है।"
                : "One step at a time. You don't have to figure everything out right now."}
            </h2>
            <p className="text-base leading-relaxed text-white/80">
              {hindi
                ? "कुछ और चाहिए या सिर्फ़ एक शांत बातचीत? तारा यहाँ सुनने, आपको सहारा देने और बिना किसी दबाव के आपके साथ रहने के लिए है।"
                : "Need something else or just a quiet conversation? TAARA is here to listen, ground you, and stay by your side with no pressure."}
            </p>
          </div>

          <Link
            href="/survivor/taara"
            className="group inline-flex shrink-0 items-center gap-3 rounded-full bg-white px-7 py-3.5 text-sm font-bold text-[#0f766e] shadow-lg transition-all hover:bg-[#e6f7f2] hover:shadow-xl hover:scale-105"
          >
            <span>{hindi ? "तारा से बात करें" : "Talk to TAARA"}</span>
            <ArrowRight size={17} className="transition-transform group-hover:translate-x-1" />
          </Link>
        </div>
      </div>
    </div>
  ); 
}
