"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { CaseRecord, CounsellorProfile, NotificationItem, Role } from "@/types";
import { notificationService } from "@/services/notifications";

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
  requestedBy?: "survivor" | "counsellor";
  preferredTime?: string;
}

export interface CounsellorMessageItem {
  id: string;
  caseId?: string;
  victimToken: string;
  survivorName: string;
  docket: string;
  message: string;
  subject?: string;
  urgency?: "routine" | "soon" | "urgent";
  createdAt: string;
  read: boolean;
  repliedAt?: string;
  replyText?: string;
}

export const defaultSahayakConversation: SahayakMessage[] = [
  { role: "assistant", text: "Hi, I am Sahayak. I am here to listen. How have things been with your case or your day?" },
];

export type TaaraMessage = {
  id: string;
  from: "taara" | "user";
  text: string;
  createdAt: string;
};

// A TAARA "session" is one saved conversation thread, so the chat UI can
// show history in a sidebar, reopen a past thread, or delete one — instead
// of there being just a single running conversation per survivor.
export type TaaraSession = {
  id: string;
  title: string;
  messages: TaaraMessage[];
  createdAt: string;
  updatedAt: string;
};

function makeTaaraSessionTitle(text: string): string {
  const clean = text.trim().replace(/\s+/g, " ");
  if (!clean) return "New chat";
  return clean.length > 40 ? `${clean.slice(0, 40)}…` : clean;
}

