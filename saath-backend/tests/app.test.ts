import { describe, expect, it, beforeEach } from 'vitest';
import request from 'supertest';
import { app } from '../src/app.js';
import { store } from '../src/db/store.js';

describe('SAATH API',()=>{
 beforeEach(()=>{store.otp.clear(); store.users.clear(); store.records.clear();});
 it('returns a deprecation error for OTP requests',async()=>{const r=await request(app).post('/api/v1/auth/request-otp').send({phone:'9876543210'}); expect(r.status).toBe(410); expect(r.body.error.code).toBe('OTP_DISABLED');});
 it('authenticates a survivor by docket without any mobile step',async()=>{const r=await request(app).post('/api/v1/cases/connect').send({docket:'NHAA-RJ-2026-004821'}); expect(r.status).toBe(200); expect(r.body.data.accessToken).toBeTruthy(); expect(r.body.data.case.docket).toBe('NHAA-RJ-2026-004821');});
 it('requires authentication for case access',async()=>{const r=await request(app).get('/api/v1/cases/case-demo-001'); expect(r.status).toBe(401);});
 it('rejects invalid case connection docket',async()=>{const r=await request(app).post('/api/v1/cases/connect').send({docket:'INVALID-DOCKET'}); expect(r.status).toBe(404); expect(r.body.error.code).toBe('CASE_NOT_FOUND');});
 it('enforces role-based alert access',async()=>{const token=(await request(app).post('/api/v1/auth/staff-token').send({role:'SURVIVOR',staffId:'survivor'})); expect(token.status).toBe(400);});
 it('returns standard health envelope',async()=>{const r=await request(app).get('/health'); expect(r.status).toBe(200); expect(r.body.success).toBe(true); expect(r.body.request_id).toBeTruthy();});
});
