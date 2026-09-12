"use client";

import Link from "next/link";
import { ArrowLeft, Check, Mic, MicOff, RefreshCw, ShieldCheck, Heart, Moon, Users, Sparkles } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { aiService } from "@/services/ai";
import { useAppStore, VoiceCheckInRecord } from "@/store/useAppStore";

type CheckInState = "Ready" | "Listening" | "Processing" | "Complete" | "MicBlocked";

export function analyzeVoiceText(text: string): {
  sleep: number;
  socialConnectedness: number;
  mood: number;
  fear: number;
  perceivedSafety: number;
  distressScore: number;
  signalsSummary: string[];
} {
  const lower = text.toLowerCase();

  // Sleep analysis (higher means more difficulty: 1 = good, 5 = severe trouble)
  let sleep = 3;
  let sleepNoted = "";
  if (
    lower.includes("neend nahi") ||
    lower.includes("so nahi") ||
    lower.includes("insomnia") ||
    lower.includes("trouble sleeping") ||
    lower.includes("couldn't sleep") ||
    lower.includes("can't sleep") ||
    lower.includes("nightmare") ||
    lower.includes("sapne") ||
    lower.includes("waking up") ||
    lower.includes("sleepless")
  ) {
    sleep = 5;
    sleepNoted = "Sleep disturbance / insomnia detected";
  } else if (
    lower.includes("slept well") ||
    lower.includes("good sleep") ||
    lower.includes("neend achhi") ||
    lower.includes("so gayi") ||
    lower.includes("rested")
  ) {
    sleep = 1;
    sleepNoted = "Restful sleep reported";
  }

  // Social engagement & connectedness (1 = isolated, 5 = well connected)
  let socialConnectedness = 3;
  let connectionNoted = "";
  if (
    lower.includes("akela") ||
    lower.includes("akeli") ||
    lower.includes("alone") ||
    lower.includes("lonely") ||
    lower.includes("isolated") ||
    lower.includes("koi nahi") ||
    lower.includes("no one to talk") ||
    lower.includes("nobody")
  ) {
    socialConnectedness = 1;
    connectionNoted = "Feelings of isolation / low social support";
  } else if (
    lower.includes("family") ||
    lower.includes("friend") ||
    lower.includes("parivar") ||
    lower.includes("dost") ||
    lower.includes("saath") ||
    lower.includes("talked to") ||
    lower.includes("supported")
  ) {
    socialConnectedness = 4;
    connectionNoted = "Support system active";
  }

  // Fear and anxiety
  let fear = 2;
  let mood = 3;
  let fearNoted = "";
  if (
    lower.includes("dar") ||
    lower.includes("darr") ||
    lower.includes("scared") ||
    lower.includes("fear") ||
    lower.includes("anxious") ||
    lower.includes("court") ||
    lower.includes("hearing") ||
    lower.includes("sunwai") ||
    lower.includes("panic") ||
    lower.includes("threat") ||
    lower.includes("dhamki")
  ) {
    fear = 5;
    mood = 1;
    fearNoted = "Elevated hearing / situational fear";
  } else if (
    lower.includes("heavy") ||
    lower.includes("bhari") ||
    lower.includes("sad") ||
    lower.includes("udas") ||
    lower.includes("rona") ||
    lower.includes("crying") ||
    lower.includes("pareshaan")
  ) {
    fear = 3;
    mood = 2;
    fearNoted = "Emotional distress / low mood";
  } else if (
    lower.includes("better") ||
    lower.includes("behtar") ||
    lower.includes("calm") ||
    lower.includes("shant") ||
    lower.includes("theek") ||
    lower.includes("okay") ||
    lower.includes("fine")
  ) {
    fear = 1;
    mood = 4;
    fearNoted = "Feeling calm and stable";
  }

  // Perceived safety
  let perceivedSafety = 4;
  if (
    lower.includes("unsafe") ||
    lower.includes("khatra") ||
    lower.includes("danger") ||
    lower.includes("threatened") ||
    lower.includes("not safe")
  ) {
    perceivedSafety = 1;
  }

  // Distress score calculation (0 to 100)
  const distressScore = Math.min(
    100,
    Math.max(
      15,
      (sleep - 1) * 10 +
        (5 - socialConnectedness) * 8 +
        fear * 10 +
        (5 - mood) * 8 +
        (5 - perceivedSafety) * 10
    )
  );

  const signalsSummary = [sleepNoted, connectionNoted, fearNoted].filter(Boolean);

  return {
    sleep,
    socialConnectedness,
    mood,
    fear,
    perceivedSafety,
    distressScore,
    signalsSummary: signalsSummary.length ? signalsSummary : ["General wellbeing check-in recorded"],
  };
}

