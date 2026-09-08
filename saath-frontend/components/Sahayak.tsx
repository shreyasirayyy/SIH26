"use client";

import { FormEvent, useState } from "react";
import { ArrowUp, MessageCircle, Sparkles } from "lucide-react";
import { aiService } from "@/services/ai";
import { useAppStore } from "@/store/useAppStore";

export function Sahayak() {
  const { currentCase } = useAppStore();
  const [message, setMessage] = useState("");
  const [reply, setReply] = useState("Hi, I am Sahayak. I am here to listen to what has been happening with your case and daily life.");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent) {
    event.preventDefault();
    const text = message.trim();
    if (!text || loading) return;
    setLoading(true);
    setError(null);
    try {
      const result = await aiService.getSahayakPrediction(text, currentCase?.id);
      setReply(result.reply);
      setMessage("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Sahayak is temporarily unavailable.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="surface overflow-hidden rounded-[26px] border border-[#c9ded7]">
      <div className="bg-[#eaf5ef] p-5">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white text-[#0f766e]"><Sparkles size={19} /></span>
          <div><p className="text-xs font-bold uppercase tracking-[.18em] text-[#0f766e]">Sahayak</p><p className="text-xs text-[#58756c]">Your wellbeing support check</p></div>
        </div>
        <p className="mt-4 text-sm leading-relaxed text-[#36594f]">You can talk about your case, hearings, support, or how today has been. Sahayak will listen and ask gentle questions.</p>
      </div>
      <div className="p-5">
        <form onSubmit={submit} className="flex items-center gap-2">
          <input value={message} onChange={(event) => setMessage(event.target.value)} placeholder="How have things been?" className="min-w-0 flex-1 rounded-full border border-[#c8d8d2] px-4 py-3 text-sm outline-none focus:border-[#0f766e] focus:ring-2 focus:ring-[#0f766e]/15" disabled={loading} />
          <button type="submit" aria-label="Ask Sahayak" title="Ask Sahayak" disabled={loading || !message.trim()} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#0f766e] text-white disabled:cursor-not-allowed disabled:opacity-50"><ArrowUp size={18} /></button>
        </form>
        {loading && <p className="mt-3 text-xs text-[#63736e]">Sahayak is checking your recent signals...</p>}
        {error && <p role="alert" className="mt-3 text-xs text-[#a15f4e]">{error}</p>}
        <div className="mt-4 flex gap-3 rounded-2xl bg-[#f7faf5] p-4"><MessageCircle size={17} className="mt-0.5 shrink-0 text-[#0f766e]" /><p className="text-sm leading-relaxed text-[#526b63]">{reply}</p></div>
      </div>
    </section>
  );
}
