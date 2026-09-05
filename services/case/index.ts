import { DEMO_CASES, DEMO_TIMELINE } from "@/data/demo/cases";
import { CaseRecord, TimelineEvent } from "@/types";

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
    return delay({ ok: true });
  },

  async requestOtp(): Promise<{ ok: boolean; demoOtp: string }> {
    // Mock SMS gateway — demo OTP is always shown on-screen (no real SMS credentials used).
    return delay({ ok: true, demoOtp: "482913" });
  },

  async verifyOtp(otp: string): Promise<{ ok: boolean }> {
    return delay({ ok: otp.trim() === "482913" || otp.trim().length === 6 });
  },

  async getCaseByDocket(docket: string): Promise<CaseRecord | null> {
    const found = DEMO_CASES.find((c) => c.docket.toLowerCase() === docket.trim().toLowerCase());
    return delay(found ?? null, 400);
  },

  async getCase(victimToken: string): Promise<CaseRecord | null> {
    const found = DEMO_CASES.find((c) => c.victimToken === victimToken);
    return delay(found ?? null, 300);
  },

  async getTimeline(victimToken: string): Promise<TimelineEvent[]> {
    return delay(DEMO_TIMELINE[victimToken] ?? [], 300);
  },

  async listAllCases(): Promise<CaseRecord[]> {
    return delay(DEMO_CASES, 300);
  },
};
