"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { ArrowUp, Sparkles, Plus, Trash2, History, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useAppStore } from "@/store/useAppStore";
import { aiService } from "@/services/ai";
import { CrisisInterrupt } from "@/components/CrisisInterrupt";

const PROMPTS = [
  "I feel anxious about the hearing.",
  "I had trouble sleeping.",
  "I want a grounding exercise.",
  "Tell me something calming.",
];

export default function TaaraPage() {
  const {
    survivorName,
    monitoring,
    currentCase,
    victimToken,
    taaraConversations,
    activeTaaraSessionId,
    ensureTaaraSession,
    startNewTaaraSession,
    setActiveTaaraSession,
    appendTaaraMessage,
    deleteTaaraSession,
  } = useAppStore();

  const ownerKey = victimToken ?? "guest";
  const sessions = taaraConversations[ownerKey] ?? [];
  const activeSessionId = activeTaaraSessionId[ownerKey];
  const activeSession = sessions.find((s) => s.id === activeSessionId) ?? null;
  const messages = activeSession?.messages ?? [];

  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [crisis, setCrisis] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    ensureTaaraSession(ownerKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ownerKey]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const sortedSessions = useMemo(
    () => [...sessions].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()),
    [sessions]
  );

  async function send(message: string) {
    const text = message.trim();
    if (!text || sending) return;
    const sessionId =
      activeSessionId && sessions.some((s) => s.id === activeSessionId) ? activeSessionId : ensureTaaraSession(ownerKey);
    setDraft("");
    setError(null);
    appendTaaraMessage(ownerKey, sessionId, {
      id: crypto.randomUUID(),
      from: "user",
      text,
      createdAt: new Date().toISOString(),
    });
    setSending(true);
    try {
      const result = await aiService.sendTaaraMessage(text, currentCase?.id);
      if (result.safetyState === "urgent_support") {
        setCrisis(true);
        return;
      }
      appendTaaraMessage(ownerKey, sessionId, {
        id: crypto.randomUUID(),
        from: "taara",
        text: result.reply,
        createdAt: new Date().toISOString(),
      });
    } catch (e) {
      console.error(e);
      setError("TAARA is currently unavailable. Please try again later.");
    } finally {
      setSending(false);
    }
  }

  function handleNewChat() {
    startNewTaaraSession(ownerKey);
    setDraft("");
    setError(null);
    setShowHistory(false);
  }

  function handleOpen(sessionId: string) {
    setActiveTaaraSession(ownerKey, sessionId);
    setShowHistory(false);
  }

  function handleDelete(sessionId: string) {
    if (typeof window !== "undefined" && !window.confirm("Delete this conversation? This can't be undone.")) return;
    deleteTaaraSession(ownerKey, sessionId);
    const remaining = sessions.filter((s) => s.id !== sessionId);
    if (remaining.length === 0) {
      startNewTaaraSession(ownerKey);
    }
  }

  return (
    <div className="relative flex h-full min-h-0">
      <div className="flex h-full min-h-0 flex-1 flex-col px-4 py-6 sm:px-6 sm:py-8">
        {crisis && (
          <CrisisInterrupt reason="TAARA conversation flagged urgent_support" onDismiss={() => setCrisis(false)} />
        )}
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
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleNewChat}
              className="flex h-9 w-9 items-center justify-center rounded-full text-text-secondary hover:bg-pale-sage/60"
              title="New chat"
            >
              <Plus size={17} />
            </button>
            <button
              type="button"
              onClick={() => setShowHistory(true)}
              className="flex h-9 w-9 items-center justify-center rounded-full text-text-secondary hover:bg-pale-sage/60"
              title="History"
            >
              <History size={17} />
            </button>
            <span className="hidden rounded-full bg-pale-sage/60 px-3 py-1 text-[11px] font-medium text-deep-teal sm:inline-block">Here with you</span>
          </div>
        </div>
        {monitoring !== "active" && (
          <p className="mt-2 text-xs text-amber">Monitoring is currently {monitoring}. TAARA support is still here for you.</p>
        )}

        <div ref={scrollRef} className="mt-5 flex min-h-0 flex-1 flex-col space-y-3 overflow-y-auto px-1 pb-2 scrollbar-none">
          {messages.length === 0 && (
            <div className="flex">
              <div className="max-w-[88%] rounded-2xl rounded-tl-md border border-border-color/50 bg-white px-4 py-3 text-text-primary shadow-sm">
                <p className="whitespace-pre-wrap text-sm leading-relaxed">
                  {`Hi ${survivorName ?? "there"}, I'm TAARA. I'm here whenever you want to talk.`}
                </p>
              </div>
            </div>
          )}
          {messages.map((m) => (
            <div key={m.id} className={m.from === "taara" ? "flex" : "flex justify-end"}>
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

      {showHistory && (
        <div className="absolute inset-0 z-20 flex justify-end bg-black/20" onClick={() => setShowHistory(false)}>
          <aside
            onClick={(e) => e.stopPropagation()}
            className="flex h-full w-72 max-w-[85%] flex-col border-l border-border-color/60 bg-white shadow-xl"
          >
            <div className="flex items-center justify-between border-b border-border-color/60 px-4 py-4">
              <p className="text-xs font-bold uppercase tracking-[.18em] text-text-secondary">History</p>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={handleNewChat}
                  className="flex h-7 w-7 items-center justify-center rounded-full bg-deep-teal text-white"
                  title="New chat"
                >
                  <Plus size={14} />
                </button>
                <button
                  type="button"
                  onClick={() => setShowHistory(false)}
                  className="flex h-7 w-7 items-center justify-center rounded-full text-text-secondary hover:bg-pale-sage/60"
                  title="Close"
                >
                  <X size={15} />
                </button>
              </div>
            </div>
            <div className="flex-1 space-y-1 overflow-y-auto px-2 py-3 scrollbar-none">
              {sortedSessions.length === 0 && <p className="px-2 text-xs text-text-secondary">No conversations yet.</p>}
              {sortedSessions.map((session) => (
                <div
                  key={session.id}
                  onClick={() => handleOpen(session.id)}
                  className={`group flex cursor-pointer items-start justify-between gap-2 rounded-xl px-3 py-2 text-left transition-colors ${
                    session.id === activeSessionId ? "bg-pale-sage text-deep-teal" : "hover:bg-pale-sage/50"
                  }`}
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-text-primary">{session.title}</p>
                    <p className="text-[11px] text-text-secondary">{new Date(session.updatedAt).toLocaleString()}</p>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(session.id);
                    }}
                    className="shrink-0 rounded-full p-1 text-text-secondary opacity-0 transition-opacity hover:text-warm-peach group-hover:opacity-100"
                    title="Delete conversation"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}
