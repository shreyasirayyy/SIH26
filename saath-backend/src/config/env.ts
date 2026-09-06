import 'dotenv/config';
import { z } from 'zod';

const schema = z.object({
  NODE_ENV: z.enum(['development','test','production']).default('development'), PORT: z.coerce.number().int().positive().default(4000),
  FRONTEND_ORIGIN: z.string().default('http://localhost:3000'), CORS_ORIGINS: z.string().optional(), DATA_MODE: z.enum(['memory','supabase']).default('memory'),
  SUPABASE_URL: z.string().url().optional(), SUPABASE_PUBLISHABLE_KEY: z.string().optional(), SUPABASE_SECRET_KEY: z.string().optional(), SUPABASE_JWKS_URL: z.string().url().optional(),
  SMS_PROVIDER: z.string().default('console'), SMS_API_KEY: z.string().optional(), SMS_ACCOUNT_SID: z.string().optional(), SMS_AUTH_TOKEN: z.string().optional(), SMS_SENDER_ID: z.string().optional(), SMS_FROM_NUMBER: z.string().optional(),
  AI_PROVIDER: z.string().default('fallback'), AI_API_KEY: z.string().optional(), GROQ_MODEL: z.string().default('openai/gpt-oss-20b'), ML_SERVICE_URL: z.string().url().optional(),
  JWT_SECRET: z.string().min(32).default('development-only-change-me-please-32-chars'), JWT_EXPIRES_IN: z.string().default('8h'), ALLOW_DEV_STAFF_TOKEN: z.coerce.boolean().default(false), UPLOAD_MAX_BYTES: z.coerce.number().default(10485760), LOG_LEVEL: z.string().default('info')
});
export const env = schema.parse(process.env);
export const corsOrigins = (env.CORS_ORIGINS ?? env.FRONTEND_ORIGIN).split(',').map((x) => x.trim()).filter(Boolean);
