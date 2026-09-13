import { CaseRecord, CounsellorProfile, TimelineEvent, AdminReport, AdminTrends, CounsellorSummary } from "@/types";
import { apiRequest, setSession, getSessionToken } from "@/lib/api";
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

  // The backend now scopes this to only the cases assigned to the
  // authenticated counsellor, so despite the name this is really "my cases".
  async listAllCases(): Promise<CaseRecord[]> {
    return apiRequest<CaseRecord[]>("/api/v1/counsellor/cases");
  },

  async getMyCases(): Promise<CaseRecord[]> {
    return apiRequest<CaseRecord[]>("/api/v1/counsellor/cases");
  },

  async createFollowUp(payload: {
    caseId: string;
    date: string;
    notes?: string;
    privateNotes?: string;
    survivorNotes?: string;
    status?: string;
  }): Promise<{ followUpId: string }> {
    return apiRequest<{ followUpId: string }>("/api/v1/counsellor/follow-ups", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  async getFollowUps(): Promise<any[]> {
    return apiRequest<any[]>("/api/v1/counsellor/follow-ups");
  },

  async updateFollowUp(id: string, payload: {
    status?: string;
    date?: string;
    notes?: string;
    privateNotes?: string;
    survivorNotes?: string;
  }): Promise<any> {
    return apiRequest<any>(`/api/v1/counsellor/follow-ups/${id}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
  },

  async getSurvivorFollowUps(): Promise<any[]> {
    return apiRequest<any[]>("/api/v1/survivor/follow-ups");
  },

  async survivorFollowUpAction(id: string, payload: {
    action: "accept" | "reschedule";
    proposedDate?: string;
    notes?: string;
  }): Promise<any> {
    return apiRequest<any>(`/api/v1/follow-ups/${id}/survivor-action`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },
};

export const counsellorService = {
  async login(email: string, password: string): Promise<CounsellorProfile> {
    const result = await apiRequest<{ accessToken: string; counsellor: CounsellorProfile }>(
      "/api/v1/auth/counsellor-login",
      { method: "POST", body: JSON.stringify({ email: email.trim(), password }) }
    );
    setSession(result.accessToken);
    useAppStore.getState().setCounsellorProfile(result.counsellor);
    return result.counsellor;
  },

  async getMe(): Promise<CounsellorProfile> {
    const profile = await apiRequest<CounsellorProfile>("/api/v1/counsellor/me");
    useAppStore.getState().setCounsellorProfile(profile);
    return profile;
  },
};

export const staffService = {
  async getTrends(): Promise<AdminTrends> {
    return apiRequest<AdminTrends>("/api/v1/admin/trends");
  },

  async getDistressStats() {
    return apiRequest("/api/v1/admin/distress-stats");
  },

  async getRecoveryStats() {
    return apiRequest("/api/v1/admin/recovery-stats");
  },

  async getOperationalMetrics() {
    return apiRequest("/api/v1/admin/operational-metrics");
  },

  async getCounsellors(): Promise<CounsellorSummary[]> {
    return apiRequest<CounsellorSummary[]>("/api/v1/admin/counsellors");
  },

  // Full bundled report — the single source of truth for Overview/Cases/Reports pages.
  // This endpoint intentionally returns the raw report body (it doubles as a
  // downloadable file, hence Content-Disposition: attachment) instead of the
  // usual { success, data } envelope — so it can't go through apiRequest().
  async getReport(): Promise<AdminReport> {
    const token = getSessionToken();
    const base = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
    const response = await fetch(`${base}/api/v1/admin/reports?scope=all`, {
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    });
    if (!response.ok) throw new Error(`Unable to load report (status ${response.status})`);
    return response.json() as Promise<AdminReport>;
  },
};
