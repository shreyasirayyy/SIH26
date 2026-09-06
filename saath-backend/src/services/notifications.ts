import { AppError } from '../utils/http.js';

/** Generic notification boundary; it is not an authentication mechanism. */
export const normalizePhone = (input: string) => {
  const digits = input.replace(/[^\d+]/g, '');
  const normalized = digits.startsWith('+') ? digits : `+91${digits}`;
  if (!/^\+[1-9]\d{9,14}$/.test(normalized)) throw new AppError(400, 'INVALID_PHONE', 'Enter a valid international phone number.');
  return normalized;
};

export interface NotificationProvider { sendMessage(phone: string, message: string): Promise<void>; }
class DisabledProvider implements NotificationProvider { async sendMessage() { throw new AppError(503, 'SMS_NOT_CONFIGURED', 'A notification provider is not configured.'); } }
export const notificationProvider: NotificationProvider = new DisabledProvider();

const ESCALATION_TEMPLATES = [
  { day: 0, tone: 'gentle', message: "Hi, just checking in — how are you feeling today? No pressure at all." },
  { day: 3, tone: 'warm', message: "We haven't heard from you in a few days. Whenever you're ready, we're here." },
  { day: 7, tone: 'encouraging', message: "It's been a week — even a small check-in helps us support you better." },
  { day: 14, tone: 'caring-firm', message: "We care about you. Please let us know you're okay when you can." },
];

export function getEscalatedMessage(daysSinceLastCheckin: number) {
  const matched = [...ESCALATION_TEMPLATES].reverse().find(t => daysSinceLastCheckin >= t.day);
  return matched ?? ESCALATION_TEMPLATES[0];
}