export interface VoiceCheckInRecord {
  id: string;
  victimToken?: string;
  survivorName?: string;
  docket?: string;
  createdAt: string;
  transcript?: string;
  channel?: "voice" | "ivrs";
  requestCounsellorCall?: boolean;
  signals?: {
    sleep?: number;
    socialConnectedness?: number;
    mood?: number;
    fear?: number;
    perceivedSafety?: number;
    distressScore?: number;
    summary?: string;
  };
}

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
  counsellorMessages: CounsellorMessageItem[];
  // Keyed by victimToken so history stays scoped to whoever is logged in on
  // this device and survives logout/login (persisted via localStorage below).
  // Each owner now holds a list of TAARA chat sessions (history), not just
  // one running conversation, so a session can be opened or deleted.
  taaraConversations: Record<string, TaaraSession[]>;
  activeTaaraSessionId: Record<string, string>;
  voiceCheckIns: VoiceCheckInRecord[];

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
  addCounsellorMessage: (msg: CounsellorMessageItem) => void;
  markCounsellorMessageRead: (id: string) => void;
  replyCounsellorMessage: (id: string, replyText: string) => void;
  addVoiceCheckIn: (checkIn: VoiceCheckInRecord) => void;
  ensureTaaraSession: (ownerKey: string) => string;
  startNewTaaraSession: (ownerKey: string) => string;
  setActiveTaaraSession: (ownerKey: string, sessionId: string) => void;
  appendTaaraMessage: (ownerKey: string, sessionId: string, message: TaaraMessage) => void;
  deleteTaaraSession: (ownerKey: string, sessionId: string) => void;
  notifications: NotificationItem[];
  unreadNotificationCount: number;
  setNotifications: (notifications: NotificationItem[]) => void;
  fetchNotifications: () => Promise<NotificationItem[]>;
  markNotificationRead: (id: string) => Promise<void>;
  markAllNotificationsRead: () => Promise<void>;
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
      counsellorMessages: [],
      taaraConversations: {},
      activeTaaraSessionId: {},
      voiceCheckIns: [],
      notifications: [],
      unreadNotificationCount: 0,

      setNotifications: (notifications) =>
        set({
          notifications,
          unreadNotificationCount: notifications.filter((n) => !n.read).length,
        }),

      fetchNotifications: async () => {
        try {
          const items = await notificationService.getNotifications();
          set({
            notifications: items,
            unreadNotificationCount: items.filter((n) => !n.read).length,
          });
          return items;
        } catch {
          return get().notifications;
        }
      },

      markNotificationRead: async (id: string) => {
        const prev = get().notifications;
        const updated = prev.map((n) => (n.id === id ? { ...n, read: true } : n));
        set({
          notifications: updated,
          unreadNotificationCount: updated.filter((n) => !n.read).length,
        });
        try {
          await notificationService.markRead(id);
        } catch {
          // Keep optimistic update
        }
      },

      markAllNotificationsRead: async () => {
        const prev = get().notifications;
        const updated = prev.map((n) => ({ ...n, read: true }));
        set({
          notifications: updated,
          unreadNotificationCount: 0,
        });
        try {
          await notificationService.markAllRead();
        } catch {
          // Keep optimistic update
        }
      },

      addVoiceCheckIn: (checkIn) =>
        set((state) => ({
          voiceCheckIns: [checkIn, ...state.voiceCheckIns.filter((v) => v.id !== checkIn.id)],
        })),

      setSurvivorSession: ({ victimToken, docket, survivorName, accessToken, caseRecord }) => {
        set({
          role: "survivor",
          victimToken,
          docket,
          survivorName,
          accessToken: accessToken ?? get().accessToken,
          currentCase: caseRecord ?? get().currentCase,
        });
        void get().fetchNotifications();
      },

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
      addCounsellorMessage: (msg) =>
        set((state) => ({
          counsellorMessages: [msg, ...state.counsellorMessages],
        })),
      markCounsellorMessageRead: (id) =>
        set((state) => ({
          counsellorMessages: state.counsellorMessages.map((m) => (m.id === id ? { ...m, read: true } : m)),
        })),
      replyCounsellorMessage: (id, replyText) =>
        set((state) => ({
          counsellorMessages: state.counsellorMessages.map((m) =>
            m.id === id ? { ...m, replyText, repliedAt: new Date().toISOString(), read: true } : m
          ),
        })),
      ensureTaaraSession: (ownerKey) => {
        const state = get();
        const existing = state.taaraConversations[ownerKey] ?? [];
        const activeId = state.activeTaaraSessionId[ownerKey];
        if (activeId && existing.some((s) => s.id === activeId)) return activeId;
        if (existing.length > 0) {
          const mostRecent = [...existing].sort(
            (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
          )[0].id;
          set((s) => ({ activeTaaraSessionId: { ...s.activeTaaraSessionId, [ownerKey]: mostRecent } }));
          return mostRecent;
        }
        return get().startNewTaaraSession(ownerKey);
      },
      startNewTaaraSession: (ownerKey) => {
        const id = crypto.randomUUID();
        const now = new Date().toISOString();
        const session: TaaraSession = { id, title: "New chat", messages: [], createdAt: now, updatedAt: now };
        set((state) => ({
          taaraConversations: {
            ...state.taaraConversations,
            [ownerKey]: [session, ...(state.taaraConversations[ownerKey] ?? [])],
          },
          activeTaaraSessionId: { ...state.activeTaaraSessionId, [ownerKey]: id },
        }));
        return id;
      },
      setActiveTaaraSession: (ownerKey, sessionId) =>
        set((state) => ({
          activeTaaraSessionId: { ...state.activeTaaraSessionId, [ownerKey]: sessionId },
        })),
      appendTaaraMessage: (ownerKey, sessionId, message) =>
        set((state) => {
          const sessions = state.taaraConversations[ownerKey] ?? [];
          const updated = sessions.map((s) => {
            if (s.id !== sessionId) return s;
            const isFirstUserMessage = s.title === "New chat" && message.from === "user";
            return {
              ...s,
              messages: [...s.messages, message],
              updatedAt: message.createdAt,
              title: isFirstUserMessage ? makeTaaraSessionTitle(message.text) : s.title,
            };
          });
          return { taaraConversations: { ...state.taaraConversations, [ownerKey]: updated } };
        }),
      deleteTaaraSession: (ownerKey, sessionId) =>
        set((state) => {
          const remaining = (state.taaraConversations[ownerKey] ?? []).filter((s) => s.id !== sessionId);
          const wasActive = state.activeTaaraSessionId[ownerKey] === sessionId;
          return {
            taaraConversations: { ...state.taaraConversations, [ownerKey]: remaining },
            activeTaaraSessionId: {
              ...state.activeTaaraSessionId,
              [ownerKey]: wasActive ? remaining[0]?.id ?? "" : state.activeTaaraSessionId[ownerKey],
            },
          };
        }),
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
          notifications: [],
          unreadNotificationCount: 0,
        }),
    }),
    {
      name: "saath-demo-session",
      version: 1,
      // v0 stored taaraConversations as Record<ownerKey, TaaraMessage[]> (a
      // single running conversation per survivor). v1 stores it as
      // Record<ownerKey, TaaraSession[]> so history can be listed, opened,
      // and deleted. Wrap any old-shape data into one session per owner
      // instead of dropping it.
      migrate: (persistedState: any, version) => {
        if (version < 1 && persistedState?.taaraConversations) {
          const migrated: Record<string, TaaraSession[]> = {};
          for (const [ownerKey, value] of Object.entries(persistedState.taaraConversations as Record<string, unknown>)) {
            const messages = Array.isArray(value) ? (value as TaaraMessage[]) : [];
            if (messages.length === 0) {
              migrated[ownerKey] = [];
              continue;
            }
            const firstUserMsg = messages.find((m) => m.from === "user");
            migrated[ownerKey] = [
              {
                id: crypto.randomUUID(),
                title: firstUserMsg ? makeTaaraSessionTitle(firstUserMsg.text) : "New chat",
                messages,
                createdAt: messages[0].createdAt,
                updatedAt: messages[messages.length - 1].createdAt,
              },
            ];
          }
          persistedState.taaraConversations = migrated;
          persistedState.activeTaaraSessionId = {};
        }
        return persistedState;
      },
    }
  )
);
