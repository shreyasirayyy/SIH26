import { AppError } from '../utils/http.js';

export const normalizeEmail = (input: string) => {
  const trimmed = input.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) throw new AppError(400, 'INVALID_EMAIL', 'Enter a valid email address.');
  return trimmed;
};

export interface NotificationProvider {
  sendEmail(email: string, subject: string, message: string): Promise<void>;
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