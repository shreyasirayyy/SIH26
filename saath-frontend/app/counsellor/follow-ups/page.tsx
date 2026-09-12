"use client";

import { useEffect, useState } from "react";
import { Card, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { caseService } from "@/services/case";
import { useAppStore } from "@/store/useAppStore";
import { CaseRecord } from "@/types";
import { Check, ClipboardList } from "lucide-react";

// NOTE: creating a follow-up hits the real backend
// (POST /api/v1/counsellor/follow-ups) and is stored server-side. But the
// backend doesn't currently expose a GET endpoint to list follow-ups back,
// so the list below is kept in this browser's session (persisted to
// localStorage via the app store) rather than fetched fresh from the
// server. Once the backend adds a GET /api/v1/counsellor/follow-ups route,
// swap the initial load here for a real fetch.
export default function FollowUpsPage() {
  const cases = useAppStoreCases();
  const followUps = useAppStore((s) => s.followUps);
  const addFollowUp = useAppStore((s) => s.addFollowUp);
  const markFollowUpComplete = useAppStore((s) => s.markFollowUpComplete);

  const [caseId, setCaseId] = useState("");
  const [date, setDate] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  const upcoming = followUps.filter((f) => f.status === "SCHEDULED");
  const completed = followUps.filter((f) => f.status === "COMPLETED");

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <div>
        <h1 className="text-xl font-semibold">Follow-ups</h1>
        <p className="mt-1 text-sm text-text-secondary">Schedule and track counsellor follow-ups for your cases.</p>
      </div>

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
            <Card key={f.id} className="flex items-start justify-between gap-4">
              <div className="flex gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-pale-sage/50 text-deep-teal">
                  <ClipboardList size={18} />
                </span>
                <div>
                  <p className="font-medium">{f.survivorName}</p>
                  <p className="text-xs text-text-secondary font-mono">{f.docket}</p>
                  <p className="mt-1 text-xs text-text-secondary">
                    Due {new Date(f.date).toLocaleDateString()}
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
                  <p className="font-medium">{f.survivorName}</p>
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
