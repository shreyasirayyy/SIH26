const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

function storageGet(key: string): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(key);
}

export function setSession(accessToken: string) {
  if (typeof window !== "undefined") window.localStorage.setItem("saath_access_token", accessToken);
}

export function getSessionToken() {
  return storageGet("saath_access_token");
}

function clearSession() {
  if (typeof window !== "undefined") window.localStorage.removeItem("saath_access_token");
}

export async function apiRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const request = (token: string | null) => {
    const headers = new Headers(init.headers);
    headers.set("Content-Type", "application/json");
    if (token) headers.set("Authorization", `Bearer ${token}`);
    return fetch(`${API_BASE}${path}`, { ...init, headers });
  };
  let token = getSessionToken();
  let response: Response;
  try { response = await request(token); } catch { throw new Error("SAATH services are temporarily unavailable. Please try again."); }
  if (response.status === 401 && token && path !== "/api/v1/auth/refresh") {
    try {
      const refresh = await fetch(`${API_BASE}/api/v1/auth/refresh`, { method: "POST", headers: { Authorization: `Bearer ${token}` } });
      const refreshed = (await refresh.json()) as { data?: { accessToken?: string } };
      if (!refresh.ok || !refreshed.data?.accessToken) throw new Error("Your session has expired. Please reconnect your case.");
      setSession(refreshed.data.accessToken);
      token = refreshed.data.accessToken;
      response = await request(token);
    } catch (error) {
      clearSession();
      throw error instanceof Error ? error : new Error("Your session has expired. Please reconnect your case.");
    }
  }
  const payload = (await response.json()) as { success?: boolean; data?: T; error?: { message?: string } };
  if (!response.ok || payload.success === false) {
    throw new Error(payload.error?.message ?? `API request failed (${response.status})`);
  }
  return payload.data as T;
}
