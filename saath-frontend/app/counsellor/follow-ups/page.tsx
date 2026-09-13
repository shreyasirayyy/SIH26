"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Calendar,
  CalendarClock,
  Check,
  CheckCheck,
  CheckCircle2,
  Clock,
  Edit3,
  Filter,
  Lock,
  MessageCircle,
  MessageSquare,
  PhoneCall,
  Plus,
  RefreshCw,
  Send,
  Sparkles,
  UserCheck,
  X,
  XCircle,
} from "lucide-react";
import { Card, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { caseService } from "@/services/case";
import { FollowUpItem, FollowUpStatus, useAppStore } from "@/store/useAppStore";
import { CaseRecord } from "@/types";
import { formatDate } from "@/lib/utils";

export default function FollowUpsPage() {
  const [cases, setCases] = useState<CaseRecord[]>([]);
  const followUps = useAppStore((s) => s.followUps);
  const setFollowUps = useAppStore((s) => s.setFollowUps);
  const addFollowUpStore = useAppStore((s) => s.addFollowUp);
  const updateFollowUpStore = useAppStore((s) => s.updateFollowUp);
  const counsellorMessages = useAppStore((s) => s.counsellorMessages);
  const markCounsellorMessageRead = useAppStore((s) => s.markCounsellorMessageRead);
  const replyCounsellorMessage = useAppStore((s) => s.replyCounsellorMessage);

  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"All" | "Action" | "Upcoming" | "Proposed" | "Completed">("All");

  // Schedule Modal / Drawer State
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [caseId, setCaseId] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("11:00");
  const [survivorNotes, setSurvivorNotes] = useState("");
  const [privateNotes, setPrivateNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reschedule proposal modal
  const [reschedulingItem, setReschedulingItem] = useState<FollowUpItem | null>(null);
  const [altDate, setAltDate] = useState("");
  const [altTime, setAltTime] = useState("15:00");
  const [altNote, setAltNote] = useState("");

  // Complete session modal
  const [completingItem, setCompletingItem] = useState<FollowUpItem | null>(null);
  const [completionNotes, setCompletionNotes] = useState("");

  // Quick reply state for survivor messages
  const [activeReplyId, setActiveReplyId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");

  const loadData = async () => {
    setLoading(true);
    try {
      const [casesRes, followUpsRes] = await Promise.all([
        caseService.getMyCases().catch(() => []),
        caseService.getFollowUps().catch(() => []),
      ]);
      setCases(casesRes || []);
      if (followUpsRes && followUpsRes.length > 0) {
        setFollowUps(followUpsRes);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateFollowUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const selectedCase = cases.find((c) => c.id === caseId || c.victimToken === caseId);
    if (!selectedCase || !date) {
      setError("Please select an assigned case and date.");
      return;
    }
    setSubmitting(true);
    try {
      const combinedDateTime = new Date(`${date}T${time || "10:00"}:00`).toISOString();
      const result = await caseService.createFollowUp({
        caseId: selectedCase.id,
        date: combinedDateTime,
        notes: survivorNotes,
        survivorNotes,
        privateNotes,
        status: "PROPOSED",
      });

      const newItem: FollowUpItem = {
        id: result.followUpId,
        caseId: selectedCase.id,
        victimToken: selectedCase.victimToken,
        survivorName: selectedCase.survivorName,
        docket: selectedCase.docket,
        date: combinedDateTime,
        notes: survivorNotes,
        survivorNotes,
        privateNotes,
        status: "PROPOSED",
        initiatedBy: "COUNSELLOR",
        requestedBy: "counsellor",
        createdAt: new Date().toISOString(),
      };

      addFollowUpStore(newItem);
      setShowScheduleModal(false);
      setCaseId("");
      setDate("");
      setSurvivorNotes("");
      setPrivateNotes("");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not schedule this follow-up.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleAcceptReschedule = async (item: FollowUpItem) => {
    if (!item.proposedDate) return;
    try {
      await caseService.updateFollowUp(item.id, {
        status: "CONFIRMED",
        date: item.proposedDate,
        privateNotes: item.privateNotes
          ? `${item.privateNotes} (Accepted survivor reschedule to ${new Date(item.proposedDate).toLocaleString()})`
          : `Accepted survivor reschedule to ${new Date(item.proposedDate).toLocaleString()}`,
      });
      updateFollowUpStore(item.id, {
        status: "CONFIRMED",
        date: item.proposedDate,
      });
    } catch {
      updateFollowUpStore(item.id, {
        status: "CONFIRMED",
        date: item.proposedDate,
      });
    }
  };

  const handleProposeAlternate = async () => {
    if (!reschedulingItem || !altDate) return;
    const combined = new Date(`${altDate}T${altTime || "14:00"}:00`).toISOString();
    try {
      await caseService.updateFollowUp(reschedulingItem.id, {
        status: "PROPOSED",
        date: combined,
        survivorNotes: altNote || reschedulingItem.survivorNotes,
        privateNotes: reschedulingItem.privateNotes,
      });
      updateFollowUpStore(reschedulingItem.id, {
        status: "PROPOSED",
        date: combined,
        survivorNotes: altNote || reschedulingItem.survivorNotes,
      });
    } catch {
      updateFollowUpStore(reschedulingItem.id, {
        status: "PROPOSED",
        date: combined,
      });
    } finally {
      setReschedulingItem(null);
      setAltDate("");
      setAltNote("");
    }
  };

  const handleConfirmDirectly = async (item: FollowUpItem) => {
    try {
      await caseService.updateFollowUp(item.id, { status: "CONFIRMED" });
      updateFollowUpStore(item.id, { status: "CONFIRMED" });
    } catch {
      updateFollowUpStore(item.id, { status: "CONFIRMED" });
    }
  };

  const handleMarkComplete = async () => {
    if (!completingItem) return;
    try {
      await caseService.updateFollowUp(completingItem.id, {
        status: "COMPLETED",
        privateNotes: completionNotes
          ? `${completingItem.privateNotes || ""}\n\n[Completion Notes]: ${completionNotes}`
          : completingItem.privateNotes,
      });
      updateFollowUpStore(completingItem.id, {
        status: "COMPLETED",
        privateNotes: completionNotes
          ? `${completingItem.privateNotes || ""}\n\n[Completion Notes]: ${completionNotes}`
          : completingItem.privateNotes,
      });
    } catch {
      updateFollowUpStore(completingItem.id, { status: "COMPLETED" });
    } finally {
      setCompletingItem(null);
      setCompletionNotes("");
    }
  };

  const handleSendReply = (messageId: string) => {
    if (!replyText.trim()) return;
    replyCounsellorMessage(messageId, replyText.trim());
    setActiveReplyId(null);
    setReplyText("");
  };

  // Filtered Follow-ups
  const filteredFollowUps = useMemo(() => {
    if (tab === "Action") {
      return followUps.filter(
        (f) => f.status === "RESCHEDULE_REQUESTED" || f.status === "REQUESTED"
      );
    }
    if (tab === "Upcoming") {
      return followUps.filter(
        (f) => f.status === "CONFIRMED" || f.status === "ACCEPTED" || f.status === "SCHEDULED"
      );
    }
    if (tab === "Proposed") {
      return followUps.filter((f) => f.status === "PROPOSED");
    }
    if (tab === "Completed") {
      return followUps.filter((f) => f.status === "COMPLETED");
    }
    return followUps;
  }, [followUps, tab]);

  const actionCount = useMemo(
    () => followUps.filter((f) => f.status === "RESCHEDULE_REQUESTED" || f.status === "REQUESTED").length,
    [followUps]
  );
  const confirmedCount = useMemo(
    () => followUps.filter((f) => f.status === "CONFIRMED" || f.status === "ACCEPTED" || f.status === "SCHEDULED").length,
    [followUps]
  );
  const proposedCount = useMemo(
    () => followUps.filter((f) => f.status === "PROPOSED").length,
    [followUps]
  );
  const completedCount = useMemo(
    () => followUps.filter((f) => f.status === "COMPLETED").length,
    [followUps]
  );

  return (
    <div className="mx-auto max-w-5xl space-y-8 pb-16">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-deep-teal">Counsellor Caseload</p>
          <h1 className="mt-1 font-editorial text-3xl font-bold tracking-tight text-text-primary md:text-4xl">
            Bi-directional Follow-ups &amp; Care Sessions
          </h1>
          <p className="mt-1.5 text-sm text-text-secondary">
            Coordinate upcoming check-in appointments, review survivor reschedule requests, and log clinical notes.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="secondary" onClick={loadData} disabled={loading}>
            <RefreshCw size={13} className={loading ? "animate-spin" : ""} /> Refresh
          </Button>
          <Button size="sm" onClick={() => setShowScheduleModal(true)}>
            <Plus size={14} /> Schedule Follow-up
          </Button>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-4">
        <div className="rounded-2xl border border-amber/40 bg-amber/5 p-4 shadow-sm">
          <p className="text-xs font-medium text-[#b67926]">Needs Action / Reschedule</p>
          <p className="mt-2 text-2xl font-bold tracking-tight text-[#b67926]">{actionCount}</p>
          <p className="mt-1 text-[11px] text-text-secondary">Survivor requests response</p>
        </div>
        <div className="rounded-2xl border border-deep-teal/30 bg-pale-sage/10 p-4 shadow-sm">
          <p className="text-xs font-medium text-deep-teal">Confirmed Upcoming</p>
          <p className="mt-2 text-2xl font-bold tracking-tight text-deep-teal">{confirmedCount}</p>
          <p className="mt-1 text-[11px] text-text-secondary">Scheduled sessions</p>
        </div>
        <div className="rounded-2xl border border-border-color bg-[color:var(--surface)] p-4 shadow-sm">
          <p className="text-xs font-medium text-text-secondary">Awaiting Survivor Action</p>
          <p className="mt-2 text-2xl font-bold tracking-tight text-text-primary">{proposedCount}</p>
          <p className="mt-1 text-[11px] text-text-secondary">Notification sent</p>
        </div>
        <div className="rounded-2xl border border-border-color bg-[color:var(--surface)] p-4 shadow-sm">
          <p className="text-xs font-medium text-text-secondary">Sessions Completed</p>
          <p className="mt-2 text-2xl font-bold tracking-tight text-text-primary">{completedCount}</p>
          <p className="mt-1 text-[11px] text-text-secondary">Logged in record</p>
        </div>
      </div>

      {/* Survivor Messages Section if available */}
      {counsellorMessages.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-deep-teal">
              <MessageCircle size={15} /> Direct Survivor Messages ({counsellorMessages.length})
            </h2>
          </div>
          <div className="grid gap-3">
            {counsellorMessages.map((msg) => (
              <Card
                key={msg.id}
                className={`transition-all ${
                  !msg.read ? "border-deep-teal/40 bg-[#f4f9f7]/60" : "bg-[color:var(--surface)]"
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

      {/* Filter Tabs */}
      <div className="flex flex-wrap gap-1 border-b border-border-color pb-3">
        {(
          [
            { key: "All", label: "All Follow-ups", count: followUps.length },
            { key: "Action", label: "Action Needed / Reschedule", count: actionCount },
            { key: "Upcoming", label: "Confirmed & Upcoming", count: confirmedCount },
            { key: "Proposed", label: "Proposed (Pending)", count: proposedCount },
            { key: "Completed", label: "Completed", count: completedCount },
          ] as const
        ).map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-semibold transition-all ${
              tab === t.key
                ? "bg-deep-teal text-white shadow-sm"
                : "bg-[color:var(--surface-subtle)] text-text-secondary hover:text-text-primary"
            }`}
          >
            <span>{t.label}</span>
            <span
              className={`rounded-full px-1.5 py-0.2 text-[10px] font-bold ${
                tab === t.key ? "bg-white/20 text-white" : "bg-border-color/50 text-text-secondary"
              }`}
            >
              {t.count}
            </span>
          </button>
        ))}
      </div>

      {loading && <p className="text-sm text-text-secondary">Loading follow-ups…</p>}

      {!loading && filteredFollowUps.length === 0 && (
        <div className="rounded-2xl border border-dashed border-border-color bg-[color:var(--surface-subtle)] p-12 text-center text-sm text-text-secondary">
          No follow-ups found in this view.
        </div>
      )}

      {/* Follow-up Cards */}
      <div className="grid gap-4">
        {filteredFollowUps.map((f) => {
          const isRescheduleRequested = f.status === "RESCHEDULE_REQUESTED";
          const isProposed = f.status === "PROPOSED";
          const isConfirmed = f.status === "CONFIRMED" || f.status === "ACCEPTED" || f.status === "SCHEDULED";
          const isCompleted = f.status === "COMPLETED";

          return (
            <article
              key={f.id}
              className={`rounded-2xl border p-5 shadow-sm transition-all ${
                isRescheduleRequested
                  ? "border-amber/50 bg-amber/5"
                  : isConfirmed
                  ? "border-deep-teal/30 bg-[color:var(--surface)]"
                  : "border-border-color bg-[color:var(--surface)]"
              }`}
            >
              <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
                <div className="flex items-start gap-3.5">
                  <span
                    className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${
                      isRescheduleRequested
                        ? "bg-amber/20 text-[#b67926]"
                        : isConfirmed
                        ? "bg-deep-teal/15 text-deep-teal"
                        : isCompleted
                        ? "bg-pale-sage/40 text-deep-teal"
                        : "bg-[color:var(--surface-subtle)] text-text-secondary"
                    }`}
                  >
                    {isRescheduleRequested ? (
                      <CalendarClock size={22} />
                    ) : isConfirmed ? (
                      <CheckCheck size={22} />
                    ) : isCompleted ? (
                      <CheckCircle2 size={22} />
                    ) : (
                      <Clock size={22} />
                    )}
                  </span>

                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-base text-text-primary">{f.survivorName}</span>
                      <span className="font-mono text-xs text-text-secondary">{f.docket}</span>
                      <Badge
                        tone={
                          isRescheduleRequested
                            ? "amber"
                            : isConfirmed
                            ? "teal"
                            : isCompleted
                            ? "sage"
                            : "peach"
                        }
                      >
                        {f.status}
                      </Badge>
                      {f.initiatedBy === "SURVIVOR" && (
                        <span className="rounded-full bg-border-color/60 px-2 py-0.5 text-[10px] font-bold text-text-secondary">
                          Survivor Initiated
                        </span>
                      )}
                    </div>

                    <p className="text-xs font-medium text-text-primary flex items-center gap-1.5 pt-0.5">
                      <Calendar size={13} className="text-deep-teal" />
                      Session Time: <strong>{new Date(f.date).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })}</strong>
                    </p>

                    {/* Reschedule banner if requested by survivor */}
                    {isRescheduleRequested && f.proposedDate && (
                      <div className="mt-2.5 rounded-xl border border-amber/40 bg-amber/10 p-3 text-xs">
                        <p className="font-bold text-[#b67926] flex items-center gap-1">
                          <CalendarClock size={14} /> Survivor Requested Alternate Time:
                        </p>
                        <p className="mt-1 font-semibold text-text-primary text-sm">
                          {new Date(f.proposedDate).toLocaleString([], { dateStyle: "full", timeStyle: "short" })}
                        </p>
                        {f.rescheduledReason && (
                          <p className="mt-1 text-xs text-text-secondary italic">
                            Reason: &ldquo;{f.rescheduledReason}&rdquo;
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-wrap items-center gap-2 shrink-0 md:self-start">
                  <Link
                    href={`/counsellor/cases/${f.victimToken}`}
                    className="inline-flex items-center gap-1 rounded-xl border border-border-color bg-[color:var(--surface)] px-3 py-1.5 text-xs font-semibold text-text-primary hover:bg-[color:var(--surface-subtle)] transition-all"
                  >
                    View Case
                  </Link>

                  {isRescheduleRequested && (
                    <>
                      <Button
                        size="sm"
                        variant="primary"
                        onClick={() => handleAcceptReschedule(f)}
                      >
                        <Check size={13} /> Accept New Time
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => {
                          setReschedulingItem(f);
                          setAltDate(f.date.slice(0, 10));
                        }}
                      >
                        Propose Other Time
                      </Button>
                    </>
                  )}

                  {isProposed && (
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => handleConfirmDirectly(f)}
                    >
                      <Check size={13} /> Confirm Now
                    </Button>
                  )}

                  {isConfirmed && (
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => {
                        setCompletingItem(f);
                        setCompletionNotes("");
                      }}
                    >
                      <CheckCircle2 size={13} /> Mark Completed
                    </Button>
                  )}
                </div>
              </div>

              {/* Dual Notes Section */}
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {/* Survivor Visible Notes */}
                <div className="rounded-xl bg-[color:var(--surface-subtle)] p-3 text-xs border border-border-color/60">
                  <p className="font-semibold text-deep-teal flex items-center gap-1">
                    <MessageSquare size={13} /> Shared Agenda (Survivor Visible)
                  </p>
                  <p className="mt-1 text-text-primary">
                    {f.survivorNotes || f.notes || "Standard check-in session and wellbeing review."}
                  </p>
                </div>

                {/* Private Clinical Notes */}
                <div className="rounded-xl bg-[color:var(--surface-subtle)] p-3 text-xs border border-border-color/60">
                  <p className="font-semibold text-text-secondary flex items-center gap-1">
                    <Lock size={13} /> Private Clinical Preparation Note
                  </p>
                  <p className="mt-1 text-text-primary italic">
                    {f.privateNotes || "No private notes logged for this session."}
                  </p>
                </div>
              </div>
            </article>
          );
        })}
      </div>

      {/* Schedule Follow-up Modal */}
      {showScheduleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl border border-border-color bg-[color:var(--surface)] p-6 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="font-editorial text-2xl font-bold text-text-primary">
                Schedule Follow-up Session
              </h3>
              <button
                onClick={() => setShowScheduleModal(false)}
                className="rounded-lg p-1 text-text-secondary hover:bg-[color:var(--surface-subtle)]"
              >
                <X size={18} />
              </button>
            </div>
            <p className="mt-1 text-xs text-text-secondary">
              Proposed appointments send an in-app confirmation notification to the survivor.
            </p>

            <form onSubmit={handleCreateFollowUp} className="mt-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-text-primary mb-1">
                  Assigned Case:
                </label>
                <select
                  value={caseId}
                  onChange={(e) => setCaseId(e.target.value)}
                  className="w-full rounded-xl border border-border-color bg-[color:var(--surface-subtle)] px-3 py-2.5 text-xs text-text-primary outline-none focus:border-deep-teal"
                  required
                >
                  <option value="">Select a survivor from your caseload...</option>
                  {cases.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.survivorName} — {c.docket} ({c.currentStage})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-text-primary mb-1">Date:</label>
                  <Input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-text-primary mb-1">Time:</label>
                  <Input
                    type="time"
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-text-primary mb-1">
                  Shared Session Agenda (Visible to Survivor):
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Discuss your interim compensation claim status and sleep grounding exercises."
                  value={survivorNotes}
                  onChange={(e) => setSurvivorNotes(e.target.value)}
                  className="w-full rounded-xl border border-border-color bg-[color:var(--surface-subtle)] p-2.5 text-xs text-text-primary outline-none focus:border-deep-teal resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-text-primary mb-1 flex items-center gap-1">
                  <Lock size={11} /> Private Clinical Note (Counsellor Only):
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Survivor had elevated distress during last hearing. Check emotional stabilization and family support."
                  value={privateNotes}
                  onChange={(e) => setPrivateNotes(e.target.value)}
                  className="w-full rounded-xl border border-border-color bg-[color:var(--surface-subtle)] p-2.5 text-xs text-text-primary outline-none focus:border-deep-teal resize-none"
                />
              </div>

              {error && <p className="text-xs font-medium text-warm-peach">{error}</p>}

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => setShowScheduleModal(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" size="sm" disabled={submitting}>
                  {submitting ? "Sending proposal..." : "Propose Session"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Alternate Time Proposal Modal */}
      {reschedulingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-border-color bg-[color:var(--surface)] p-6 shadow-xl">
            <h3 className="font-editorial text-xl font-bold text-text-primary">
              Propose Alternate Time
            </h3>
            <p className="mt-1 text-xs text-text-secondary">
              Suggest a new date &amp; time for {reschedulingItem.survivorName}.
            </p>

            <div className="mt-4 space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-text-primary mb-1">Date:</label>
                  <Input
                    type="date"
                    value={altDate}
                    onChange={(e) => setAltDate(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-text-primary mb-1">Time:</label>
                  <Input
                    type="time"
                    value={altTime}
                    onChange={(e) => setAltTime(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-text-primary mb-1">
                  Message to Survivor:
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. I am available at 3:00 PM instead. Please let me know if this works."
                  value={altNote}
                  onChange={(e) => setAltNote(e.target.value)}
                  className="w-full rounded-xl border border-border-color bg-[color:var(--surface-subtle)] p-2.5 text-xs text-text-primary outline-none focus:border-deep-teal resize-none"
                />
              </div>
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <Button
                size="sm"
                variant="secondary"
                onClick={() => setReschedulingItem(null)}
              >
                Cancel
              </Button>
              <Button size="sm" onClick={handleProposeAlternate}>
                Send Proposal
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Completion Modal */}
      {completingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-border-color bg-[color:var(--surface)] p-6 shadow-xl">
            <h3 className="font-editorial text-xl font-bold text-text-primary">
              Log Completed Follow-up
            </h3>
            <p className="mt-1 text-xs text-text-secondary">
              Record completion notes and clinical outcome for {completingItem.survivorName}.
            </p>

            <div className="mt-4">
              <label className="block text-xs font-semibold text-text-primary mb-1">
                Clinical Session Notes:
              </label>
              <textarea
                rows={3}
                placeholder="e.g. Session completed via phone. Survivor reported improved sleep and feeling supported before next hearing."
                value={completionNotes}
                onChange={(e) => setCompletionNotes(e.target.value)}
                className="w-full rounded-xl border border-border-color bg-[color:var(--surface-subtle)] p-3 text-xs text-text-primary outline-none focus:border-deep-teal resize-none"
              />
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <Button
                size="sm"
                variant="secondary"
                onClick={() => setCompletingItem(null)}
              >
                Cancel
              </Button>
              <Button size="sm" onClick={handleMarkComplete}>
                Confirm Completed
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

