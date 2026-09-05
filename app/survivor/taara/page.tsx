"use client";

import { useState } from "react";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { useAppStore } from "@/store/useAppStore";

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

  function send(prompt: string) {
    setMessages((m) => [...m, { from: "user", text: prompt }, { from: "taara", text: RESPONSES[prompt] }]);
  }

  return (
    <div className="px-6 py-8 flex flex-col h-full">
      <div className="flex items-center gap-2">
        <Sparkles className="text-deep-teal" size={20} />
        <h1 className="text-lg font-semibold">TAARA</h1>
      </div>
      {monitoring !== "active" && (
        <p className="mt-2 text-xs text-amber">Monitoring is currently {monitoring}. TAARA support is still here for you.</p>
      )}

      <div className="mt-4 flex-1 space-y-3 overflow-y-auto scrollbar-none">
        {messages.map((m, i) => (
          <div key={i} className={m.from === "taara" ? "flex" : "flex justify-end"}>
            <Card
              className={
                m.from === "taara"
                  ? "bg-pale-sage/50 border-none max-w-[85%]"
                  : "bg-deep-teal text-white border-none max-w-[85%]"
              }
            >
              <p className="text-sm">{m.text}</p>
            </Card>
          </div>
        ))}
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2">
        {PROMPTS.map((p) => (
          <Button key={p} variant="secondary" size="sm" onClick={() => send(p)} className="text-left justify-start">
            {p}
          </Button>
        ))}
      </div>
      <p className="mt-3 text-[11px] text-center text-text-secondary">
        TAARA is a supportive companion, not a replacement for professional care. If you are in
        immediate danger, please contact local emergency services.
      </p>
    </div>
  );
}
