"use client";
import Link from "next/link";
import { ArrowRight, BookOpen, Ear, Heart, Leaf, Moon, Play, Sparkles, Wind } from "lucide-react";
import { useEffect, useState } from "react";
import { EXERCISE_LIBRARY } from "@/data/exercises";
import { useAppStore } from "@/store/useAppStore";
import { aiService } from "@/services/ai";

const iconMap: Record<string, any> = { Wind, Leaf, Moon, Ear, Sparkles, BookOpen };

export default function FeelBetterPage() { 
  const { currentCase } = useAppStore();
  const [recommended, setRecommended] = useState<string[]>([]);

  useEffect(() => {
    async function fetchPersonalization() {
      try {
        const recs = await aiService.getInterventionRecommendations();
        if (Array.isArray(recs)) {
          setRecommended(recs.map((r: any) => r.type));
        }
      } catch (e) {
        console.error("Personalization failed", e);
      }
    }
    fetchPersonalization();
  }, [currentCase]);

  const sortedExercises = [...EXERCISE_LIBRARY].sort((a, b) => {
    const aRec = recommended.includes(a.id) ? -1 : 1;
    const bRec = recommended.includes(b.id) ? -1 : 1;
    return aRec - bRec;
  });

  return (
    <div className="px-5 pb-10 md:px-10 xl:px-14">
      <div className="saath-fade max-w-3xl">
        <p className="text-xs font-bold uppercase tracking-[.2em] text-[#7e918b]">Feel better</p>
        <h1 className="mt-3 font-display text-5xl leading-none text-[#172326] md:text-6xl">A little more room to breathe.</h1>
        <p className="mt-5 max-w-2xl text-lg leading-relaxed text-[#63736e]">Choose something that feels possible right now. You can stop at any time — nothing here needs to be completed.</p>
      </div>
      
      <div className="mt-10 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {sortedExercises.map((exercise) => {
          const Icon = iconMap[exercise.icon];
          const isRecommended = recommended.includes(exercise.id);
          return (
            <Link href={exercise.href} key={exercise.id} className={`surface group rounded-[26px] p-6 hover:-translate-y-1 hover:shadow-xl ${isRecommended ? 'border-2 border-deep-teal' : ''}`}>
              <div className="flex items-start justify-between">
                <span className={`flex h-12 w-12 items-center justify-center rounded-2xl ${exercise.tone}`}><Icon size={22} /></span>
                <ArrowRight size={18} className="text-[#9aaba4] transition-transform group-hover:translate-x-1" />
              </div>
              <h2 className="mt-7 font-display text-2xl text-[#243630]">{exercise.title} {isRecommended && <span className="text-xs text-deep-teal ml-2">(Recommended)</span>}</h2>
              <p className="mt-2 min-h-12 text-sm leading-relaxed text-[#6b7b75]">{exercise.desc}</p>
              <div className="mt-5 flex items-center gap-2 text-xs font-bold text-[#0f766e]"><Play size={13} /> {exercise.time}</div>
            </Link>
          );
        })}
        <div className="surface group rounded-[26px] p-6 border-2 border-dashed border-border-color flex flex-col justify-center items-center text-center">
          <h2 className="font-display text-xl text-[#243630]">Need something else?</h2>
          <p className="mt-2 text-sm text-[#6b7b75]">Tell us what you need right now.</p>
          <Link href="/survivor/taara" className="mt-4 rounded-full bg-[#0f766e] px-5 py-2 text-sm font-bold text-white">Ask TAARA</Link>
        </div>
      </div>
    </div>
  ); 
}
