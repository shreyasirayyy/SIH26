import { DEMO_TRAJECTORIES } from "@/data/demo/cases";
import { AiOutput, CheckIn } from "@/types";
import { apiRequest } from "@/lib/api";

// AI service abstraction. Demo implementations only — no real model calls.
// Frontend components must go through this abstraction, never hard-code AI logic.

function delay<T>(value: T, ms = 500): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms));
}

export const aiService = {
  async submitQuickMood(mood: number, label: string) {
    return apiRequest("/api/v1/check-ins/quick-mood", { method: "POST", body: JSON.stringify({ mood, label }) });
  },

  async submitVoiceCheckIn(audio: Blob, language = "en"): Promise<{ id: string; processing?: string }> {
    const form = new FormData();
    form.append("audio", audio, "voice-check-in.webm");
    form.append("language", language);
    const token = typeof window !== "undefined" ? window.localStorage.getItem("saath_access_token") : null;
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000"}/api/v1/check-ins/voice`, {
      method: "POST",
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      body: form,
    });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error?.message ?? "Voice check-in is unavailable");
    return payload.data;
  },

  async submitIvrsCheckIn(language: string, responses: Record<string, string>, requestCounsellorCall = false) {
    return apiRequest("/api/v1/check-ins/ivrs", { method: "POST", body: JSON.stringify({ language, responses, requestCounsellorCall, provider: "simulated" }) });
  },

  async getCounsellorVoiceCheckIns() {
    return apiRequest<Array<{ id: string; victimToken?: string; createdAt: string; transcript?: string }>>("/api/v1/counsellor/voice-checkins");
  },

  async sendTaaraMessage(message: string): Promise<{ reply: string; safetyState: string; suggestedAction: string }> {
    return apiRequest("/api/v1/ai/taara", {
      method: "POST",
      body: JSON.stringify({ message }),
    });
  },

  async analyzeCheckIn(_checkIn: Partial<CheckIn>): Promise<{ acknowledged: boolean }> {
    return apiRequest("/api/v1/check-ins/mood", {
      method: "POST",
      body: JSON.stringify(_checkIn),
    });
  },

  async getDistressTrajectory(victimToken: string): Promise<AiOutput[]> {
    return delay(DEMO_TRAJECTORIES[victimToken]?.aiOutputs ?? [], 300);
  },

  async getCheckInHistory(victimToken: string): Promise<CheckIn[]> {
    return delay(DEMO_TRAJECTORIES[victimToken]?.checkIns ?? [], 300);
  },

  async getLatestEstimate(victimToken: string): Promise<AiOutput | null> {
    const traj = DEMO_TRAJECTORIES[victimToken]?.aiOutputs ?? [];
    return delay(traj.length ? traj[traj.length - 1] : null, 300);
  },

  async getExplanation(victimToken: string): Promise<string[]> {
    const latest = DEMO_TRAJECTORIES[victimToken]?.aiOutputs.at(-1);
    return delay(latest?.contributingSignals ?? [], 200);
  },

  async getRecommendation(victimToken: string): Promise<string> {
    const latest = DEMO_TRAJECTORIES[victimToken]?.aiOutputs.at(-1);
    return delay(latest?.recommendedIntervention ?? "No recommendation available yet.", 200);
  },
};
