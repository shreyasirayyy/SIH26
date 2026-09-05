import { CaseRecord, TimelineEvent } from "@/types";
import { apiRequest, setOtpChallenge, setSession } from "@/lib/api";
import { useAppStore } from "@/store/useAppStore";

function normalizeCaseResult(result: { case?: CaseRecord; accessToken?: string } | CaseRecord): CaseRecord {
  if (typeof result === "object" && result !== null && "case" in result && result.case) {
    return result.case;
  }
  if (typeof result === "object" && result !== null && "docket" in result && "victimToken" in result) {
    return result as CaseRecord;
  }
  throw new Error("Case response was not in the expected format.");
}

export async function authenticateWithDocket(docket: string): Promise<{ ok: boolean; caseRecord?: CaseRecord; message?: string }> {
  try {
    const result = await apiRequest<{ case?: CaseRecord; accessToken?: string } | CaseRecord>("/api/v1/cases/connect", {
      method: "POST",
      body: JSON.stringify({ docket }),
    });

    const caseRecord = normalizeCaseResult(result);
    const accessToken = "accessToken" in result ? result.accessToken : undefined;

    if (accessToken) {
      setSession(accessToken);
      useAppStore.getState().setSurvivorSession({
        victimToken: caseRecord.victimToken,
        docket: caseRecord.docket,
        survivorName: caseRecord.survivorName,
        accessToken,
        caseRecord,
      });
    }

    return { ok: true, caseRecord };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "Unable to verify this docket number.",
    };
  }
}

export const caseService = {
  async requestOtp(phone: string): Promise<{ ok: boolean; message?: string; challengeId?: string }> {
    try {
      const result = await apiRequest<{ challengeId?: string; expiresAt?: string }>("/api/v1/auth/request-otp", {
        method: "POST",
        body: JSON.stringify({ phone }),
      });
      if (result.challengeId) setOtpChallenge(result.challengeId, phone);
      return { ok: true, challengeId: result.challengeId };
    } catch (error) {
      return { ok: false, message: error instanceof Error ? error.message : "Unable to request a verification code." };
    }
  },

  async verifyOtp(challengeId: string, phone: string, otp: string): Promise<{ ok: boolean; message?: string; accessToken?: string }> {
    try {
      const result = await apiRequest<{ accessToken?: string; user?: { victimToken?: string; role?: string } }>("/api/v1/auth/verify-otp", {
        method: "POST",
        body: JSON.stringify({ challengeId, phone, otp }),
      });
      if (result.accessToken) setSession(result.accessToken);
      return { ok: true, accessToken: result.accessToken };
    } catch (error) {
      return { ok: false, message: error instanceof Error ? error.message : "That code doesn't look right. Please try again." };
    }
  },

  async verifyDocket(docket: string): Promise<{ ok: boolean; message?: string }> {
    const result = await authenticateWithDocket(docket.trim());
    return { ok: result.ok, message: result.message };
  },

  async connectCase(docket: string): Promise<CaseRecord> {
    const result = await authenticateWithDocket(docket.trim());
    if (!result.ok || !result.caseRecord) {
      throw new Error(result.message ?? "Unable to verify this docket number.");
    }
    return result.caseRecord;
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
