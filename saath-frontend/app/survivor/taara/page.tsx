"use client";

import { useState } from "react";
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

const RESPONSES: Record<string, string> = {
  "I feel anxious about the hearing.":
    "It's understandable to feel that way before a hearing. Your legal aid team is aware of the date, and you don't have to face it unprepared. Would you like a short grounding exercise before we talk more?",
  "I had trouble sleeping.":
    "Thank you for sharing that. Sleep can be one of the first things affected. Would a slow breathing exercise or a wind-down routine help tonight?",
  "I want a grounding exercise.":
    "Let's try one: name 5 things you can see, 4 you can touch, 3 you can hear, 2 you can smell, and 1 you can taste. Take your time.",
  "Tell me something calming.":
    "You have already done something brave by being here today. One step at a time is enough.",
};

export default function TaaraPage() {
  const { survivorName, monitoring } = useAppStore();
  const [messages, setMessages] = useState<{ from: "taara" | "user"; text: string }[]>([
    { from: "taara", text: `Hi ${survivorName ?? "there"}, I'm TAARA. I'm here whenever you want to talk.` },
  ]);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function send(prompt: string) {
    const message = prompt.trim();
    if (!message || sending) return;
    setDraft("");
    setError(null);
    setMessages((m) => [...m, { from: "user", text: message }]);
    setSending(true);
    try {
      const result = await aiService.sendTaaraMessage(message);
      setMessages((m) => [...m, { from: "taara", text: result.reply }]);
    } catch {
      const fallback = RESPONSES[message];
      setMessages((m) => [...m, { from: "taara", text: fallback ?? "I am here with you. Please try sending that again." }]);
      setError("TAARA is reconnecting. Your message is still here.");
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

      <div className="mt-5 flex min-h-0 flex-1 flex-col space-y-3 overflow-y-auto px-1 pb-2 scrollbar-none">
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
      </div>

      <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
        {PROMPTS.map((p) => (
          <Button key={p} variant="secondary" size="sm" onClick={() => void send(p)} className="justify-start overflow-hidden text-left text-xs" disabled={sending}>
            {p}
          </Button>
        ))}
      </div>
      <form className="mt-3 flex items-end gap-2 rounded-2xl border border-border-color bg-white p-2 shadow-sm" onSubmit={(event) => { event.preventDefault(); void send(draft); }}>
        <input
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder="Type what is on your mind..."
          aria-label="Message TAARA"
          disabled={sending}
          className="min-w-0 flex-1 bg-transparent px-2 py-2 text-sm outline-none placeholder:text-text-secondary/70"
        />
        <Button type="submit" aria-label="Send message" title="Send message" className="h-10 min-h-10 w-10 rounded-xl p-0" disabled={sending || !draft.trim()}>
          <ArrowUp size={18} />
        </Button>
      </form>
      {error && <p className="mt-2 text-center text-xs text-warm-peach" role="status">{error}</p>}
      <p className="mt-3 text-[11px] text-center text-text-secondary">
        TAARA is a supportive companion, not a replacement for professional care. If you are in
        immediate danger, please contact local emergency services.
      </p>
    </div>
  );
}
