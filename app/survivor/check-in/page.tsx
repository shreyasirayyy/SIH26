"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { aiService } from "@/services/ai";

const QUESTIONS: { key: string; label: string }[] = [
  { key: "sleep", label: "How has your sleep been?" },
  { key: "fear", label: "How much fear have you felt?" },
  { key: "intrusion", label: "Any unwanted memories or flashbacks?" },
  { key: "socialConnectedness", label: "How connected do you feel to people around you?" },
  { key: "perceivedSafety", label: "How safe do you feel right now?" },
];

const SCALE = ["1", "2", "3", "4", "5"];

export default function CheckInPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const question = QUESTIONS[step];

  function selectAnswer(value: number) {
    // A direct safety signal should never be treated as an ordinary answer.
    setAnswers((prev) => ({ ...prev, [question.key]: value }));
    if (step < QUESTIONS.length - 1) {
      setStep((s) => s + 1);
    } else {
      finish();
    }
  }

  async function finish() {
    setSubmitting(true);
    await aiService.analyzeCheckIn(answers);
    setSubmitting(false);
    setDone(true);
  }

  if (done) {
    return (
      <div className="px-6 py-10 text-center">
        <p className="text-3xl">🌿</p>
        <h1 className="mt-4 text-lg font-semibold">Thank you for checking in</h1>
        <p className="mt-2 text-text-secondary">
          There&apos;s no right or wrong answer here — just showing up counts.
        </p>
        <Button className="mt-6 w-full" onClick={() => router.push("/survivor")}>
          Back to Home
        </Button>
      </div>
    );
  }

  return (
    <div className="px-6 py-8">
      <div className="mb-6 flex flex-wrap gap-2 rounded-2xl bg-[#f4f6ec] p-2">
        <span className="rounded-xl bg-[#0f766e] px-4 py-2 text-xs font-bold text-white">Text</span>
        <a href="/survivor/check-in/voice" className="rounded-xl px-4 py-2 text-xs font-bold text-[#60706a] hover:bg-white">Voice</a>
        <a href="/survivor/check-in/ivrs" className="rounded-xl px-4 py-2 text-xs font-bold text-[#60706a] hover:bg-white">IVRS</a>
        <a href="/survivor/notifications" className="rounded-xl px-4 py-2 text-xs font-bold text-[#60706a] hover:bg-white">SMS reminders</a>
      </div>
      <div className="flex items-center gap-1.5 mb-6">
        {QUESTIONS.map((_, i) => (
          <div
            key={i}
            className={`h-1.5 flex-1 rounded-full ${i <= step ? "bg-deep-teal" : "bg-border-color"}`}
          />
        ))}
      </div>

      <Card>
        <p className="text-lg font-medium">{question.label}</p>
        <p className="mt-1 text-xs text-text-secondary">1 = not at all &nbsp;·&nbsp; 5 = a great deal</p>
        <div className="mt-5 grid grid-cols-5 gap-2">
          {SCALE.map((n) => (
            <button
              key={n}
              disabled={submitting}
              onClick={() => selectAnswer(Number(n))}
              className="aspect-square rounded-xl border border-border-color bg-white font-semibold hover:border-deep-teal hover:bg-pale-sage/40"
            >
              {n}
            </button>
          ))}
        </div>
      </Card>

      <p className="mt-6 text-xs text-center text-text-secondary">
        Skipping is okay. This is voluntary, always.
      </p>
    </div>
  );
}
