"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { CaseRecord, Role } from "@/types";

export type MonitoringState = "active" | "paused" | "stopped";
export type AccessibilityTextSize = "small" | "default" | "large" | "extra-large";
export type AccessibilityTextAlign = "left" | "center" | "justify";

export interface AccessibilitySettings {
  textSize: AccessibilityTextSize;
  pageZoom: number;
  darkMode: boolean;
  highContrastLight: boolean;
  invertColors: boolean;
  grayscale: boolean;
  softTones: boolean;
  vividTones: boolean;
  readableFont: boolean;
  atkinsonFont: boolean;
  lineHeight: number;
  letterSpacing: number;
  wordSpacing: number;
  textAlign: AccessibilityTextAlign;
  bigCursor: boolean;
  noAnimations: boolean;
  stopMotion: boolean;
  epilepsySafe: boolean;
  muteSounds: boolean;
}

export const defaultAccessibilitySettings: AccessibilitySettings = {
  textSize: "default",
  pageZoom: 100,
  darkMode: false,
  highContrastLight: false,
  invertColors: false,
  grayscale: false,
  softTones: false,
  vividTones: false,
  readableFont: true,
  atkinsonFont: false,
  lineHeight: 1.5,
  letterSpacing: 0,
  wordSpacing: 0,
  textAlign: "left",
  bigCursor: false,
  noAnimations: false,
  stopMotion: false,
  epilepsySafe: false,
  muteSounds: false,
};

interface AppState {
  role: Role | null;
  victimToken: string | null;
  docket: string | null;
  survivorName: string | null;
  accessToken: string | null;
  currentCase: CaseRecord | null;
  consentGiven: boolean;
  voiceConsent: boolean;
  monitoring: MonitoringState;
  language: string;
  accessibility: AccessibilitySettings;

  setSurvivorSession: (opts: {
    victimToken: string;
    docket: string;
    survivorName: string;
    accessToken?: string;
    caseRecord?: CaseRecord | null;
  }) => void;
  setStaffRole: (role: Role) => void;
  setConsent: (consent: boolean, voiceConsent: boolean) => void;
  setMonitoring: (state: MonitoringState) => void;
  setLanguage: (lang: string) => void;
  setAccessibility: (patch: Partial<AccessibilitySettings>) => void;
  resetAccessibility: () => void;
  logout: () => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      role: null,
      victimToken: null,
      docket: null,
      survivorName: null,
      accessToken: null,
      currentCase: null,
      consentGiven: false,
      voiceConsent: false,
      monitoring: "active",
      language: "English",
      accessibility: defaultAccessibilitySettings,

      setSurvivorSession: ({ victimToken, docket, survivorName, accessToken, caseRecord }) =>
        set({
          role: "survivor",
          victimToken,
          docket,
          survivorName,
          accessToken: accessToken ?? get().accessToken,
          currentCase: caseRecord ?? get().currentCase,
        }),
      setStaffRole: (role) => set({ role }),
      setConsent: (consentGiven, voiceConsent) => set({ consentGiven, voiceConsent }),
      setMonitoring: (monitoring) => set({ monitoring }),
      setLanguage: (language) => set({ language }),
      setAccessibility: (patch) =>
        set((state) => {
          const next = { ...state.accessibility, ...patch };

          if (patch.darkMode === true) {
            next.highContrastLight = false;
          }
          if (patch.highContrastLight === true) {
            next.darkMode = false;
          }
          if (patch.invertColors === true) {
            next.grayscale = false;
          }
          if (patch.grayscale === true) {
            next.invertColors = false;
          }
          if (patch.noAnimations === true || patch.stopMotion === true || patch.epilepsySafe === true) {
            next.noAnimations = true;
            next.stopMotion = true;
          }

          return { accessibility: next };
        }),
      resetAccessibility: () => set({ accessibility: defaultAccessibilitySettings }),
      logout: () =>
        set({
          role: null,
          victimToken: null,
          docket: null,
          survivorName: null,
          accessToken: null,
          currentCase: null,
          consentGiven: false,
          voiceConsent: false,
          monitoring: "active",
          accessibility: defaultAccessibilitySettings,
        }),
    }),
    { name: "saath-demo-session" }
  )
);
