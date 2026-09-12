"use client";

// N03 — Crisis interruption flow
// A shared "crisis UI" that replaces whatever screen is currently showing
// whenever a signal says someone might be unsafe right now — a low
// perceived-safety answer, a TAARA safetyState of "urgent_support", etc.
// Pulled out as its own component so every flow that can detect a crisis
// renders the exact same, reviewed UI instead of each screen growing its
// own copy of it.
import { useAppStore } from "@/store/useAppStore";
import { aiService } from "@/services/ai";

const HELPLINE = "+91-0000000000"; // TODO: replace with real helpline from config
const COUNSELLOR_CONTACT = "+91-9876543210"; // TODO: fetch assigned counsellor contact from case data

interface CrisisInterruptProps {
  /** Short internal reason, used only in the alert sent to counsellors. */
  reason: string;
  /** Called when the person says they're okay and wants to go back. */
  onDismiss: () => void;
}

export function CrisisInterrupt({ reason, onDismiss }: CrisisInterruptProps) {
  const survivorName = useAppStore((state) => state.survivorName);
  const docket = useAppStore((state) => state.docket);

  async function escalateToCounsellor() {
    try {
      await aiService.createSafetyAlert({
        level: "P1",
        title: "Immediate safety check-in",
        caseName: survivorName ?? "Unknown",
        docket: docket ?? undefined,
        reason,
        confidence: "High",
        lastContact: "Just now",
      });
    } catch (e) {
      // TODO: handle/report backend failure; keep UX gentle
      console.error(e);
    }
    onDismiss();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-white p-6">
      <div className="max-w-xl rounded-2xl border border-border-color bg-white p-6">
        <h2 className="font-display text-2xl">You're not alone.</h2>
        <p className="mt-3 text-sm text-text-secondary">
          If you're feeling unsafe right now, you can call a helpline or reach your counsellor directly. We can also let a counsellor know right away.
        </p>
        <div className="mt-6 flex flex-col gap-3">
          <a className="inline-flex items-center justify-center rounded-full bg-warm-peach px-4 py-3 text-center font-semibold text-white" href={`tel:${HELPLINE}`}>
            Call helpline
          </a>
          <a className="inline-flex items-center justify-center rounded-full bg-deep-teal px-4 py-3 text-center font-semibold text-white" href={`tel:${COUNSELLOR_CONTACT}`}>
            Call assigned counsellor
          </a>
          <button onClick={() => void escalateToCounsellor()} className="rounded-full bg-[#a15f4e] px-4 py-3 text-white font-semibold">
            Connect to counsellor now
          </button>
          <a className="mt-2 text-center text-sm text-text-secondary" href="/survivor/just-stay">
            Continue to Just Stay
          </a>
          <button onClick={onDismiss} className="text-center text-xs text-text-secondary underline">
            I'm okay, go back
          </button>
        </div>
      </div>
    </div>
  );
}