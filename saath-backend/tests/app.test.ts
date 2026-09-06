import { describe, expect, it, beforeEach, vi } from 'vitest';
import request from 'supertest';
import { app } from '../src/app.js';
import { store } from '../src/db/store.js';
import * as ml from '../src/services/ml.js';

const docket = 'NHAA-RJ-2026-004821';
const connect = async () => {
  const response = await request(app).post('/api/v1/cases/connect').send({ reference_id: docket });
  return response.body.data.accessToken as string;
};
const grant = (token:string, consent_type:'wellbeing_monitoring'|'text_analysis'|'voice_analysis', granted=true) => request(app).post('/api/v1/consents').set('Authorization', `Bearer ${token}`).send({ consent_type, granted, version:'test-1' });

describe('SAATH API', () => {
  beforeEach(() => { vi.restoreAllMocks(); store.users.clear(); store.records.clear(); store.blocklist.clear(); });

  it('connects a canonical synthetic docket without a phone or OTP step', async () => {
    const response = await request(app).post('/api/v1/cases/connect').send({ reference_id:docket });
    expect(response.status).toBe(200);
    expect(response.body.data.case.reference_id).toBe(docket);
    expect(response.body.data.case.registeredPhone).toBeUndefined();
    expect(response.body.data.user.phone).toBeUndefined();
  });
  it('rejects an invalid or malformed case reference', async () => {
    expect((await request(app).post('/api/v1/cases/connect').send({ reference_id:'INVALID-DOCKET' })).status).toBe(404);
    expect((await request(app).post('/api/v1/cases/connect').send({ reference_id:'' })).status).toBe(400);
  });
  it('requires authentication for case access', async () => expect((await request(app).get('/api/v1/cases/synthetic-case-002')).status).toBe(401));
  it('records a consent grant and revocation', async () => {
    const token = await connect();
    expect((await grant(token, 'text_analysis')).status).toBe(201);
    expect((await grant(token, 'text_analysis', false)).body.data[0].state).toBe('REVOKED');
    expect((await request(app).get('/api/v1/consents').set('Authorization', `Bearer ${token}`)).body.data).toHaveLength(2);
  });
  it('accepts valid text only with text-analysis consent and reports ML unavailability', async () => {
    vi.spyOn(ml, 'analyzeText').mockResolvedValue({ distressScore:null, recoveryScore:null, confidence:0, escalationProbability:null, modelName:'unavailable', modelVersion:'none', pipelineVersion:'none', signals:{}, contributingFactors:[], crisis:false, insufficientEvidence:true, status:'unavailable' });
    const token = await connect(); await grant(token, 'text_analysis');
    const response = await request(app).post('/api/v1/check-ins/text').set('Authorization', `Bearer ${token}`).send({ text:'I am having a difficult day.', language:'en' });
    expect(response.status).toBe(201); expect(response.body.data.ml.status).toBe('unavailable'); expect(response.body.data.analyticalState).toBe('insufficient_evidence');
  });
  it('rejects invalid text and check-ins without their relevant consent', async () => {
    const token = await connect();
    expect((await request(app).post('/api/v1/check-ins/text').set('Authorization', `Bearer ${token}`).send({ text:'hello' })).status).toBe(403);
    await grant(token, 'text_analysis');
    expect((await request(app).post('/api/v1/check-ins/text').set('Authorization', `Bearer ${token}`).send({ text:'   ' })).status).toBe(400);
  });
  it('does not infer distress when there is no check-in evidence', async () => {
    const token = await connect(); const response = await request(app).get('/api/v1/monitoring/distress').set('Authorization', `Bearer ${token}`);
    expect(response.body.data).toMatchObject({ state:'insufficient_evidence', score:null, summary:'no_data' });
  });
  it('handles a valid voice upload as controlled unavailable when no ML service is configured', async () => {
    const token = await connect(); await grant(token, 'voice_analysis');
    const response = await request(app).post('/api/v1/check-ins/voice').set('Authorization', `Bearer ${token}`).attach('audio', Buffer.from('synthetic audio'), { filename:'checkin.wav', contentType:'audio/wav' });
    expect(response.status).toBe(503); expect(response.body.error.code).toBe('VOICE_ANALYSIS_UNAVAILABLE');
  });
  it('rejects an invalid voice MIME type and oversized voice upload', async () => {
    const token = await connect(); await grant(token, 'voice_analysis');
    const invalid = await request(app).post('/api/v1/check-ins/voice').set('Authorization', `Bearer ${token}`).attach('audio', Buffer.from('x'), { filename:'checkin.txt', contentType:'text/plain' });
    expect(invalid.status).toBe(400); expect(invalid.body.error.code).toBe('INVALID_AUDIO_MIME');
    const oversized = await request(app).post('/api/v1/check-ins/voice').set('Authorization', `Bearer ${token}`).attach('audio', Buffer.alloc(10 * 1024 * 1024 + 1), { filename:'large.wav', contentType:'audio/wav' });
    expect(oversized.status).toBe(413); expect(oversized.body.error.code).toBe('AUDIO_TOO_LARGE');
  });
  it('enforces RBAC and returns a safe health envelope', async () => {
    expect((await request(app).get('/api/v1/alerts')).status).toBe(401);
    const health = await request(app).get('/health'); expect(health.status).toBe(200); expect(health.body).toMatchObject({ success:true, data:{status:'ok'} });
  });
});
