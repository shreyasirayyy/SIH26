// lib/useSpeech.ts
"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const LANG_CODES = {
  hi: "hi-IN",
  en: "en-IN",
} as const;

export type VoiceGender = "male" | "female";

// Common name hints browsers use for male/female voices.
const FEMALE_HINTS = ["female", "woman", "zira", "susan", "samantha", "victoria", "kalpana", "veena", "heera"];
const MALE_HINTS = ["male", "man", "david", "mark", "daniel", "ravi", "rishi", "hemant"];

function guessGender(voice: SpeechSynthesisVoice): VoiceGender | null {
  const name = voice.name.toLowerCase();
  if (FEMALE_HINTS.some((hint) => name.includes(hint))) return "female";
  if (MALE_HINTS.some((hint) => name.includes(hint))) return "male";
  return null;
}

export function useSpeech() {
  const [speaking, setSpeaking] = useState(false);
  const [enabled, setEnabled] = useState(true);
  const [gender, setGender] = useState<VoiceGender>("female");
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  // Load available voices (they load asynchronously in some browsers).
  useEffect(() => {
    if (typeof window === "undefined" || !window.speechSynthesis) return;

    const loadVoices = () => setVoices(window.speechSynthesis.getVoices());
    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;

    return () => {
      window.speechSynthesis.onvoiceschanged = null;
    };
  }, []);

  const pickVoice = useCallback(
    (language: keyof typeof LANG_CODES, preferredGender: VoiceGender) => {
      const langCode = LANG_CODES[language];
      const langVoices = voices.filter((v) => v.lang === langCode || v.lang.startsWith(langCode.split("-")[0]));
      if (langVoices.length === 0) return null;

      const genderMatch = langVoices.find((v) => guessGender(v) === preferredGender);
      if (genderMatch) return genderMatch;

      // Fall back: try the opposite gender hint, else just the first available voice for that language.
      const anyGenderMatch = langVoices.find((v) => guessGender(v) !== null);
      return anyGenderMatch ?? langVoices[0];
    },
    [voices]
  );

  const speak = useCallback(
    (text: string, language: keyof typeof LANG_CODES = "hi") => {
      if (!enabled) return;
      if (typeof window === "undefined" || !window.speechSynthesis) return;

      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = LANG_CODES[language];
      utterance.rate = 0.85;
      utterance.pitch = 1;

      const chosenVoice = pickVoice(language, gender);
      if (chosenVoice) utterance.voice = chosenVoice;

      utterance.onstart = () => setSpeaking(true);
      utterance.onend = () => setSpeaking(false);
      utterance.onerror = () => setSpeaking(false);

      utteranceRef.current = utterance;
      window.speechSynthesis.speak(utterance);
    },
    [enabled, gender, pickVoice]
  );

  const stop = useCallback(() => {
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    setSpeaking(false);
  }, []);

  const toggleEnabled = useCallback(() => {
    setEnabled((prev) => {
      if (prev) stop();
      return !prev;
    });
  }, [stop]);

  return { speak, stop, speaking, enabled, toggleEnabled, gender, setGender };
}