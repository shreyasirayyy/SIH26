"use client";
import Link from "next/link";
import { ArrowLeft, BookOpen, Headphones } from "lucide-react";
import { UNDERSTAND_LIBRARY } from "@/data/understand";
import { useAppStore } from "@/store/useAppStore";

export default function UnderstandPage() {
  const language = useAppStore((state) => state.language);

  const listenToArticle = (content: string) => {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(content);
    utterance.lang = language === "Hindi" ? "hi-IN" : "en-US";
    window.speechSynthesis.speak(utterance);
  };

  return (
    <div className="px-5 pb-10 md:px-10 xl:px-14">
      <Link href="/survivor/feel-better" className="inline-flex items-center gap-2 text-sm font-semibold text-[#75857f]">
        <ArrowLeft size={16} /> Feel better
      </Link>
      <div className="mt-8">
        <p className="text-xs font-bold uppercase tracking-[.2em] text-[#7e918b]">Understand</p>
        <h1 className="mt-3 font-display text-5xl text-[#172326] md:text-6xl">Clarity can be comforting.</h1>
        <p className="mt-4 max-w-2xl text-lg text-[#63736e]">Small, plain-language guides for making sense of what you may be feeling.</p>
      </div>
      <div className="mt-10 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {UNDERSTAND_LIBRARY.map((article) => (
          <article key={article.id} className="surface rounded-3xl p-6">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#e5eef5] text-[#5b8db8]">
              <BookOpen size={18} />
            </span>
            <h2 className="mt-5 font-display text-2xl text-[#2d4039]">{article.title}</h2>
            <p className="mt-2 text-sm leading-relaxed text-[#6b7b75]">{article.desc}</p>
            <div className="mt-5 flex gap-2">
              <Link href={`/survivor/understand/article/${article.id}`} className="rounded-full bg-[#eef6f0] px-3 py-2 text-xs font-bold text-[#327d70]">
                Read
              </Link>
              <button onClick={() => listenToArticle(article.content)} className="flex items-center gap-1 rounded-full bg-[#f1edf7] px-3 py-2 text-xs font-bold text-[#8064a2]">
                <Headphones size={12} /> Listen
              </button>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
