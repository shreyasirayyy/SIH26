import { AppError } from '../utils/http.js';

export const normalizeEmail = (input: string) => {
  const trimmed = input.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) throw new AppError(400, 'INVALID_EMAIL', 'Enter a valid email address.');
  return trimmed;
};

export const normalizePhone = (input: string) => {
  const trimmed = input.trim();
  if (!trimmed) throw new AppError(400, 'INVALID_PHONE', 'Enter a valid phone number.');
  return trimmed;
};

export interface NotificationProvider {
  sendEmail(email: string, subject: string, message: string): Promise<void>;
  sendMessage(phone: string, message: string): Promise<void>;
}

class EmailJsProvider implements NotificationProvider {
  async sendEmail(email: string, subject: string, message: string) {
    const res = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        service_id: process.env.EMAILJS_SERVICE_ID,
        template_id: process.env.EMAILJS_TEMPLATE_ID,
        user_id: process.env.EMAILJS_PUBLIC_KEY,
        accessToken: process.env.EMAILJS_PRIVATE_KEY,
        template_params: { to_email: email, subject, message },
      }),
    });
    if (!res.ok) throw new AppError(502, 'EMAIL_SEND_FAILED', 'Could not send email.');
  }

  async sendMessage(phone: string, message: string) {
    // SMS delivery is not yet wired to a provider in this demo backend, so keep the
    // contract explicit and fail fast if the route is invoked before a provider is added.
    void phone;
    void message;
    throw new AppError(501, 'SMS_PROVIDER_UNAVAILABLE', 'SMS delivery is not configured in this backend.');
  }
}

export const notificationProvider: NotificationProvider = new EmailJsProvider();

export async function deliverToContact(contact: { email?: string }, subject: string, message: string) {
  const results: { channel: 'email'; ok: boolean; error?: string }[] = [];
  if (contact.email) {
    try { await notificationProvider.sendEmail(contact.email, subject, message); results.push({ channel: 'email', ok: true }); }
    catch (error) { results.push({ channel: 'email', ok: false, error: error instanceof Error ? error.message : 'unknown error' }); }
  }
  return results;
}