"use client";

import { useEffect, useState } from "react";
import { Card, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { caseService } from "@/services/case";
import { useAppStore } from "@/store/useAppStore";
import { CaseRecord } from "@/types";
import { Check, ClipboardList, MessageCircle, Send, Sparkles, UserCheck } from "lucide-react";

export default function FollowUpsPage() {
  const cases = useAppStoreCases();
  const followUps = useAppStore((s) => s.followUps);
  const counsellorMessages = useAppStore((s) => s.counsellorMessages);
  const addFollowUp = useAppStore((s) => s.addFollowUp);
  const markFollowUpComplete = useAppStore((s) => s.markFollowUpComplete);
  const markCounsellorMessageRead = useAppStore((s) => s.markCounsellorMessageRead);
  const replyCounsellorMessage = useAppStore((s) => s.replyCounsellorMessage);

  const [caseId, setCaseId] = useState("");
  const [date, setDate] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Quick reply state for survivor messages
  const [activeReplyId, setActiveReplyId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const selectedCase = cases.find((c) => c.id === caseId);
    if (!selectedCase || !date) {
      setError("Pick a case and a date.");
      return;
    }
    setSubmitting(true);
    try {
      const isoDate = new Date(date).toISOString();
      const result = await caseService.createFollowUp({ caseId, date: isoDate, notes: notes || undefined });
      addFollowUp({
        id: result.followUpId,
        caseId,
        victimToken: selectedCase.victimToken,
        survivorName: selectedCase.survivorName,
        docket: selectedCase.docket,
        date: isoDate,
        notes: notes || undefined,
        status: "SCHEDULED",
        createdAt: new Date().toISOString(),
        requestedBy: "counsellor",
      });
      setCaseId("");
      setDate("");
      setNotes("");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not schedule this follow-up.");
    } finally {
      setSubmitting(false);
    }
  }

  const handleSendReply = (messageId: string) => {
    if (!replyText.trim()) return;
    replyCounsellorMessage(messageId, replyText.trim());
    setActiveReplyId(null);
    setReplyText("");
  };

  const upcoming = followUps.filter((f) => f.status === "SCHEDULED");
  const completed = followUps.filter((f) => f.status === "COMPLETED");

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <div>
        <h1 className="text-xl font-semibold">Follow-ups &amp; Survivor Requests</h1>
        <p className="mt-1 text-sm text-text-secondary">
          Track counsellor follow-ups and incoming requests from survivors in your caseload.
        </p>
      </div>

      {/* Survivor Messages Section */}
      {counsellorMessages.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-text-secondary">
              <MessageCircle size={16} className="text-deep-teal" /> Incoming Survivor Messages (
              {counsellorMessages.length})
            </h2>
          </div>
          <div className="grid gap-3">
            {counsellorMessages.map((msg) => (
              <Card
                key={msg.id}
                className={`transition-all ${
                  !msg.read ? "border-deep-teal/40 bg-[#f4f9f7]/60" : "bg-white"
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-text-primary">{msg.survivorName}</span>
                      <span className="font-mono text-xs text-text-secondary">{msg.docket}</span>
                      {!msg.read && <Badge tone="teal">New message</Badge>}
                      {msg.urgency === "urgent" && <Badge tone="peach">Urgent</Badge>}
                      {msg.urgency === "soon" && <Badge tone="amber">Needs reply today</Badge>}
                    </div>
                    {msg.subject && (
                      <p className="mt-1 text-xs font-semibold text-deep-teal">{msg.subject}</p>
                    )}
                    <p className="mt-2 rounded-xl bg-[color:var(--surface-subtle)] p-3 text-sm italic text-text-primary">
                      &ldquo;{msg.message}&rdquo;
                    </p>
                    <p className="mt-2 text-xs text-text-secondary">
                      Sent {new Date(msg.createdAt).toLocaleString()}
                    </p>
                  </div>

                  <div className="flex shrink-0 flex-col items-end gap-2">
                    {!msg.read && (
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => markCounsellorMessageRead(msg.id)}
                      >
                        <Check size={14} /> Mark read
                      </Button>
                    )}
                    {activeReplyId !== msg.id && (
                      <Button
                        size="sm"
                        variant={msg.replyText ? "secondary" : "primary"}
                        onClick={() => {
                          setActiveReplyId(msg.id);
                          setReplyText(msg.replyText ?? "");
                        }}
                      >
                        {msg.replyText ? "Edit reply" : "Reply"}
                      </Button>
                    )}
                  </div>
                </div>

                {/* Reply display or editing */}
                {msg.replyText && activeReplyId !== msg.id && (
                  <div className="mt-3 rounded-xl border border-border-color/60 bg-[#eef6f3] p-3 text-xs">
                    <p className="font-semibold text-deep-teal">Your reply to survivor:</p>
                    <p className="mt-0.5 text-text-primary">{msg.replyText}</p>
                  </div>
                )}

                {activeReplyId === msg.id && (
                  <div className="mt-4 space-y-2 border-t border-border-color/60 pt-3">
                    <label className="block text-xs font-semibold text-text-primary">
                      Compose reply to {msg.survivorName}:
                    </label>
                    <textarea
                      rows={2}
                      placeholder="Write a supportive reply..."
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      className="w-full rounded-xl border border-border-color bg-white p-2.5 text-xs text-text-primary outline-none focus:border-deep-teal resize-none"
                    />
                    <div className="flex justify-end gap-2">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => setActiveReplyId(null)}
                      >
                        Cancel
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => handleSendReply(msg.id)}
                        disabled={!replyText.trim()}
                      >
                        <Send size={13} /> Send reply
                      </Button>
                    </div>
                  </div>
                )}
              </Card>
            ))}
          </div>
        </section>
      )}

      {/* Schedule a Follow-up Card */}
      <Card>
        <CardTitle>Schedule a follow-up</CardTitle>
        <form onSubmit={handleSubmit} className="mt-4 grid gap-3 sm:grid-cols-2">
          <select
            value={caseId}
            onChange={(e) => setCaseId(e.target.value)}
            className="w-full rounded-xl border border-border-color bg-white px-4 py-3 text-base text-text-primary outline-none focus:border-deep-teal min-h-11 sm:col-span-2"
          >
            <option value="">Select a case...</option>
            {cases.map((c) => (
              <option key={c.id} value={c.id}>
                {c.survivorName} — {c.docket}
              </option>
            ))}
          </select>
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          <Input placeholder="Notes (optional)" value={notes} onChange={(e) => setNotes(e.target.value)} />
          {error && <p className="text-sm text-warm-peach sm:col-span-2">{error}</p>}
          <Button type="submit" disabled={submitting} className="sm:col-span-2 sm:w-fit">
            {submitting ? "Scheduling..." : "Schedule follow-up"}
          </Button>
        </form>
      </Card>

      {/* Upcoming Follow-ups */}
      <div>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-text-secondary">
          Upcoming ({upcoming.length})
        </h2>
        <div className="mt-3 grid gap-3">
          {upcoming.length === 0 && (
            <div className="rounded-2xl border border-dashed border-border-color p-8 text-center text-sm text-text-secondary">
              No follow-ups scheduled yet.
            </div>
          )}
          {upcoming.map((f) => (
            <Card
              key={f.id}
              className={`flex items-start justify-between gap-4 ${
                f.requestedBy === "survivor" ? "border-amber/40 bg-amber/5" : ""
              }`}
            >
              <div className="flex gap-3">
                <span
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${
                    f.requestedBy === "survivor"
                      ? "bg-amber/20 text-[#925008]"
                      : "bg-pale-sage/50 text-deep-teal"
                  }`}
                >
                  {f.requestedBy === "survivor" ? <UserCheck size={18} /> : <ClipboardList size={18} />}
                </span>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-medium">{f.survivorName}</p>
                    {f.requestedBy === "survivor" && (
                      <Badge tone="peach">Requested by survivor</Badge>
                    )}
                  </div>
                  <p className="text-xs text-text-secondary font-mono">{f.docket}</p>
                  <p className="mt-1 text-xs text-text-secondary">
                    Due {new Date(f.date).toLocaleDateString()}
                    {f.preferredTime ? ` · Preferred time: ${f.preferredTime}` : ""}
                    {f.notes ? ` · ${f.notes}` : ""}
                  </p>
                </div>
              </div>
              <Button size="sm" variant="secondary" onClick={() => markFollowUpComplete(f.id)}>
                <Check size={14} /> Mark done
              </Button>
            </Card>
          ))}
        </div>
      </div>

      {completed.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-text-secondary">
            Completed ({completed.length})
          </h2>
          <div className="mt-3 grid gap-2">
            {completed.map((f) => (
              <Card key={f.id} className="flex items-center justify-between gap-4 opacity-70">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-medium">{f.survivorName}</p>
                    {f.requestedBy === "survivor" && (
                      <span className="text-[10px] text-text-secondary">(Survivor request)</span>
                    )}
                  </div>
                  <p className="text-xs text-text-secondary">{new Date(f.date).toLocaleDateString()}</p>
                </div>
                <Badge tone="sage">Completed</Badge>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function useAppStoreCases(): CaseRecord[] {
  const [cases, setCases] = useState<CaseRecord[]>([]);
  useEffect(() => {
    caseService.listAllCases().then(setCases).catch(() => setCases([]));
  }, []);
  return cases;
}
