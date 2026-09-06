"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { aiService } from "@/services/ai";
import { useAppStore } from "@/store/useAppStore";

const GENERIC_QUESTIONS = [
  ["sleep", "How has your sleep been?", "आपकी नींद कैसी रही है?"],
  ["fear", "How much fear have you felt?", "आपने कितना डर महसूस किया है?"],
  ["intrusion", "Any unwanted memories or flashbacks?", "क्या कोई अनचाही यादें या फ्लैशबैक आए?"],
  ["socialConnectedness", "How connected do you feel to people around you?", "आप अपने आसपास के लोगों से कितना जुड़ा हुआ महसूस करते हैं?"],
  ["perceivedSafety", "How safe do you feel right now?", "आप इस समय कितनी सुरक्षा महसूस करते हैं?"],
] as const;

const SCALE = ["1", "2", "3", "4", "5"];

export default function CheckInPage() {
  const router = useRouter();
  const docket = useAppStore((state) => state.docket);
  const language = useAppStore((state) => state.language);
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [showSafetyModal, setShowSafetyModal] = useState(false);

  const hindi = language === "Hindi";
  const questions = docket ? [["caseConcern", "How are you feeling about your case or next hearing?", "आप अपने केस या अगली सुनवाई को लेकर कैसा महसूस कर रहे हैं?"] as const, ...GENERIC_QUESTIONS] : GENERIC_QUESTIONS;
  const question = questions[step];

  function selectAnswer(value: number) {
    const nextAnswers = { ...answers, [question[0]]: value };
    setAnswers(nextAnswers);
    if (step < questions.length - 1) {
      setStep((s) => s + 1);
    } else {
      void finish(nextAnswers);
    }
  }

  async function finish(finalAnswers: Record<string, number>) {
    setSubmitting(true);
    try {
      await aiService.analyzeCheckIn({
        mood: finalAnswers.mood ?? 3,
        sleep: finalAnswers.sleep,
        fear: finalAnswers.fear,
        intrusion: finalAnswers.intrusion,
        perceivedSafety: finalAnswers.perceivedSafety,
        socialConnectedness: finalAnswers.socialConnectedness,
      });
    } catch {
      setSubmitting(false);
      return;
    }
    setSubmitting(false);
    // Crisis / safety escalation: if perceivedSafety is at lowest value, surface gentle interstitial
    const triggered = finalAnswers.perceivedSafety === 1;
    if (triggered) {
      setShowSafetyModal(true);
      return;
    }
    setDone(true);
  }

  async function escalateToCounsellor() {
    const docket = useAppStore.getState().docket;
    const survivorName = useAppStore.getState().survivorName ?? "Unknown";
    // create a P1 alert so counsellors can see it in their queue (backend stub)
    try {
      await aiService.createSafetyAlert({ level: "P1", title: "Immediate safety check-in", caseName: survivorName, docket: docket ?? undefined, reason: "Perceived safety reported as lowest", confidence: "High", lastContact: "Just now" });
    } catch (e) {
      // TODO: handle/report backend failure; keep UX gentle
      console.error(e);
    }
    setShowSafetyModal(false);
    setDone(true);
  }

  if (done) {
    return (
      <div className="px-6 py-10 text-center">
        <p className="text-3xl">🌿</p>
        <h1 className="mt-4 text-lg font-semibold">{hindi ? "चेक-इन के लिए धन्यवाद" : "Thank you for checking in"}</h1>
        <p className="mt-2 text-text-secondary">
          {hindi ? "यहाँ कोई सही या गलत जवाब नहीं है — आपका यहाँ होना ही काफ़ी है।" : "There&apos;s no right or wrong answer here — just showing up counts."}
        </p>
        <Button className="mt-6 w-full" onClick={() => router.push("/survivor")}>
          {hindi ? "होम पर वापस जाएँ" : "Back to Home"}
        </Button>
      </div>
    );
  }

  // Safety interstitial
  if (showSafetyModal) {
    const helpline = "+91-0000000000"; // TODO: replace with real helpline from config
    const counsellorContact = "+91-9876543210"; // TODO: fetch assigned counsellor contact from case data
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-white p-6">
        <div className="max-w-xl rounded-2xl border border-border-color bg-white p-6">
          <h2 className="font-display text-2xl">You’re not alone.</h2>
          <p className="mt-3 text-sm text-text-secondary">If you’re feeling unsafe right now, you can call a helpline or reach your counsellor directly. We can also let a counsellor know right away.</p>
          <div className="mt-6 flex flex-col gap-3">
            <a className="inline-flex items-center justify-center rounded-full bg-warm-peach px-4 py-3 text-center font-semibold text-white" href={`tel:${helpline}`}>Call helpline</a>
            <a className="inline-flex items-center justify-center rounded-full bg-deep-teal px-4 py-3 text-center font-semibold text-white" href={`tel:${counsellorContact}`}>Call assigned counsellor</a>
            <button onClick={() => void escalateToCounsellor()} className="rounded-full bg-[#a15f4e] px-4 py-3 text-white font-semibold">Connect to counsellor now</button>
            <a className="mt-2 text-center text-sm text-text-secondary" href="/survivor/just-stay">Continue to Just Stay</a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="px-6 py-8">
      <div className="mb-5 flex flex-wrap gap-1.5 rounded-xl bg-greenish-cream p-1.5">
        <span className="rounded-xl bg-[#0f766e] px-4 py-2 text-xs font-bold text-white">{hindi ? "टेक्स्ट" : "Text"}</span>
        <a href="/survivor/check-in/voice" className="rounded-xl px-4 py-2 text-xs font-bold text-[#60706a] hover:bg-white">{hindi ? "आवाज़" : "Voice"}</a>
        <a href="/survivor/check-in/ivrs" className="rounded-xl px-4 py-2 text-xs font-bold text-[#60706a] hover:bg-white">IVRS</a>
        <a href="/survivor/check-in/sms-reminders" className="rounded-xl px-4 py-2 text-xs font-bold text-[#60706a] hover:bg-white">{hindi ? "SMS सूचनाएँ" : "SMS reminders"}</a>
      </div>
      <div className="flex items-center gap-1.5 mb-6">
        {questions.map((_, i) => (
          <div
            key={i}
            className={`h-1.5 flex-1 rounded-full ${i <= step ? "bg-deep-teal" : "bg-border-color"}`}
          />
        ))}
      </div>

      <Card className="p-4 sm:p-5">
        <p className="text-base font-semibold sm:text-lg">{hindi ? question[2] : question[1]}</p>
        <p className="mt-1 text-xs text-text-secondary">{hindi ? "1 = बिल्कुल नहीं · 5 = बहुत अधिक" : "1 = not at all · 5 = a great deal"}</p>
        <div className="mt-4 grid grid-cols-5 gap-2">
          {SCALE.map((n) => (
            <button
              key={n}
              disabled={submitting}
              onClick={() => selectAnswer(Number(n))}
              className="min-h-12 rounded-xl border border-border-color bg-white px-2 font-semibold text-text-primary hover:border-deep-teal hover:bg-pale-sage/40 sm:min-h-14"
            >
              {n}
            </button>
          ))}
        </div>
      </Card>

      <p className="mt-6 text-xs text-center text-text-secondary">
        {hindi ? "छोड़ना ठीक है। यह हमेशा आपकी इच्छा से है।" : "Skipping is okay. This is voluntary, always."}
      </p>
    </div>
  );
}
