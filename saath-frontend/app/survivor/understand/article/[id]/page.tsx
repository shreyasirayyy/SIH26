"use client";

import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, BookOpen, Volume2, VolumeX } from "lucide-react";
import { useState, useEffect } from "react";
import { UNDERSTAND_LIBRARY } from "@/data/understand";
import { useAppStore } from "@/store/useAppStore";

export default function ArticlePage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const article = UNDERSTAND_LIBRARY.find((a) => a.id === id);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const language = useAppStore((state) => state.language);

  useEffect(() => {
    return () => window.speechSynthesis.cancel();
  }, []);

  const toggleSpeech = () => {
    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    } else {
      const utterance = new SpeechSynthesisUtterance(article?.content);
      utterance.lang = language === "Hindi" ? "hi-IN" : "en-US";
      utterance.onend = () => setIsSpeaking(false);
      window.speechSynthesis.speak(utterance);
      setIsSpeaking(true);
    }
  };

  if (!article) return <div className="p-10">Article not found.</div>;

  return (
    <div className="px-5 pb-10 md:px-10 xl:px-14">
      <button onClick={() => router.back()} className="inline-flex items-center gap-2 text-sm font-semibold text-[#75857f]">
        <ArrowLeft size={16} /> Back
      </button>
      <div className="mx-auto mt-8 max-w-2xl">
        <h1 className="font-display text-4xl text-[#172326]">{article.title}</h1>
        <div className="mt-6 flex gap-3">
          <button onClick={toggleSpeech} className="flex items-center gap-2 rounded-full bg-[#f1edf7] px-4 py-2 text-sm font-bold text-[#8064a2]">
            {isSpeaking ? <VolumeX size={16} /> : <Volume2 size={16} />} {isSpeaking ? "Stop listening" : "Listen"}
          </button>
        </div>
        <p className="mt-8 text-lg leading-relaxed text-[#63736e]">{article.content}</p>
      </div>
    </div>
  );
}