import { apiRequest } from "@/lib/api";

export const notificationService = {
  async getNotifications(): Promise<Array<{ id?: string; read?: boolean }>> {
    return apiRequest("/api/v1/notifications");
  },

  async markRead(id: string) {
    return apiRequest(`/api/v1/notifications/${encodeURIComponent(id)}/read`, { method: "PATCH" });
  },

  async sendSMS(phone: string, message: string): Promise<{ status: string; channel: string }> {
    return apiRequest("/api/v1/notifications/sms", {
      method: "POST",
      body: JSON.stringify({ phone, message }),
    });
  },
};
