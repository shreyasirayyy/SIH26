import { AiOutput, CheckIn, InterventionFeedback } from "@/types";
import { apiRequest } from "@/lib/api";

export const aiService = {
  async createConsent(payload: { monitoring: boolean; voice?: boolean; text?: boolean; behavioural?: boolean; version?: string }) {
    return apiRequest("/api/v1/consents", {
      method: "POST",
      body: JSON.stringify({ monitoring: payload.monitoring, voice: payload.voice ?? false, text: payload.text ?? false, behavioural: payload.behavioural ?? false, version: payload.version ?? "1.0" }),
    });
  },

  async getConsentHistory() {
    return apiRequest("/api/v1/consents");
  },

  async updateMonitoring(action: "pause" | "resume" | "stop", reason?: string) {
    return apiRequest(`/api/v1/monitoring/${action}`, {
      method: "POST",
      body: JSON.stringify({ reason: reason ?? "" }),
    });
  },

  async getCaseProfile(caseId: string) {
    return apiRequest(`/api/v1/cases/${encodeURIComponent(caseId)}`);
  },

  async getCaseTimeline(caseId: string) {
    return apiRequest(`/api/v1/cases/${encodeURIComponent(caseId)}/timeline`);
  },

  async submitMoodCheckIn(payload: Record<string, unknown>) {
    return apiRequest("/api/v1/check-ins/mood", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  async submitQuickMood(mood: number, label: string) {
    return apiRequest("/api/v1/check-ins/quick-mood", { method: "POST", body: JSON.stringify({ mood, label }) });
  },

  async submitTextCheckIn(payload: { text: string; language?: string; victimToken?: string }) {
    return apiRequest("/api/v1/check-ins/text", {
      method: "POST",
      body: JSON.stringify({ ...payload, language: payload.language ?? "en" }),
    });
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

  async getCheckInHistory() {
    return apiRequest("/api/v1/check-ins/history");
  },

  async submitIvrsCheckIn(language: string, responses: Record<string, string>, requestCounsellorCall = false) {
    return apiRequest("/api/v1/check-ins/ivrs", { method: "POST", body: JSON.stringify({ language, responses, requestCounsellorCall, provider: "simulated" }) });
  },

  async getCounsellorVoiceCheckIns() {
    return apiRequest<Array<{ id: string; victimToken?: string; createdAt: string; transcript?: string }>>("/api/v1/counsellor/voice-checkins");
  },

  async sendTaaraMessage(message: string, caseId?: string): Promise<{ reply: string; safetyState: string; suggestedAction: string }> {
    return apiRequest("/api/v1/ai/taara", {
      method: "POST",
      body: JSON.stringify({ message, caseId }),
    });
  },

  async getMonitoring(kind: "distress" | "recovery" | "trends") {
    return apiRequest(`/api/v1/monitoring/${kind}`);
  },

  async getInterventionRecommendations() {
    return apiRequest("/api/v1/interventions/recommendations");
  },

  async startIntervention(payload: { type: string; caseId?: string; metadata?: Record<string, unknown> }) {
    return apiRequest("/api/v1/interventions", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  async submitInterventionFeedback(id: string, payload: { completed: boolean; rating?: number; note?: string }): Promise<InterventionFeedback> {
    return apiRequest<InterventionFeedback>(`/api/v1/interventions/${encodeURIComponent(id)}/feedback`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  async analyzeCheckIn(_checkIn: Partial<CheckIn>): Promise<{ acknowledged: boolean }> {
    return apiRequest("/api/v1/check-ins/mood", {
      method: "POST",
      body: JSON.stringify(_checkIn),
    });
  },

  async getDistressTrajectory(victimToken: string): Promise<AiOutput[]> {
    const result = await apiRequest<{ records?: Array<{ createdAt?: string; distressScore?: number; recoveryScore?: number; confidence?: number; contributingFactors?: Array<{ factor?: string }>; }> }>(`/api/v1/monitoring/distress?victimToken=${encodeURIComponent(victimToken)}`);
    return (result.records ?? []).map((item) => ({
      victimToken,
      timestamp: item.createdAt ?? new Date().toISOString(),
      distressScore: item.distressScore ?? 0,
      recoveryScore: item.recoveryScore ?? 0,
      confidence: (item.confidence ?? 0) >= 0.75 ? "High" : (item.confidence ?? 0) >= 0.5 ? "Moderate" : "Low",
      escalationEstimate: "Stable",
      priorityLevel: "P4",
      insufficientEvidence: (item.confidence ?? 0) < 0.5,
      contributingSignals: (item.contributingFactors ?? []).map((factor) => factor.factor ?? "Signal unavailable"),
      recommendedIntervention: "No recommendation available yet.",
    }));
  },

  async getLatestEstimate(victimToken: string): Promise<AiOutput | null> {
    const trajectory = await this.getDistressTrajectory(victimToken);
    const latest = trajectory.at(-1) ?? null;
    if (!latest) return null;
    try {
      const history = await this.getCheckInHistory();
      if ((history ?? []).length < 2) latest.insufficientEvidence = true;
    } catch {
      // non-fatal
    }
    return latest;
  },

  async getExplanation(victimToken: string): Promise<string[]> {
    const latest = await this.getLatestEstimate(victimToken);
    return latest?.contributingSignals ?? [];
  },

  async getRecommendation(victimToken: string): Promise<string> {
    const latest = await this.getLatestEstimate(victimToken);
    return latest?.recommendedIntervention ?? "No recommendation available yet.";
  },

  async getHopeVault() {
    return apiRequest("/api/v1/hope-vault");
  },

  async createHopeVaultItem(payload: { type: string; title: string; content: string }) {
    return apiRequest("/api/v1/hope-vault", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  async deleteHopeVaultItem(id: string) {
    return apiRequest(`/api/v1/hope-vault/${encodeURIComponent(id)}`, { method: "DELETE" });
  },

  async getSafeCircle() {
    return apiRequest("/api/v1/safe-circle");
  },

  async createSafeCircleItem(payload: { name: string; phone: string; consentToContact: boolean }) {
    return apiRequest("/api/v1/safe-circle", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  async updateSafeCircleItem(id: string, payload: Record<string, unknown>) {
    return apiRequest(`/api/v1/safe-circle/${encodeURIComponent(id)}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
  },

  async deleteSafeCircleItem(id: string) {
    return apiRequest(`/api/v1/safe-circle/${encodeURIComponent(id)}`, { method: "DELETE" });
  },

  async getSupportResources() {
    return apiRequest("/api/v1/support/resources");
  },

  async getCommunityPosts() {
    return apiRequest("/api/v1/community/posts");
  },

  async createCommunityPost(payload: { body: string; language?: string }) {
    return apiRequest("/api/v1/community/posts", {
      method: "POST",
      body: JSON.stringify({ ...payload, language: payload.language ?? "en" }),
    });
  },

  async reportCommunityPost(id: string, reason: string) {
    return apiRequest(`/api/v1/community/posts/${encodeURIComponent(id)}/report`, {
      method: "POST",
      body: JSON.stringify({ reason }),
    });
  },

  async getAdminSummary(scope: "district" | "state" | "national") {
    return apiRequest(`/api/v1/admin/${scope}`);
  },

  async createSafetyAlert(payload: { id?: string; level: string; title: string; caseName: string; docket?: string; reason?: string; confidence?: string; lastContact?: string; }) {
    return apiRequest("/api/v1/alerts", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },
};
