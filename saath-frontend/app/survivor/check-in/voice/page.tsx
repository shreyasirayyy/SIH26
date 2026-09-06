"use client";

import Link from "next/link";
import { ArrowLeft, Check, Mic, ShieldCheck } from "lucide-react";
import { useRef, useState } from "react";
import { aiService } from "@/services/ai";
import { useAppStore } from "@/store/useAppStore";

export default function VoiceCheckInPage() {
  const recorder = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const language = useAppStore((store) => store.language);
  const [state, setState] = useState<"Ready" | "Listening" | "Processing" | "Complete" | "Unavailable">("Ready");
  const hindi = language === "Hindi";

  async function toggleRecording() {
    if (state === "Listening") { recorder.current?.stop(); return; }
    if (!navigator.mediaDevices?.getUserMedia) { setState("Unavailable"); return; }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      chunks.current = [];
      const current = new MediaRecorder(stream);
      recorder.current = current;
      current.ondataavailable = (event) => { if (event.data.size) chunks.current.push(event.data); };
      current.onstop = async () => {
        stream.getTracks().forEach((track) => track.stop());
        setState("Processing");
        try {
          await aiService.submitVoiceCheckIn(new Blob(chunks.current, { type: current.mimeType }), hindi ? "hi" : "en");
          // check for an immediate escalation signal (backend processing may be delayed in real deployments)
          try {
            const victimToken = useAppStore.getState().victimToken;
            if (victimToken) {
              const latest = await aiService.getLatestEstimate(victimToken);
              if (latest && latest.priorityLevel === "P1") {
                // surface friendly interstitial to the survivor
                setState("Complete");
                // TODO: present a full-screen interstitial similar to the text check-in flow
              }
            }
          } catch (e) {
            // ignore
          }
          setState("Complete");
        } catch {
          setState("Unavailable");
        }
      };
      current.start(); setState("Listening");
    } catch { setState("Unavailable"); }
  }

  const title = hindi ? "अपनी बात अपने समय पर कहें।" : "You can speak in your own time.";
  const subtitle = hindi ? "कोई सही या गलत जवाब नहीं। TAARA सुनने के लिए यहाँ है।" : "No script, no right answer. Just a quiet conversation with TAARA.";
  const status = state === "Ready" ? (hindi ? "जब तैयार हों, माइक्रोफ़ोन दबाएँ।" : "Tap the microphone when you’re ready.") : state === "Listening" ? (hindi ? "TAARA सुन रहा है। पूरा होने पर फिर दबाएँ।" : "TAARA is listening. Tap again when you are done.") : state === "Processing" ? (hindi ? "आपकी आवाज़ का विश्लेषण हो रहा है।" : "Uploading your audio for analysis.") : state === "Complete" ? (hindi ? "आपका वॉइस चेक-इन counsellor review के लिए सेव हो गया है।" : "Your voice check-in was saved for counsellor review.") : (hindi ? "माइक्रोफ़ोन या वॉइस विश्लेषण उपलब्ध नहीं है।" : "Microphone or voice analysis is unavailable.");

  return <div className="px-5 pb-10 md:px-10 xl:px-14"><Link href="/survivor/check-in" className="inline-flex items-center gap-2 text-sm font-semibold text-text-secondary"><ArrowLeft size={16} /> {hindi ? "चेक-इन" : "Check-in"}</Link><div className="mx-auto mt-8 max-w-3xl text-center"><p className="text-xs font-bold uppercase tracking-[.2em] text-text-secondary">{hindi ? "वॉइस चेक-इन" : "Voice check-in"}</p><h1 className="mt-3 font-display text-4xl text-text-primary md:text-5xl">{title}</h1><p className="mt-4 text-lg text-text-secondary">{subtitle}</p><div className="mx-auto mt-12 flex h-48 w-48 items-center justify-center rounded-full bg-pale-sage shadow-[0_0_0_20px_rgba(220,235,221,.45)]"><button aria-label={hindi ? "रिकॉर्डिंग शुरू या बंद करें" : "Start or stop recording"} onClick={() => void toggleRecording()} className={`flex h-28 w-28 items-center justify-center rounded-full ${state === "Listening" ? "bg-warm-peach" : "bg-deep-teal"} text-white shadow-xl`}><Mic size={38} /></button></div><h2 className="mt-10 font-display text-3xl text-text-primary">{state}</h2><p className="mt-3 text-sm text-text-secondary">{status}</p><div className="mx-auto mt-8 max-w-lg rounded-2xl bg-greenish-cream p-4 text-left text-xs leading-relaxed text-text-secondary"><div className="flex items-center gap-2 font-bold text-deep-teal"><ShieldCheck size={15} /> {hindi ? "गोपनीयता नोट" : "Privacy note"}</div><p className="mt-2">{hindi ? "आवाज़ का विश्लेषण wellbeing signals के लिए होता है और raw audio सेव नहीं होता।" : "Audio is analyzed for wellbeing signals and raw audio is not retained."}</p></div>{state === "Complete" && <div className="mt-6 flex items-center justify-center gap-2 text-sm font-bold text-deep-teal"><Check size={16} /> {hindi ? "चेक-इन पूरा हुआ" : "Check-in complete"}</div>}</div></div>;
}
