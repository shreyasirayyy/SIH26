"use client";

import { useState } from "react";
import { Heart, X } from "lucide-react";
import { aiService } from "@/services/ai";
import { Button } from "@/components/ui/Button";

export default function InterventionFeedback({ activity }: { activity: string }) {
  const [sent, setSent] = useState<null | boolean>(null);
  const [loading, setLoading] = useState(false);

  async function send(helpful: boolean) {
    if (loading) return;
    setLoading(true);
    try {
      await aiService.submitInterventionFeedback(activity, { completed: helpful, rating: helpful ? 5 : 1 });
      setSent(helpful);
    } catch (e) {
      console.error(e);
      setSent(false);
    } finally {
      setLoading(false);
    }
  }

  if (sent !== null) {
    return (
      <div className="mt-6 text-center text-sm text-text-secondary">
        {sent ? "Thanks — glad it helped." : "No worries — take your time."}
      </div>
    );
  }

  return (
    <div className="mt-6 border-t border-border-color pt-6 text-center">
      <p className="text-sm font-semibold text-text-secondary">Did this help?</p>
      <div className="mt-3 flex items-center justify-center gap-3">
        <Button onClick={() => void send(true)} className="inline-flex items-center gap-2 rounded-full bg-pale-sage/40 px-4 py-2 text-sm font-semibold text-deep-teal" disabled={loading}>
          <Heart size={14} /> This helped
        </Button>
        <Button variant="ghost" onClick={() => void send(false)} className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold text-text-secondary" disabled={loading}>
          <X size={14} /> Not right now
        </Button>
      </div>
    </div>
  );
}
