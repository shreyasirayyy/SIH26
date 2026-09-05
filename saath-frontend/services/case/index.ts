import { DEMO_CASES, DEMO_TIMELINE } from "@/data/demo/cases";
import { CaseRecord, TimelineEvent } from "@/types";
import { apiRequest, getOtpChallenge, setOtpChallenge, setSession } from "@/lib/api";

// Synthetic NHAA Integration Adapter (mock).
// Production must replace this with an authorised government API integration.

function delay<T>(value: T, ms = 700): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms));
}

export const caseService = {
  async verifyDocket(docket: string, mobile: string): Promise<{ ok: boolean; message?: string }> {
    const found = DEMO_CASES.find(
      (c) => c.docket.toLowerCase() === docket.trim().toLowerCase()
    );
    if (!found) {
      return delay({ ok: false, message: "We couldn't find a case with that docket number." });
    }
    if (mobile.replace(/\D/g, "").length < 10) {
      return delay({ ok: false, message: "Enter a valid 10-digit registered mobile number." });
    }
    try {
      const result = await apiRequest<{ challengeId: string }>("/api/v1/auth/request-otp", {
        method: "POST",
        body: JSON.stringify({ phone: `+91${mobile.replace(/\D/g, "")}`, docket }),
      });
      setOtpChallenge(result.challengeId, `+91${mobile.replace(/\D/g, "")}`);
      return { ok: true };
    } catch {
      return delay({ ok: true });
    }
  },

  async requestOtp(): Promise<{ ok: boolean; demoOtp: string }> {
    // Mock SMS gateway — demo OTP is always shown on-screen (no real SMS credentials used).
    return delay({ ok: true, demoOtp: "482913" });
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
    return delay({ ok: otp.trim() === "482913" || otp.trim().length === 6 });
  },

  async getCaseByDocket(docket: string): Promise<CaseRecord | null> {
    try {
      return await apiRequest<CaseRecord>(`/api/v1/cases/${encodeURIComponent(docket.trim())}`);
    } catch {
      const found = DEMO_CASES.find((c) => c.docket.toLowerCase() === docket.trim().toLowerCase());
      return delay(found ?? null, 400);
    }
  },

  async getCase(victimToken: string): Promise<CaseRecord | null> {
    try {
      return await apiRequest<CaseRecord>(`/api/v1/cases/${encodeURIComponent(victimToken)}`);
    } catch {
      const found = DEMO_CASES.find((c) => c.victimToken === victimToken);
      return delay(found ?? null, 300);
    }
  },

  async getTimeline(victimToken: string): Promise<TimelineEvent[]> {
    try {
      return await apiRequest<TimelineEvent[]>(`/api/v1/cases/${encodeURIComponent(victimToken)}/timeline`);
    } catch {
      return delay(DEMO_TIMELINE[victimToken] ?? [], 300);
    }
  },

  async listAllCases(): Promise<CaseRecord[]> {
    return delay(DEMO_CASES, 300);
  },
};
