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

export function setOtpChallenge(challengeId: string, phone: string) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem("saath_otp_challenge", challengeId);
  window.localStorage.setItem("saath_otp_phone", phone);
}

export function getOtpChallenge() {
  return { challengeId: storageGet("saath_otp_challenge"), phone: storageGet("saath_otp_phone") };
}

export async function apiRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set("Content-Type", "application/json");
  const token = getSessionToken();
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const response = await fetch(`${API_BASE}${path}`, { ...init, headers });
  const payload = (await response.json()) as { success?: boolean; data?: T; error?: { message?: string } };
  if (!response.ok || payload.success === false) {
    throw new Error(payload.error?.message ?? `API request failed (${response.status})`);
  }
  return payload.data as T;
}
