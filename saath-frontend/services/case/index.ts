import { CaseRecord, TimelineEvent } from "@/types";
import { apiRequest, getOtpChallenge, setOtpChallenge, setSession } from "@/lib/api";

export const caseService = {
  async verifyDocket(docket: string, mobile: string): Promise<{ ok: boolean; message?: string }> {
    if (mobile.replace(/\D/g, "").length < 10) {
      return { ok: false, message: "Enter a valid 10-digit registered mobile number." };
    }
    try {
      const result = await apiRequest<{ challengeId: string }>("/api/v1/auth/request-otp", {
        method: "POST",
        body: JSON.stringify({ phone: `+91${mobile.replace(/\D/g, "")}`, docket }),
      });
      setOtpChallenge(result.challengeId, `+91${mobile.replace(/\D/g, "")}`);
      return { ok: true };
    } catch (error) {
      return { ok: false, message: error instanceof Error ? error.message : "Unable to request a verification code." };
    }
  },

  async verifyOtp(otp: string): Promise<{ ok: boolean }> {
    const { challengeId, phone } = getOtpChallenge();
    if (challengeId && phone) {
      try {
        const result = await apiRequest<{ accessToken: string }>("/api/v1/auth/verify-otp", {
          method: "POST",
          body: JSON.stringify({ challengeId, otp: otp.trim(), phone }),
        });
        setSession(result.accessToken);
        return { ok: true };
      } catch {
        return { ok: false };
      }
    }
    return { ok: false };
  },

  async connectCase(docket: string, mobile: string): Promise<CaseRecord> {
    return apiRequest<CaseRecord>("/api/v1/cases/connect", {
      method: "POST",
      body: JSON.stringify({ docket, registeredMobile: `+91${mobile.replace(/\D/g, "")}` }),
    });
  },

  async getCaseByDocket(docket: string): Promise<CaseRecord | null> {
    try {
      return await apiRequest<CaseRecord>(`/api/v1/cases/${encodeURIComponent(docket.trim())}`);
    } catch { return null; }
  },

  async getCase(victimToken: string): Promise<CaseRecord | null> {
    try {
      return await apiRequest<CaseRecord>(`/api/v1/cases/${encodeURIComponent(victimToken)}`);
    } catch { return null; }
  },

  async getTimeline(victimToken: string): Promise<TimelineEvent[]> {
    try {
      return await apiRequest<TimelineEvent[]>(`/api/v1/cases/${encodeURIComponent(victimToken)}/timeline`);
    } catch { return []; }
  },

  async listAllCases(): Promise<CaseRecord[]> {
    return apiRequest<CaseRecord[]>("/api/v1/counsellor/cases");
  },
};
