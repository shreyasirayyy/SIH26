"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { ArrowUp, MessageCircle, Sparkles } from "lucide-react";
import { aiService } from "@/services/ai";
import { useAppStore } from "@/store/useAppStore";

export function Sahayak({ fullPage = false }: { fullPage?: boolean }) {
  const currentCase = useAppStore((state) => state.currentCase);
  const conversation = useAppStore((state) => state.sahayakConversation);
  const appendSahayakConversation = useAppStore((state) => state.appendSahayakConversation);
  const [message, setMessage] = useState("");
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
      appendSahayakConversation([
        { role: "user", text },
        { role: "assistant", text: result.reply },
      ]);
      setMessage("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Sahayak is temporarily unavailable.");
    } finally {
      setLoading(false);
    }
  }

  const visibleMessages = fullPage ? conversation : conversation.slice(-4);

  return (
    <section className={`surface flex flex-col overflow-hidden border border-border-color ${fullPage ? "min-h-[620px] rounded-[30px]" : "rounded-[26px]"}`}>
      <div className="border-b border-border-color bg-[color:var(--surface-subtle)] p-4 md:p-5">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[color:var(--surface)] text-[color:var(--primary-teal)]"><Sparkles size={19} /></span>
          <div className="min-w-0">
            <p className="text-[11px] font-bold uppercase tracking-[.18em] text-[color:var(--primary-teal)]">SAHAYAK</p>
            <p className="text-xs text-[color:var(--text-secondary)]">Your wellbeing support check</p>
          </div>
          {!fullPage && <Link href="/survivor/sahayak" className="ml-auto rounded-full bg-[color:var(--surface)] px-3 py-2 text-xs font-bold text-[color:var(--primary-teal)]">Open chat</Link>}
        </div>
        {!fullPage && (
          <p className="mt-4 text-sm leading-relaxed text-[color:var(--text-secondary)]">You can talk about your case, hearings, support, or how today has been. Sahayak will listen and ask gentle questions.</p>
        )}
      </div>
      <div className="flex min-h-0 flex-1 flex-col p-4 md:p-5">
        <div className={`flex-1 space-y-3 overflow-y-auto ${fullPage ? "pr-1 md:pr-2" : "max-h-40 pr-1"}`}>
          {visibleMessages.map((item, index) => {
            const isUser = item.role === "user";
            return (
              <div key={`${item.role}-${index}`} className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
                <div className={`flex max-w-[85%] items-start gap-2 rounded-2xl px-3.5 py-2.5 ${isUser ? "bg-[color:var(--primary-teal-dark)] text-[color:var(--text-primary)]" : "bg-[color:var(--surface-subtle)] text-[color:var(--text-primary)]"}`}>
                  {!isUser && <MessageCircle size={16} className="mt-0.5 shrink-0 text-[color:var(--primary-teal)]" />}
                  <p className="text-sm leading-relaxed text-[color:var(--text-primary)]">{item.text}</p>
                  {isUser && <MessageCircle size={16} className="mt-0.5 shrink-0 text-[color:var(--primary-teal)] opacity-80" />}
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-4 border-t border-border-color pt-4">
          <form onSubmit={submit} className="flex items-center gap-2">
            <input value={message} onChange={(event) => setMessage(event.target.value)} placeholder="How have things been?" className="min-w-0 flex-1 rounded-full border border-border-color bg-[color:var(--input-background)] px-4 py-3 text-sm outline-none transition-colors focus:border-[color:var(--primary-teal)] focus:ring-2 focus:ring-[color:var(--focus-ring)]/15" disabled={loading} />
            <button type="submit" aria-label="Ask Sahayak" title="Ask Sahayak" disabled={loading || !message.trim()} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[color:var(--primary-teal)] text-white transition-colors hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-50"><ArrowUp size={18} /></button>
          </form>
          {loading && <p className="mt-3 text-xs text-[color:var(--text-secondary)]">Sahayak is checking your recent signals...</p>}
          {error && <div className="mt-3 flex items-center justify-between gap-3"><p role="alert" className="text-xs text-[color:var(--error)]">{error}</p>{error.includes("reconnect") && <Link href="/connect-case" className="shrink-0 text-xs font-bold text-[color:var(--primary-teal)]">Reconnect case</Link>}</div>}
        </div>
      </div>
    </section>
  );
}
