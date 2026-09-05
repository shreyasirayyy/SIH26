import { describe, expect, it, beforeEach } from 'vitest';
import request from 'supertest';
import { app } from '../src/app.js';
import { store } from '../src/db/store.js';

describe('SAATH API',()=>{
 beforeEach(()=>{store.otp.clear(); store.users.clear(); store.records.clear();});
 it('requests an OTP without returning the code',async()=>{const r=await request(app).post('/api/v1/auth/request-otp').send({phone:'9876543210'}); expect(r.status).toBe(202); expect(r.body.data.challengeId).toBeTruthy(); expect(JSON.stringify(r.body)).not.toMatch(/\b\d{6}\b/);});
 it('enforces resend cooldown',async()=>{const first=await request(app).post('/api/v1/auth/request-otp').send({phone:'9876543210'}); expect(first.status).toBe(202); const second=await request(app).post('/api/v1/auth/request-otp').send({phone:'9876543210'}); expect(second.status).toBe(429); expect(second.body.error.code).toBe('OTP_RESEND_COOLDOWN');});
 it('rejects invalid and expired-shaped OTP input',async()=>{const r=await request(app).post('/api/v1/auth/verify-otp').send({challengeId:'00000000-0000-0000-0000-000000000000',phone:'9876543210',otp:'123'}); expect(r.status).toBe(400); expect(r.body.error.code).toBe('VALIDATION_ERROR');});
 it('requires authentication for case access',async()=>{const r=await request(app).get('/api/v1/cases/case-demo-001'); expect(r.status).toBe(401);});
 it('rejects invalid case connection mobile',async()=>{const token=(await request(app).post('/api/v1/auth/staff-token').send({role:'COUNSELLOR',staffId:'test'})).body.data.accessToken; const r=await request(app).post('/api/v1/cases/connect').set('Authorization',`Bearer ${token}`).send({docket:'NHAA-RJ-2026-004821',registeredMobile:'9000000000'}); expect(r.status).toBe(404); expect(r.body.error.code).toBe('CASE_NOT_FOUND');});
 it('enforces role-based alert access',async()=>{const token=(await request(app).post('/api/v1/auth/staff-token').send({role:'SURVIVOR',staffId:'survivor'})); expect(token.status).toBe(400);});
 it('returns standard health envelope',async()=>{const r=await request(app).get('/health'); expect(r.status).toBe(200); expect(r.body.success).toBe(true); expect(r.body.request_id).toBeTruthy();});
});
