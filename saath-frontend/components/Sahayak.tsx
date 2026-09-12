"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { ArrowUp, MessageCircle, Sparkles } from "lucide-react";
import { aiService } from "@/services/ai";
import { useAppStore } from "@/store/useAppStore";

export function Sahayak({ fullPage = false }: { fullPage?: boolean }) {
  const { currentCase } = useAppStore();
  const [message, setMessage] = useState("");
  const [conversation, setConversation] = useState<Array<{ role: "user" | "assistant"; text: string }>>([
    { role: "assistant", text: "Hi, I am Sahayak. I am here to listen. How have things been with your case or your day?" },
  ]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent) {
    event.preventDefault();
    const text = message.trim();
    if (!text || loading) return;
    setLoading(true);
    setError(null);
    try {
      const result = await aiService.getSahayakPrediction(text, currentCase?.id, conversation);
      setConversation((items) => [...items, { role: "user", text }, { role: "assistant", text: result.reply }]);
      setMessage("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Sahayak is temporarily unavailable.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className={`surface overflow-hidden border border-border-color ${fullPage ? "rounded-[30px]" : "rounded-[26px]"}`}>
      <div className="bg-[color:var(--surface-subtle)] p-5">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[color:var(--surface)] text-[color:var(--primary-teal)]"><Sparkles size={19} /></span>
          <div><p className="text-xs font-bold uppercase tracking-[.18em] text-[color:var(--primary-teal)]">Sahayak</p><p className="text-xs text-[color:var(--text-secondary)]">Your wellbeing support check</p></div>
          {!fullPage && <Link href="/survivor/sahayak" className="ml-auto rounded-full bg-[color:var(--surface)] px-3 py-2 text-xs font-bold text-[color:var(--primary-teal)]">Open chat</Link>}
        </div>
        <p className="mt-4 text-sm leading-relaxed text-[color:var(--text-secondary)]">You can talk about your case, hearings, support, or how today has been. Sahayak will listen and ask gentle questions.</p>
      </div>
      <div className="p-5">
        <div className="mb-4 max-h-40 space-y-2 overflow-y-auto pr-1">{conversation.slice(-4).map((item, index) => <div key={`${item.role}-${index}`} className={`flex gap-3 rounded-2xl p-3 ${item.role === "assistant" ? "bg-[color:var(--surface-subtle)]" : "ml-5 bg-[color:var(--primary-teal-dark)]"}`}><MessageCircle size={17} className="mt-0.5 shrink-0 text-[color:var(--primary-teal)]" /><p className="text-sm leading-relaxed text-[color:var(--text-secondary)]">{item.text}</p></div>)}</div>
        <form onSubmit={submit} className="flex items-center gap-2">
          <input value={message} onChange={(event) => setMessage(event.target.value)} placeholder="How have things been?" className="min-w-0 flex-1 rounded-full border border-border-color bg-[color:var(--input-background)] px-4 py-3 text-sm outline-none focus:border-[color:var(--primary-teal)] focus:ring-2 focus:ring-[color:var(--focus-ring)]/15" disabled={loading} />
          <button type="submit" aria-label="Ask Sahayak" title="Ask Sahayak" disabled={loading || !message.trim()} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[color:var(--primary-teal)] text-white disabled:cursor-not-allowed disabled:opacity-50"><ArrowUp size={18} /></button>
        </form>
        {loading && <p className="mt-3 text-xs text-[color:var(--text-secondary)]">Sahayak is checking your recent signals...</p>}
        {error && <div className="mt-3 flex items-center justify-between gap-3"><p role="alert" className="text-xs text-[color:var(--error)]">{error}</p>{error.includes("reconnect") && <Link href="/connect-case" className="shrink-0 text-xs font-bold text-[color:var(--primary-teal)]">Reconnect case</Link>}</div>}
      </div>
    </section>
  );
}
