"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { CaseRecord, CounsellorProfile, Role } from "@/types";

export type MonitoringState = "active" | "paused" | "stopped";
export type AccessibilityTextSize = "small" | "default" | "large" | "extra-large";
export type AccessibilityTextAlign = "left" | "center" | "justify";

export type SahayakMessage = {
  role: "user" | "assistant";
  text: string;
};

export interface FollowUpItem {
  id: string;
  caseId: string;
  victimToken: string;
  survivorName: string;
  docket: string;
  date: string;
  notes?: string;
  status: "SCHEDULED" | "COMPLETED";
  createdAt: string;
}

export const defaultSahayakConversation: SahayakMessage[] = [
  { role: "assistant", text: "Hi, I am Sahayak. I am here to listen. How have things been with your case or your day?" },
];

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
  counsellorProfile: CounsellorProfile | null;
  consentGiven: boolean;
  voiceConsent: boolean;
  monitoring: MonitoringState;
  language: string;
  accessibility: AccessibilitySettings;
  sahayakConversation: SahayakMessage[];
  followUps: FollowUpItem[];

  setSurvivorSession: (opts: {
    victimToken: string;
    docket: string;
    survivorName: string;
    accessToken?: string;
    caseRecord?: CaseRecord | null;
  }) => void;
  setStaffRole: (role: Role) => void;
  setCounsellorProfile: (profile: CounsellorProfile | null) => void;
  setConsent: (consent: boolean, voiceConsent: boolean) => void;
  setMonitoring: (state: MonitoringState) => void;
  setLanguage: (lang: string) => void;
  setAccessibility: (patch: Partial<AccessibilitySettings>) => void;
  resetAccessibility: () => void;
  appendSahayakConversation: (messages: SahayakMessage[]) => void;
  resetSahayakConversation: () => void;
  addFollowUp: (item: FollowUpItem) => void;
  markFollowUpComplete: (id: string) => void;
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
      counsellorProfile: null,
      consentGiven: false,
      voiceConsent: false,
      monitoring: "active",
      language: "English",
      accessibility: defaultAccessibilitySettings,
      sahayakConversation: defaultSahayakConversation,
      followUps: [],

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
      setCounsellorProfile: (counsellorProfile) => set({ counsellorProfile }),
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
      appendSahayakConversation: (messages) =>
        set((state) => ({
          sahayakConversation: [...state.sahayakConversation, ...messages],
        })),
      resetSahayakConversation: () => set({ sahayakConversation: defaultSahayakConversation }),
      addFollowUp: (item) => set((state) => ({ followUps: [item, ...state.followUps] })),
      markFollowUpComplete: (id) =>
        set((state) => ({
          followUps: state.followUps.map((f) => (f.id === id ? { ...f, status: "COMPLETED" } : f)),
        })),
      logout: () =>
        set({
          role: null,
          victimToken: null,
          docket: null,
          survivorName: null,
          accessToken: null,
          currentCase: null,
          counsellorProfile: null,
          consentGiven: false,
          voiceConsent: false,
          monitoring: "active",
          accessibility: defaultAccessibilitySettings,
          sahayakConversation: defaultSahayakConversation,
        }),
    }),
    { name: "saath-demo-session" }
  )
);
