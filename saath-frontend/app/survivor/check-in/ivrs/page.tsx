"use client";

import Link from "next/link";
import { ArrowLeft, Check, PhoneCall } from "lucide-react";
import { useState } from "react";
import { aiService } from "@/services/ai";
import { useAppStore } from "@/store/useAppStore";

const STEPS = ["Language", "Question", "Response", "Complete"];

export default function IVRSPage() {
  const [step, setStep] = useState(0);
  const language = useAppStore((store) => store.language);
  const [response, setResponse] = useState<string | null>(null);
  const [requestCall, setRequestCall] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const hindi = language === "Hindi";
  const labels = hindi ? ["भाषा", "सवाल", "जवाब", "पूरा"] : STEPS;

  async function saveCheckIn() {
    setError(null);
    try { await aiService.submitIvrsCheckIn(hindi ? "hi" : "en", { wellbeing: response ?? "skip" }, requestCall); setStep(3); }
    catch { setError(hindi ? "फ़ोन चेक-इन सेव नहीं हो पाया। कृपया फिर कोशिश करें।" : "The phone check-in could not be saved. Please try again."); }
  }

  return <div className="px-5 pb-10 md:px-10 xl:px-14"><Link href="/survivor/check-in" className="inline-flex items-center gap-2 text-sm font-semibold text-text-secondary"><ArrowLeft size={16} /> {hindi ? "चेक-इन" : "Check-in"}</Link><div className="mx-auto mt-8 max-w-3xl"><p className="text-xs font-bold uppercase tracking-[.2em] text-text-secondary">{hindi ? "IVRS चेक-इन" : "IVRS check-in"}</p><h1 className="mt-3 font-display text-4xl text-text-primary md:text-5xl">{hindi ? "फ़ोन पर सहारा" : "Support, by phone."}</h1><p className="mt-4 text-lg text-text-secondary">{hindi ? "जब बोलकर चेक-इन करना आसान लगे, यह विकल्प चुनें।" : "A low-reading-burden check-in for when speaking on a call feels easier."}</p><div className="mt-8 grid grid-cols-4 gap-2">{labels.map((name, index) => <div key={name}><div className={`h-1.5 rounded-full ${index <= step ? "bg-deep-teal" : "bg-border-color"}`} /><p className="mt-2 text-[10px] font-semibold text-text-secondary">{name}</p></div>)}</div><div className="surface mt-10 rounded-3xl p-6 text-center md:p-10"><span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-pale-sage text-deep-teal"><PhoneCall size={25} /></span>{step === 0 && <><h2 className="mt-6 font-display text-3xl text-text-primary">{hindi ? "भाषा चुनी गई" : "Language selected"}</h2><p className="mt-3 text-sm text-text-secondary">{hindi ? "ऊपर के भाषा विकल्प से भाषा बदली जा सकती है।" : "Use the language control in the top header to change this flow."}</p><button onClick={() => setStep(1)} className="mt-6 rounded-full bg-deep-teal px-7 py-3 text-sm font-bold text-white">{hindi ? "आगे बढ़ें" : "Continue"}</button></>}{step === 1 && <><h2 className="mt-6 font-display text-3xl text-text-primary">{hindi ? "आज कैसा महसूस हो रहा है?" : "How are things feeling?"}</h2><p className="mt-3 text-sm text-text-secondary">{hindi ? "कोई एक जवाब चुनें या छोड़ दें।" : "Choose an answer, or skip whenever you want."}</p><div className="mx-auto mt-6 grid max-w-md gap-2"><button onClick={() => { setResponse("heavy"); setStep(2); }} className="rounded-xl border border-border-color px-4 py-3 text-left text-sm hover:border-deep-teal">{hindi ? "आज थोड़ा भारी लग रहा है" : "A little heavy today"}</button><button onClick={() => { setResponse("okay"); setStep(2); }} className="rounded-xl border border-border-color px-4 py-3 text-left text-sm hover:border-deep-teal">{hindi ? "ज़्यादातर ठीक हूँ" : "Mostly okay"}</button><button onClick={() => { setResponse("skip"); setStep(2); }} className="rounded-xl border border-border-color px-4 py-3 text-left text-sm hover:border-deep-teal">{hindi ? "इस सवाल को छोड़ें" : "Skip this question"}</button></div></>}{step === 2 && <><h2 className="mt-6 font-display text-3xl text-text-primary">{hindi ? "क्या आपको counsellor का फ़ोन चाहिए?" : "Would you like a counsellor call?"}</h2><p className="mt-3 text-sm text-text-secondary">{hindi ? "हम counsellor टीम को कॉल का अनुरोध भेज सकते हैं।" : "We can send a call request to the counsellor team."}</p><button onClick={() => setRequestCall(!requestCall)} className={`mt-6 rounded-xl border px-4 py-3 text-sm font-semibold ${requestCall ? "border-deep-teal bg-pale-sage text-deep-teal" : "border-border-color text-text-secondary"}`}>{requestCall ? (hindi ? "✓ कॉल का अनुरोध चुना गया" : "✓ Request a phone call") : (hindi ? "Counsellor से फ़ोन कॉल माँगें" : "Ask for a counsellor phone call")}</button><div><button onClick={() => void saveCheckIn()} className="mt-6 rounded-full bg-deep-teal px-7 py-3 text-sm font-bold text-white">{hindi ? "चेक-इन सेव करें" : "Save check-in"}</button></div></>}{step === 3 && <><h2 className="mt-6 font-display text-3xl text-text-primary">{hindi ? "चेक-इन सेव हो गया" : "Check-in saved"}</h2><p className="mt-3 flex items-center justify-center gap-2 text-sm text-deep-teal"><Check size={16} /> {requestCall ? (hindi ? "Counsellor को फ़ोन कॉल का अनुरोध भेज दिया गया है।" : "A phone-call request was sent to the counsellor team.") : (hindi ? "आपका फ़ोन चेक-इन रिकॉर्ड हो गया है।" : "Your phone check-in was recorded.")}</p></>}</div>{error && <p className="mt-4 text-sm text-warm-peach" role="alert">{error}</p>}</div></div>;
}
