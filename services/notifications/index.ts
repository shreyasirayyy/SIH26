// Mock notification service. No real SMS/email credentials are used anywhere here.

function delay<T>(value: T, ms = 300): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms));
}

export const notificationService = {
  async sendSMS(_to: string, message: string): Promise<{ ok: boolean }> {
    console.log("[mock-sms]", message);
    return delay({ ok: true });
  },
  async sendCounsellorAlert(counsellor: string, message: string): Promise<{ ok: boolean }> {
    console.log("[mock-counsellor-alert]", counsellor, message);
    return delay({ ok: true });
  },
};