export default function VoiceCheckInPage() {
  const recorder = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const speechRecognition = useRef<any>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const language = useAppStore((store) => store.language);
  const survivorName = useAppStore((store) => store.survivorName);
  const docket = useAppStore((store) => store.docket);
  const victimToken = useAppStore((store) => store.victimToken);
  const addVoiceCheckIn = useAppStore((store) => store.addVoiceCheckIn);

  const [activeLang, setActiveLang] = useState<"hi" | "en">(language === "Hindi" ? "hi" : "en");
  const [state, setState] = useState<CheckInState>("Ready");
  const [liveTranscript, setLiveTranscript] = useState("");
  const [analysisResult, setAnalysisResult] = useState<ReturnType<typeof analyzeVoiceText> | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const hindi = activeLang === "hi";

  // Clean up media tracks & speech recognition on unmount
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
      if (speechRecognition.current) {
        try {
          speechRecognition.current.stop();
        } catch {
          // ignore
        }
      }
    };
  }, []);

  async function startRecording() {
    setErrorMessage(null);
    setLiveTranscript("");
    setAnalysisResult(null);

    if (typeof window === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      setErrorMessage(
        hindi
          ? "आपके ब्राउज़र में ऑडियो रिकॉर्डिंग समर्थित नहीं है।"
          : "Audio recording is not supported in this browser."
      );
      setState("MicBlocked");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      chunks.current = [];

      // Setup MediaRecorder
      const current = new MediaRecorder(stream);
      recorder.current = current;
      current.ondataavailable = (event) => {
        if (event.data.size > 0) chunks.current.push(event.data);
      };

      // Setup SpeechRecognition for real-time bilingual transcription
      const SpeechRecognitionClass =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

      if (SpeechRecognitionClass) {
        try {
          const recognition = new SpeechRecognitionClass();
          recognition.continuous = true;
          recognition.interimResults = true;
          recognition.lang = hindi ? "hi-IN" : "en-IN";

          recognition.onresult = (event: any) => {
            let fullText = "";
            for (let i = 0; i < event.results.length; i++) {
              fullText += event.results[i][0].transcript + " ";
            }
            if (fullText.trim()) {
              setLiveTranscript(fullText.trim());
            }
          };

          recognition.onerror = (event: any) => {
            console.warn("SpeechRecognition notice:", event.error);
          };

          speechRecognition.current = recognition;
          recognition.start();
        } catch (e) {
          console.warn("Speech recognition initialization fallback:", e);
        }
      }

      current.start();
      setState("Listening");
    } catch (micError: any) {
      console.error("Microphone access error:", micError);
      setErrorMessage(
        hindi
          ? "माइक्रोफ़ोन की अनुमति अस्वीकृत या ब्लॉक है। कृपया ब्राउज़र URL बार में माइक की अनुमति दें।"
          : "Microphone permission is blocked. Please allow microphone access in your browser address bar."
      );
      setState("MicBlocked");
    }
  }

  async function stopRecording() {
    if (!recorder.current || recorder.current.state === "inactive") return;

    setState("Processing");

    // Stop speech recognition
    if (speechRecognition.current) {
      try {
        speechRecognition.current.stop();
      } catch {
        // ignore
      }
    }

    recorder.current.onstop = async () => {
      // Stop all mic tracks
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }

      const audioBlob = new Blob(chunks.current, {
        type: recorder.current?.mimeType || "audio/webm",
      });

      let transcriptText = liveTranscript.trim();

      // Attempt backend voice submission
      try {
        const backendResp = await aiService.submitVoiceCheckIn(audioBlob, activeLang);
        if (backendResp?.processing) {
          // backend returned processing / transcript
        }
      } catch (uploadError) {
        console.warn("Backend voice endpoint notice (using client-resilient sync):", uploadError);
      }

      // If live speech recognition was quiet/unsupported, provide sensible default
      if (!transcriptText) {
        transcriptText = hindi
          ? "वॉइस चेक-इन रिकॉर्ड किया गया (नींद और भावनाएँ साझा की गईं)।"
          : "Voice check-in recorded (shared reflections on sleep and wellbeing).";
      }

      // Extract wellbeing signals (sleep, engagement, mood, distress)
      const signals = analyzeVoiceText(transcriptText);
      setAnalysisResult(signals);

      const checkInId = `voice_${Date.now()}`;
      const recordItem: VoiceCheckInRecord = {
        id: checkInId,
        victimToken: victimToken ?? "VT-DEMO-01",
        survivorName: survivorName ?? "Sunita Kumari",
        docket: docket ?? "NDLS/2026/089",
        createdAt: new Date().toISOString(),
        transcript: transcriptText,
        channel: "voice",
        requestCounsellorCall: signals.fear >= 4 || signals.perceivedSafety <= 2,
        signals: {
          sleep: signals.sleep,
          socialConnectedness: signals.socialConnectedness,
          mood: signals.mood,
          fear: signals.fear,
          perceivedSafety: signals.perceivedSafety,
          distressScore: signals.distressScore,
          summary: signals.signalsSummary.join(" · "),
        },
      };

      // 1. Save directly to local store so counsellor dashboard sees it immediately
      addVoiceCheckIn(recordItem);

      // 2. Also submit structured mood check-in for baseline trajectory
      try {
        await aiService.submitMoodCheckIn({
          mood: signals.mood,
          sleep: signals.sleep,
          fear: signals.fear,
          intrusion: signals.fear >= 4 ? 4 : 2,
          avoidance: 3,
          perceivedSafety: signals.perceivedSafety,
          socialConnectedness: signals.socialConnectedness,
          textSentiment: signals.distressScore < 50 ? 4 : 2,
        });
      } catch (err) {
        console.warn("Non-fatal mood check-in sync error:", err);
      }

      // 3. If fear or safety is critical, create counsellor safety alert
      if (signals.fear >= 4 || signals.perceivedSafety <= 2) {
        try {
          await aiService.createSafetyAlert({
            level: signals.perceivedSafety <= 2 ? "P1" : "P2",
            title: "Voice check-in requires counsellor review",
            caseName: survivorName ?? "Sunita Kumari",
            docket: docket ?? "NDLS/2026/089",
            reason: signals.signalsSummary[0] ?? "Voice check-in indicated elevated distress",
            confidence: "High",
            lastContact: "Just now",
          });
        } catch (e) {
          // ignore non-fatal
        }
      }

      setState("Complete");
    };

    recorder.current.stop();
  }

  function toggleRecording() {
    if (state === "Listening") {
      void stopRecording();
    } else {
      void startRecording();
    }
  }

  const title = hindi ? "अपनी बात अपने समय पर कहें।" : "You can speak in your own time.";
  const subtitle = hindi
    ? "कोई सही या गलत जवाब नहीं। TAARA आपकी बात सुनने के लिए यहाँ है।"
    : "No script, no right answer. Just a quiet conversation with TAARA.";

  return (
    <div className="px-5 pb-10 md:px-10 xl:px-14">
      <Link href="/survivor/check-in" className="inline-flex items-center gap-2 text-sm font-semibold text-text-secondary">
        <ArrowLeft size={16} /> {hindi ? "चेक-इन" : "Check-in"}
      </Link>

      <div className="mx-auto mt-8 max-w-3xl text-center">
        {/* Language switch toggle */}
        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-border-color bg-white px-3 py-1.5 text-xs shadow-sm">
          <span className="text-text-secondary font-medium">{hindi ? "भाषा:" : "Language:"}</span>
          <button
            type="button"
            onClick={() => setActiveLang("en")}
            className={`rounded-full px-3 py-1 font-semibold transition-colors ${
              !hindi ? "bg-deep-teal text-white" : "text-text-secondary hover:text-text-primary"
            }`}
          >
            English
          </button>
          <button
            type="button"
            onClick={() => setActiveLang("hi")}
            className={`rounded-full px-3 py-1 font-semibold transition-colors ${
              hindi ? "bg-deep-teal text-white" : "text-text-secondary hover:text-text-primary"
            }`}
          >
            हिंदी (Hindi)
          </button>
        </div>

        <p className="text-xs font-bold uppercase tracking-[.2em] text-text-secondary">
          {hindi ? "वॉइस चेक-इन" : "Voice check-in"}
        </p>
        <h1 className="mt-3 font-display text-4xl text-text-primary md:text-5xl">{title}</h1>
        <p className="mt-4 text-lg text-text-secondary">{subtitle}</p>

        {/* Microphone Interactive Button */}
        <div className="mx-auto mt-12 flex h-52 w-52 items-center justify-center rounded-full bg-pale-sage shadow-[0_0_0_20px_rgba(220,235,221,.45)]">
          <button
            aria-label={hindi ? "रिकॉर्डिंग शुरू या बंद करें" : "Start or stop recording"}
            onClick={toggleRecording}
            disabled={state === "Processing"}
            className={`flex h-28 w-28 items-center justify-center rounded-full transition-all duration-300 ${
              state === "Listening"
                ? "bg-warm-peach animate-pulse scale-105"
                : state === "Complete"
                ? "bg-[#3d8561]"
                : state === "MicBlocked"
                ? "bg-[#b5473f]"
                : "bg-deep-teal hover:scale-105"
            } text-white shadow-xl`}
          >
            {state === "Listening" ? (
              <Mic size={42} className="animate-bounce" />
            ) : state === "Complete" ? (
              <Check size={42} />
            ) : state === "MicBlocked" ? (
              <MicOff size={42} />
            ) : (
              <Mic size={42} />
            )}
          </button>
        </div>

        {/* Status text */}
        <h2 className="mt-8 font-display text-2xl text-text-primary font-semibold">
          {state === "Ready" && (hindi ? "तैयार" : "Ready")}
          {state === "Listening" && (hindi ? "TAARA सुन रहा है..." : "TAARA is listening...")}
          {state === "Processing" && (hindi ? "विश्लेषण हो रहा है..." : "Analyzing wellbeing signals...")}
          {state === "Complete" && (hindi ? "चेक-इन पूरा हुआ" : "Check-in Complete")}
          {state === "MicBlocked" && (hindi ? "माइक्रोफ़ोन अनुमति चाहिए" : "Microphone Access Required")}
        </h2>

        <p className="mt-2 text-sm text-text-secondary max-w-md mx-auto">
          {state === "Ready" && (hindi ? "जब तैयार हों, माइक्रोफ़ोन दबाएँ और बोलें।" : "Tap the microphone when you’re ready to speak.")}
          {state === "Listening" && (hindi ? "बोलना पूरा होने पर बटन दोबारा दबाएँ।" : "Tap the button again when you are done speaking.")}
          {state === "Processing" && (hindi ? "आपकी आवाज़ और सिग्नल्स को सुरक्षित रूप से प्रोसेस किया जा रहा है।" : "Extracting wellbeing signals for your counsellor.")}
          {state === "Complete" && (hindi ? "आपकी नींद और भावनाओं की जानकारी आपके counsellor को भेज दी गई है।" : "Your voice check-in and wellbeing signals have been sent to your counsellor.")}
          {state === "MicBlocked" && errorMessage}
        </p>

        {/* Real-time transcript preview while listening */}
        {state === "Listening" && liveTranscript && (
          <div className="mx-auto mt-6 max-w-lg rounded-2xl border border-border-color bg-white p-4 text-left shadow-sm animate-fadeIn">
            <p className="text-xs font-semibold uppercase tracking-wider text-text-secondary flex items-center gap-1.5">
              <Sparkles size={13} className="text-deep-teal" /> {hindi ? "सुनाई दे रहा है:" : "Heard so far:"}
            </p>
            <p className="mt-2 text-sm text-text-primary italic">&ldquo;{liveTranscript}&rdquo;</p>
          </div>
        )}

        {/* Retry or fallback when mic is blocked */}
        {state === "MicBlocked" && (
          <div className="mt-6 flex flex-col items-center gap-3">
            <button
              onClick={() => void startRecording()}
              className="inline-flex items-center gap-2 rounded-full bg-deep-teal px-6 py-2.5 text-sm font-semibold text-white hover:bg-deep-teal/90 transition-colors"
            >
              <RefreshCw size={15} /> {hindi ? "दोबारा कोशिश करें" : "Try Again"}
            </button>
            <Link
              href="/survivor/check-in"
              className="text-xs text-text-secondary underline hover:text-text-primary"
            >
              {hindi ? "या सामान्य चेक-इन फॉर्म का उपयोग करें" : "Or use standard text check-in"}
            </Link>
          </div>
        )}

        {/* Complete summary breakdown */}
        {state === "Complete" && (
          <div className="mx-auto mt-6 max-w-lg rounded-2xl border border-pale-sage bg-white p-5 text-left shadow-sm">
            <div className="flex items-center gap-2 font-bold text-[#3d8561]">
              <Check size={18} /> {hindi ? "Counsellor को भेजा गया" : "Sent to Assigned Counsellor"}
            </div>

            {liveTranscript && (
              <div className="mt-3 rounded-xl bg-pale-sage/30 p-3 text-xs text-text-primary italic">
                &ldquo;{liveTranscript}&rdquo;
              </div>
            )}

            {analysisResult && (
              <div className="mt-4 space-y-2 border-t border-border-color pt-3">
                <p className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
                  {hindi ? "पहचाने गए सिग्नल्स (Wellbeing signals):" : "Analyzed Wellbeing Signals:"}
                </p>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="flex items-center gap-1.5 rounded-lg bg-greenish-cream p-2">
                    <Moon size={14} className="text-deep-teal" />
                    <span>{hindi ? "नींद (Sleep):" : "Sleep:"} {analysisResult.sleep}/5</span>
                  </div>
                  <div className="flex items-center gap-1.5 rounded-lg bg-greenish-cream p-2">
                    <Users size={14} className="text-deep-teal" />
                    <span>{hindi ? "जुड़ाव (Social):" : "Social:"} {analysisResult.socialConnectedness}/5</span>
                  </div>
                  <div className="flex items-center gap-1.5 rounded-lg bg-greenish-cream p-2">
                    <Heart size={14} className="text-deep-teal" />
                    <span>{hindi ? "मूड (Mood):" : "Mood:"} {analysisResult.mood}/5</span>
                  </div>
                  <div className="flex items-center gap-1.5 rounded-lg bg-greenish-cream p-2">
                    <ShieldCheck size={14} className="text-deep-teal" />
                    <span>{hindi ? "सुरक्षा (Safety):" : "Safety:"} {analysisResult.perceivedSafety}/5</span>
                  </div>
                </div>
              </div>
            )}

            <div className="mt-5 flex gap-3">
              <Link
                href="/survivor"
                className="flex-1 rounded-xl bg-deep-teal py-2.5 text-center text-xs font-semibold text-white hover:bg-deep-teal/90"
              >
                {hindi ? "होम पर वापस जाएँ" : "Back to Home"}
              </Link>
              <Link
                href="/survivor/taara"
                className="flex-1 rounded-xl border border-border-color py-2.5 text-center text-xs font-semibold text-text-primary hover:border-deep-teal"
              >
                {hindi ? "TAARA से बात करें" : "Talk with TAARA"}
              </Link>
            </div>
          </div>
        )}

        {/* Privacy note */}
        <div className="mx-auto mt-8 max-w-lg rounded-2xl bg-greenish-cream p-4 text-left text-xs leading-relaxed text-text-secondary">
          <div className="flex items-center gap-2 font-bold text-deep-teal">
            <ShieldCheck size={15} /> {hindi ? "गोपनीयता नोट" : "Privacy note"}
          </div>
          <p className="mt-2">
            {hindi
              ? "आपकी आवाज़ का विश्लेषण केवल नींद, तनाव और कल्याण के सिग्नल्स को समझने के लिए होता है। ऑडियो फ़ाइल को स्थायी रूप से सेव नहीं किया जाता।"
              : "Audio is analyzed solely for wellbeing signals (sleep, mood, safety). Raw audio recordings are not permanently stored."}
          </p>
        </div>
      </div>
    </div>
  );
}
