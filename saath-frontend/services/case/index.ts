import { CaseRecord, TimelineEvent } from "@/types";
import { apiRequest, setSession } from "@/lib/api";

export const caseService = {
  async verifyDocket(docket: string): Promise<{ ok: boolean; message?: string }> {
    try {
      const result = await apiRequest<{ case: CaseRecord; accessToken: string }>("/api/v1/cases/connect", {
        method: "POST",
        body: JSON.stringify({ docket }),
      });
      setSession(result.accessToken);
      return { ok: true };
    } catch (error) {
      return { ok: false, message: error instanceof Error ? error.message : "Unable to request a verification code." };
    }
  },

  async connectCase(docket: string): Promise<CaseRecord> {
    const result = await apiRequest<{ case: CaseRecord; accessToken: string }>("/api/v1/cases/connect", { method: "POST", body: JSON.stringify({ docket }) });
    setSession(result.accessToken);
    return result.case;
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
