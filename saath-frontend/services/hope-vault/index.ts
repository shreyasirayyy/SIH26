import { apiRequest } from "@/lib/api";

export const hopeVaultService = {
  async getItems() {
    return apiRequest("/api/v1/hope-vault");
  },

  async createItem(payload: { type: string; title: string; content: string }) {
    return apiRequest("/api/v1/hope-vault", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  async deleteItem(id: string) {
    return apiRequest(`/api/v1/hope-vault/${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
  },

  async uploadPhoto(file: File, title: string) {
    const formData = new FormData();
    formData.append("type", "photo");
    formData.append("title", title);
    formData.append("photo", file);

    const token = typeof window !== "undefined" ? window.localStorage.getItem("saath_access_token") : null;
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000"}/api/v1/hope-vault`, {
      method: "POST",
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      body: formData,
    });

    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error?.message ?? "Photo upload failed");
    return payload.data;
  },
};
