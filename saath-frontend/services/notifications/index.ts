import { apiRequest } from "@/lib/api";
import { NotificationItem } from "@/types";

export const notificationService = {
  async getNotifications(): Promise<NotificationItem[]> {
    return apiRequest<NotificationItem[]>("/api/v1/notifications");
  },

  async markRead(id: string): Promise<{ id: string; read: boolean }> {
    return apiRequest<{ id: string; read: boolean }>(`/api/v1/notifications/${encodeURIComponent(id)}/read`, { method: "PATCH" });
  },

  async markAllRead(): Promise<{ markedAllRead: boolean; count: number }> {
    return apiRequest<{ markedAllRead: boolean; count: number }>("/api/v1/notifications/mark-all-read", { method: "POST" });
  },

  async sendSMS(phone: string, message: string): Promise<{ status: string; channel: string }> {
    return apiRequest("/api/v1/notifications/sms", {
      method: "POST",
      body: JSON.stringify({ phone, message }),
    });
  },
};

