"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { Role } from "@/types";

export type MonitoringState = "active" | "paused" | "stopped";

interface AppState {
  role: Role | null;
  victimToken: string | null;
  docket: string | null;
  survivorName: string | null;
  consentGiven: boolean;
  voiceConsent: boolean;
  monitoring: MonitoringState;
  language: string;

  setSurvivorSession: (opts: { victimToken: string; docket: string; survivorName: string }) => void;
  setStaffRole: (role: Role) => void;
  setConsent: (consent: boolean, voiceConsent: boolean) => void;
  setMonitoring: (state: MonitoringState) => void;
  setLanguage: (lang: string) => void;
  logout: () => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      role: null,
      victimToken: null,
      docket: null,
      survivorName: null,
      consentGiven: false,
      voiceConsent: false,
      monitoring: "active",
      language: "English",

      setSurvivorSession: ({ victimToken, docket, survivorName }) =>
        set({ role: "survivor", victimToken, docket, survivorName }),
      setStaffRole: (role) => set({ role }),
      setConsent: (consentGiven, voiceConsent) => set({ consentGiven, voiceConsent }),
      setMonitoring: (monitoring) => set({ monitoring }),
      setLanguage: (language) => set({ language }),
      logout: () =>
        set({
          role: null,
          victimToken: null,
          docket: null,
          survivorName: null,
          consentGiven: false,
          voiceConsent: false,
          monitoring: "active",
        }),
    }),
    { name: "saath-demo-session" }
  )
);
