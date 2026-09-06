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
