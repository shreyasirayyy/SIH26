"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ProgressDots } from "@/components/ui/ProgressDots";
import { useAppStore } from "@/store/useAppStore";

export default function ConsentPage() {
  const router = useRouter();
  const setConsent = useAppStore((s) => s.setConsent);
  const [monitoringConsent, setMonitoringConsent] = useState(false);
  const [voiceConsent, setVoiceConsent] = useState(false);

  function handleContinue() {
    setConsent(monitoringConsent, voiceConsent);
    router.push("/survivor");
  }

  return (
    <div className="flex-1 flex flex-col px-6 py-8 max-w-md mx-auto w-full">
      <ProgressDots step={4} total={5} />
      <h1 className="mt-6 text-xl font-semibold">Before you continue</h1>

      <Card className="mt-5">
        <p className="text-sm text-text-secondary">SAATH may use:</p>
        <ul className="mt-2 space-y-1.5 text-sm list-disc list-inside text-text-primary">
          <li>your registered case context</li>
          <li>your voluntary check-ins</li>
          <li>your optional voice/text signals</li>
          <li>engagement information</li>
        </ul>
        <p className="mt-3 text-sm text-text-secondary">Purpose:</p>
        <ul className="mt-2 space-y-1.5 text-sm list-disc list-inside text-text-primary">
          <li>understand changes in distress</li>
          <li>support you over time</li>
          <li>recommend appropriate support</li>
          <li>notify authorised professionals when required, according to your consent and safety policy</li>
        </ul>
      </Card>

      <label className="mt-5 flex items-start gap-3 text-sm">
        <input
          type="checkbox"
          className="mt-1 h-5 w-5 accent-deep-teal"
          checked={monitoringConsent}
          onChange={(e) => setMonitoringConsent(e.target.checked)}
        />
        I understand and consent to monitoring.
      </label>

      <label className="mt-3 flex items-start gap-3 text-sm text-text-secondary">
        <input
          type="checkbox"
          className="mt-1 h-5 w-5 accent-deep-teal"
          checked={voiceConsent}
          onChange={(e) => setVoiceConsent(e.target.checked)}
        />
        I consent to optional voice-feature analysis (you can change this later).
      </label>

      <button className="mt-4 text-sm text-deep-teal underline text-left">View Privacy Notice</button>

      <div className="flex-1" />

      <Button size="lg" className="w-full mt-6" disabled={!monitoringConsent} onClick={handleContinue}>
        Continue to SAATH
      </Button>
      <p className="mt-2 text-center text-xs text-text-secondary">
        You can pause or stop monitoring at any time from Settings.
      </p>
    </div>
  );
}
