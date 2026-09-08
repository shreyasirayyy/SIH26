"use client";

import { useState, useRef, useEffect } from "react";
import { ArrowUp, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useAppStore } from "@/store/useAppStore";
import { aiService } from "@/services/ai";

const PROMPTS = [
  "I feel anxious about the hearing.",
  "I had trouble sleeping.",
  "I want a grounding exercise.",
  "Tell me something calming.",
];

export default function TaaraPage() {
  const { survivorName, monitoring, currentCase } = useAppStore();
  const [messages, setMessages] = useState<{ from: "taara" | "user"; text: string }[]>([
    { from: "taara", text: `Hi ${survivorName ?? "there"}, I'm TAARA. I'm here whenever you want to talk.` },
  ]);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  async function send(message: string) {
    const text = message.trim();
    if (!text || sending) return;
    setDraft("");
    setError(null);
    setMessages((m) => [...m, { from: "user", text }]);
    setSending(true);
    try {
      const result = await aiService.sendTaaraMessage(text, currentCase?.id);
      setMessages((m) => [...m, { from: "taara", text: result.reply }]);
    } catch (e) {
      console.error(e);
      setError("TAARA is currently unavailable. Please try again later.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="flex h-full flex-col px-4 py-6 sm:px-6 sm:py-8">
      <div className="flex items-center justify-between border-b border-border-color/60 pb-4">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-pale-sage text-deep-teal">
            <Sparkles size={19} />
          </span>
          <div>
            <h1 className="text-lg font-semibold">TAARA</h1>
            <p className="text-xs text-text-secondary">A quiet space to talk things through</p>
          </div>
        </div>
        <span className="rounded-full bg-pale-sage/60 px-3 py-1 text-[11px] font-medium text-deep-teal">Here with you</span>
      </div>
      {monitoring !== "active" && (
        <p className="mt-2 text-xs text-amber">Monitoring is currently {monitoring}. TAARA support is still here for you.</p>
      )}

      <div ref={scrollRef} className="mt-5 flex min-h-0 flex-1 flex-col space-y-3 overflow-y-auto px-1 pb-2 scrollbar-none">
        {messages.map((m, i) => (
          <div key={i} className={m.from === "taara" ? "flex" : "flex justify-end"}>
            <div
              className={
                m.from === "taara"
                  ? "max-w-[88%] rounded-2xl rounded-tl-md border border-border-color/50 bg-white px-4 py-3 text-text-primary shadow-sm"
                  : "max-w-[82%] rounded-2xl rounded-tr-md bg-deep-teal px-4 py-3 text-white shadow-sm"
              }
            >
              <p className="whitespace-pre-wrap text-sm leading-relaxed">{m.text}</p>
            </div>
          </div>
        ))}
        {sending && (
          <div className="flex">
            <div className="rounded-2xl rounded-tl-md border border-border-color/50 bg-white px-4 py-3 text-sm text-text-secondary shadow-sm">
              TAARA is thinking...
            </div>
          </div>
        )}
        {error && <p className="text-center text-xs text-warm-peach">{error}</p>}
      </div>

      <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
        {PROMPTS.map((p) => (
          <Button key={p} variant="secondary" size="sm" onClick={() => void send(p)} className="justify-start overflow-hidden text-left text-xs" disabled={sending}>
            {p}
          </Button>
        ))}
      </div>

      <div className="mt-4 flex items-center gap-2">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && void send(draft)}
          placeholder="Type your message..."
          className="flex-1 rounded-full border border-border-color px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-deep-teal"
          disabled={sending}
        />
        <Button onClick={() => void send(draft)} disabled={sending || !draft.trim()} className="rounded-full p-3">
          <ArrowUp size={18} />
        </Button>
      </div>
    </div>
  );
}
