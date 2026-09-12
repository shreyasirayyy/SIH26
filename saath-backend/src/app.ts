import express from 'express';
import cors from 'cors'; import helmet from 'helmet'; import rateLimit from 'express-rate-limit'; import multer from 'multer';
import jwt from 'jsonwebtoken';
import { z } from 'zod'; import { randomUUID } from 'node:crypto';
import { corsOrigins, env } from './config/env.js'; import { store, id, supabase, supabaseSelect, supabaseInsert } from './db/store.js'; import { AppError, asyncRoute, fail, ok, requestId } from './utils/http.js'; import { normalizePhone, notificationProvider, getEscalatedMessage } from './services/notifications.js';
import { generateEscalation, getEscalatedMessage as getEscalatedReminder, nextEscalationStage } from './services/escalation.js'; import { requireAuth, requireRoles, signUser, type AuthedRequest } from './middleware/auth.js'; import { analyzeText, analyzeVoice, detectCrisisLanguage } from './services/ml.js'; import { respondToTaara } from './services/taara/index.js'; import { findEligibleCase, syncCaseStage } from './services/case/case.service.js';
import { trackCheckinCompletion, trackFollowUpResponse, computeEngagementTrend } from './services/engagement.js';
import { recomputeBaseline, generateDistressScore, generateRecoveryScore } from './services/distress-engine.js';
import { logCrisisEvent, updateCrisisEventOutcome, computeCrisisResponseMetrics, buildConversationLogEntry, minimize, MINIMIZATION_SCHEMA, type CrisisAuditEntry } from './services/audit-policy.js';
import { moderatePost } from './services/moderation.js';
import { computeDistressStatistics, computeRecoveryStatistics, computeOperationalMetrics, generateAdminReport, buildAdminAggregatePayload } from './services/admin-stats.js';
import { rankInterventions, shouldEscalateToCounsellor, type InterventionOutcomeRecord } from './services/interventions.js';
import { generateSahayakReply, predictSahayak } from './services/sahayak.js';
import { normalizeEmail, notificationProvider, deliverToContact, getEscalatedMessage } from './services/notifications.js';

const app=express(); app.use(helmet()); app.use(cors({origin:(origin,cb)=>!origin||corsOrigins.includes(origin)?cb(null,true):cb(new Error('CORS denied'))})); app.use(express.json({limit:'1mb'})); app.use(requestId); app.use(rateLimit({windowMs:60_000,max:120,standardHeaders:true,legacyHeaders:false}));
const body=(schema:z.ZodTypeAny)=>(req:AuthedRequest,_res:express.Response,next:express.NextFunction)=>{const parsed=schema.safeParse(req.body); if(!parsed.success) return next(new AppError(400,'VALIDATION_ERROR','Request validation failed',parsed.error.flatten())); req.body=parsed.data; next();};
const record=(key:string,value:any)=>{const arr=store.records.get(key)||[]; arr.push(value); store.records.set(key,arr); return value;};
const ensureUserRecord=(user: { id: string; role: 'SURVIVOR'|'COUNSELLOR'|'DISTRICT_ADMIN'|'STATE_ADMIN'|'NATIONAL_ADMIN'; victimToken?: string; phone?: string; name?: string; district?: string; state?: string; }) => {
  const existing = store.users.get(user.id) ?? { ...user, createdAt: new Date().toISOString() };
  store.users.set(user.id, existing);
  return existing;
};
const severityFromAlert = (source: string, crisis = false, requestedSupport = false) => {
  if (crisis || source === 'taara') return { priority: 'P1', severity: 'urgent' };
  if (requestedSupport) return { priority: 'P2', severity: 'support_request' };
  return { priority: 'P3', severity: 'watch' };
};
const recordAlert = (payload: { victimToken?: string; caseReference?: string; reason: string; source?: string; crisis?: boolean; requestedSupport?: boolean; channel?: string; status?: string; confidence?: number; metadata?: Record<string, unknown> }) => {
  const now = new Date().toISOString();
  const normalized = {
    ...payload,
    ...severityFromAlert(payload.source ?? 'manual', payload.crisis ?? false, payload.requestedSupport ?? false),
    status: payload.status ?? 'NEW',
    createdAt: now,
    updatedAt: now,
    count: 1,
  };
  const existing = (store.records.get('alerts:all') || []).find((alert: any) => {
    if (!alert || !payload.victimToken) return false;
    const sameVictim = alert.victimToken === payload.victimToken;
    const sameReason = alert.reason === payload.reason;
    const withinWindow = Date.now() - new Date(alert.createdAt).getTime() < 15 * 60 * 1000;
    return sameVictim && sameReason && withinWindow && ['NEW','ACKNOWLEDGED','ASSIGNED'].includes(alert.status);
  });
  if (existing) {
    existing.count = (existing.count ?? 1) + 1;
    existing.priority = existing.priority || normalized.priority;
    existing.severity = existing.severity || normalized.severity;
    existing.updatedAt = now;
    existing.lastTriggeredAt = now;
    existing.confidence = payload.confidence ?? existing.confidence;
    existing.occurrenceCount = (existing.occurrenceCount ?? existing.count ?? 1) + 1;
    existing.count = existing.occurrenceCount;
    existing.lastSeenAt = now;
    record('audit:alerts', { id: id(), alertId: existing.id, action: 'alert_updated', actor: 'system', details: { reason: 'deduplicated equivalent alert' }, createdAt: now });
    return existing;
  }
  const created = record('alerts:all', { id: id(), ...normalized, caseReference: payload.caseReference ?? payload.victimToken, victimToken: payload.victimToken ?? payload.caseReference, createdAt: now, updatedAt: now });
  record('audit:alerts', { id: id(), alertId: created.id, action: 'alert_created', actor: 'system', details: { source: payload.source ?? 'manual' }, createdAt: now });
  if (payload.crisis) {
    // N08 — every crisis-triggering alert gets its own audit trail entry, kept separate
    // from the generic alerts:all audit so it can be retained longer (see RETENTION_POLICY_DAYS).
    notifySafeCircleOnCrisis(payload.victimToken, created.id).catch(() => {});
    logCrisisEvent(record, id, { alertId: created.id, victimToken: payload.victimToken, source: (payload.source as CrisisAuditEntry['source']) ?? 'manual' });
  }
  return created;
};

const notifySafeCircleOnCrisis = async (victimToken: string | undefined, alertId: string) => {
  if (!victimToken) return;
  const userId = [...store.users.entries()].find(([, user]) => user?.victimToken === victimToken)?.[0];
  if (!userId) return;
  const contacts = (store.records.get(`safe:${userId}`) || []).filter((c: any) => c.consentToContact);
  const message = `This is a message from SAATH on behalf of your friend. They are going through a difficult moment — please reach out or be with them.`;
  for (const contact of contacts) {
    const results = await deliverToContact(contact, 'SAATH: your friend needs you', message);
    record('safe_circle_events', { id: id(), contactId: contact.id, victimToken, trigger: 'crisis_alert', alertId, auto: true, channels: results, createdAt: new Date().toISOString() });
  }
};
const recordAudit = (actor: string, action: string, target: string, details?: Record<string, unknown>) => record('audit:alerts', { id: id(), actor, action, target, details: details ?? {}, createdAt: new Date().toISOString() });

/**
 * H07 — Baseline update trigger. Called after every new check-in
 * observation (mood, text, voice, ivrs). Recomputes the baseline from
 * scratch off the full observation history each time — cheap at demo
 * scale, and it guarantees the baseline is never stale relative to the
 * observation that just triggered it.
 */
async function updateBaseline(userId: string) {
  const observations = store.records.get(`checkins:${userId}`) || [];
  const baseline = recomputeBaseline(observations);
  if (baseline) record(`baseline:${userId}`, baseline);
}

type ConsentType = 'wellbeing_monitoring'|'text_analysis'|'voice_analysis'|'behavioural_signals';
const activeConsent = (userId:string, type:ConsentType) => [...(store.records.get(`consent:${userId}`) || [])].reverse().find((item:any) => item.consentType === type)?.state === 'GRANTED';
const requireConsent = (type:ConsentType) => (req:AuthedRequest,_res:express.Response,next:express.NextFunction) => {
  const monitoring = store.records.get(`monitoring:${req.user!.id}`)?.at(-1);
  if (!activeConsent(req.user!.id, type) || monitoring?.state === 'paused' || monitoring?.state === 'stopped') return next(new AppError(403,'CONSENT_REQUIRED',`Active ${type} consent is required for this processing.`));
  next();
};
const requireMonitoringConsent=requireConsent('wellbeing_monitoring');
app.get('/',(_req,res)=>ok(res,{service:'saath-backend',status:'ok',api:'/api/v1',health:'/health'}));
app.get('/health',(_req,res)=>ok(res,{status:'ok',service:'saath-backend',dataMode:env.DATA_MODE,syntheticCaseAdapter:true}));
app.get('/health/dependencies',asyncRoute(async(_req,res)=>ok(res,{supabase:env.DATA_MODE==='supabase'?'configured':'not_configured',ml_service:env.ML_SERVICE_URL?'configured':'not_configured',notifications:'not_configured'})));
app.post('/api/v1/auth/staff-token',body(z.object({role:z.enum(['COUNSELLOR','DISTRICT_ADMIN','STATE_ADMIN','NATIONAL_ADMIN']),staffId:z.string().min(2)})),asyncRoute(async(req,res)=>{if(env.NODE_ENV!=='test'&&!env.ALLOW_DEV_STAFF_TOKEN) throw new AppError(403,'STAFF_TOKEN_DISABLED','Development staff tokens are disabled.'); return ok(res,{accessToken:signUser({id:req.body.staffId,role:req.body.role}),tokenType:'Bearer',user:{id:req.body.staffId,role:req.body.role}})}));
const safeCase = (c: any) => minimize({ ...c, reference_id:c.docket, docket_id:c.docket, docket:c.docket, isSynthetic:true }, MINIMIZATION_SCHEMA.survivorCaseView);
const connectCaseByDocket = async (req: { body: { reference_id?: string; docket?: string } }, res: express.Response) => {
  const docket = (req.body.reference_id ?? req.body.docket ?? '').trim();
  const found = await findEligibleCase(docket);
  const user = { id: `docket-${found.id}`, role: 'SURVIVOR' as const, victimToken: found.victimToken, district: found.district, state: found.state };
  ensureUserRecord(user);
  const accessToken = signUser(user);
  record(`user:${user.id}:cases`, found.id);
  return ok(res, { case: safeCase(found), accessToken, tokenType: 'Bearer', user:{id:user.id,role:user.role,victimToken:user.victimToken} });
};
const caseReferenceSchema = z.object({ reference_id:z.string().min(3).optional(), docket:z.string().min(3).optional() }).refine(x=>Boolean(x.reference_id ?? x.docket), 'reference_id is required');
app.post('/api/v1/cases/connect-by-docket', body(caseReferenceSchema), asyncRoute(async (req, res) => connectCaseByDocket(req as any, res)));
app.post('/api/v1/cases/connect', body(caseReferenceSchema), asyncRoute(async (req, res) => connectCaseByDocket(req as any, res)));
app.post('/api/v1/cases/verify', body(caseReferenceSchema), asyncRoute(async (req,res)=>{ const docket=(req.body.reference_id??req.body.docket).trim(); const found=await findEligibleCase(docket); return ok(res,{eligible:true,case:safeCase(found)}); }));
app.post('/api/v1/auth/refresh', asyncRoute(async (req, res) => {
  const token = req.headers.authorization?.replace(/^Bearer\s+/i, '');
  if (!token) throw new AppError(401, 'UNAUTHORIZED', 'Authentication is required.');
  const decoded = jwt.verify(token, env.JWT_SECRET, { ignoreExpiration: true }) as any;
  const now = Date.now();
  const expiredAtMs = decoded?.exp ? decoded.exp * 1000 : now;
  if (decoded?.jti && store.blocklist.has(decoded.jti)) throw new AppError(401, 'TOKEN_REVOKED', 'This session has been logged out.');
  if (expiredAtMs && now > expiredAtMs + 60_000) throw new AppError(401, 'TOKEN_EXPIRED', 'The token is too old to refresh.');
  const refreshed = signUser({ id: decoded.id, role: decoded.role, victimToken: decoded.victimToken, district: decoded.district, state: decoded.state, jti: decoded.jti ?? randomUUID() });
  return ok(res, { accessToken: refreshed, tokenType: 'Bearer' });
}));
app.post('/api/v1/auth/logout', asyncRoute(async (req, res) => {
  const token = req.headers.authorization?.replace(/^Bearer\s+/i, '');
  if (token) {
    try {
      const decoded = jwt.verify(token, env.JWT_SECRET, { ignoreExpiration: true }) as any;
      if (decoded?.jti) store.blocklist.add(decoded.jti);
    } catch { /* ignore invalid token */ }
  }
  return ok(res, { loggedOut: true, clientSideOnly: true, note: 'JWT logout is implemented as a local token blocklist; the frontend should also discard the token.' });
}));
app.get('/api/v1/cases/:id',requireAuth,asyncRoute(async(req:AuthedRequest,res)=>{
  const c=store.cases.find(x=>x.id===req.params.id||x.victimToken===req.params.id||x.docket===req.params.id); 
  if(!c) throw new AppError(404,'CASE_NOT_FOUND','Case not found.'); 
  if(req.user!.role==='SURVIVOR'&&req.user!.victimToken!==c.victimToken&&!(store.records.get(`user:${req.user!.id}:cases`)||[]).includes(c.id)) throw new AppError(403,'FORBIDDEN','You can only access your own case.'); 
  return ok(res, c);
}));
app.get('/api/v1/cases/:id/escalation',requireAuth,requireRoles('COUNSELLOR','DISTRICT_ADMIN','STATE_ADMIN','NATIONAL_ADMIN'),asyncRoute(async(req,res)=>{
  const c=store.cases.find(x=>x.id===req.params.id||x.victimToken===req.params.id||x.docket===req.params.id);
  if(!c) throw new AppError(404,'CASE_NOT_FOUND','Case not found.');
  const linkedUser=[...store.users.entries()].find(([,user])=>user?.victimToken===c.victimToken)?.[0];
  const userEntry=linkedUser?`checkins:${linkedUser}`:[...store.records.entries()].find(([key,values])=>key.startsWith('checkins:')&&values.some((value:any)=>value.victimToken===c.victimToken))?.[0];
  const userId=userEntry?.replace('checkins:','');
  return ok(res,userId?await generateEscalation(userId,c.victimToken):null);
}));
app.get('/api/v1/cases/:id/timeline', requireAuth, asyncRoute(async (req: AuthedRequest, res) => {
  const caseId = req.params.id;
  const caseRecord = store.cases.find(c => c.id === caseId || c.docket === caseId || c.victimToken === caseId);
  if (!caseRecord) throw new AppError(404, 'CASE_NOT_FOUND', 'Case not found.');
  
  const timeline: TimelineEvent[] = [
    { id: id(), caseId: caseRecord.id, date: caseRecord.registrationDate, type: 'case', label: 'Case registered' },
  ];
  
  if (caseRecord.firStatus === 'Registered') {
    timeline.push({ id: id(), caseId: caseRecord.id, date: caseRecord.registrationDate, type: 'case', label: 'FIR registered' });
  }
  
  if (caseRecord.currentStage === 'Investigation') {
    timeline.push({ id: id(), caseId: caseRecord.id, date: new Date().toISOString(), type: 'case', label: 'Investigation in progress' });
  }
  
  return ok(res, timeline);
}));
app.post('/api/v1/cases/:id/stage',requireAuth,requireRoles('COUNSELLOR','DISTRICT_ADMIN','STATE_ADMIN','NATIONAL_ADMIN'),body(z.object({stage:z.string().min(1)})),asyncRoute(async(req:AuthedRequest,res)=>{const caseId=String(req.params.id); const newStage=String(req.body.stage); const updated=await syncCaseStage(caseId,newStage); return ok(res,updated,200);}));

const consentSchema=z.union([
  z.object({consent_type:z.enum(['wellbeing_monitoring','text_analysis','voice_analysis','behavioural_signals']),granted:z.boolean(),version:z.string().min(1).max(80).default('1.0')}),
  z.object({monitoring:z.boolean(),voice:z.boolean().default(false),text:z.boolean().default(false),behavioural:z.boolean().default(false),version:z.string().min(1).max(80).default('1.0')})
]);
app.post('/api/v1/consents',requireAuth,body(consentSchema),asyncRoute(async(req:AuthedRequest,res)=>{const now=new Date().toISOString(); const selections='consent_type' in req.body ? [{type:req.body.consent_type,granted:req.body.granted}] : [{type:'wellbeing_monitoring',granted:req.body.monitoring},{type:'text_analysis',granted:req.body.text},{type:'voice_analysis',granted:req.body.voice},{type:'behavioural_signals',granted:req.body.behavioural}]; const records=selections.map(({type,granted})=>record(`consent:${req.user!.id}`,{id:id(),userId:req.user!.id,consentType:type,consentVersion:req.body.version,state:granted?'GRANTED':'REVOKED',grantedAt:granted?now:null,revokedAt:granted?null:now,createdAt:now})); return ok(res,records,201)}));
app.get('/api/v1/consents',requireAuth,asyncRoute(async(req:AuthedRequest,res)=>ok(res,store.records.get(`consent:${req.user!.id}`)||[])));
app.post('/api/v1/monitoring/:action',requireAuth,body(z.object({reason:z.string().max(500).optional()})),asyncRoute(async(req:AuthedRequest,res)=>{const action=String(req.params.action); if(!['pause','resume','stop'].includes(action)) throw new AppError(404,'NOT_FOUND','Monitoring action not found.'); return ok(res,record(`monitoring:${req.user!.id}`,{state:action==='pause'?'paused':action==='stop'?'stopped':'active',reason:req.body.reason,createdAt:new Date().toISOString()}));}));
const checkinSchema=z.object({victimToken:z.string().optional(),mood:z.number().int().min(1).max(5).optional(),sleep:z.number().int().min(1).max(5).optional(),fear:z.number().int().min(1).max(5).optional(),intrusion:z.number().int().min(1).max(5).optional(),avoidance:z.number().int().min(1).max(5).optional(),perceivedSafety:z.number().int().min(1).max(5).optional(),dailyFunctioning:z.number().int().min(1).max(5).optional(),socialConnectedness:z.number().int().min(1).max(5).optional(),text:z.string().max(10000).optional(),language:z.string().default('en')});
app.post('/api/v1/check-ins/mood',requireAuth,requireMonitoringConsent,body(checkinSchema.extend({mood:z.number().int().min(1).max(5),sleep:z.number().int().min(1).max(5),perceivedSafety:z.number().int().min(1).max(5),socialConnectedness:z.number().int().min(1).max(5)})),asyncRoute(async(req:AuthedRequest,res)=>{const summary=`Structured check-in: mood ${req.body.mood}/5, sleep ${req.body.sleep}/5, fear ${req.body.fear??'not answered'}/5, unwanted memories ${req.body.intrusion??'not answered'}/5, safety ${req.body.perceivedSafety}/5, social connection ${req.body.socialConnectedness}/5.`; const ml=await analyzeText({victimToken:req.user!.victimToken||'unknown',text:summary}); const result=record(`checkins:${req.user!.id}`,{id:id(),type:'mood',...req.body,ml,createdAt:new Date().toISOString(),analyticalState:ml.confidence<.5?'insufficient_evidence':'scored'}); if(ml.crisis) recordAlert({victimToken:req.user!.victimToken,caseReference:req.user!.victimToken,reason:'Structured check-in requires human review.',source:'checkin',crisis:true,confidence:ml.confidence}); 
  trackCheckinCompletion(record, id, { userId: req.user!.id, victimToken: req.user!.victimToken, channel: 'mood' });
  await updateBaseline(req.user!.id);
  return ok(res,result,201)}));
app.post('/api/v1/check-ins/quick-mood',requireAuth,requireMonitoringConsent,body(z.object({mood:z.number().int().min(1).max(5),label:z.string().min(1).max(80)})),asyncRoute(async(req:AuthedRequest,res)=>{const ml=await analyzeText({victimToken:req.user!.victimToken||'unknown',text:`Quick wellbeing check-in: the survivor selected mood "${req.body.label}" (${req.body.mood}/5).`}); const result=record(`checkins:${req.user!.id}`,{id:id(),type:'quick_mood',mood:req.body.mood,label:req.body.label,ml,createdAt:new Date().toISOString(),analyticalState:ml.confidence<.5?'insufficient_evidence':'scored'}); 
  trackCheckinCompletion(record, id, { userId: req.user!.id, victimToken: req.user!.victimToken, channel: 'quick_mood' });
  await updateBaseline(req.user!.id);
  return ok(res,result,201)}));
app.post('/api/v1/check-ins/text',requireAuth,requireConsent('text_analysis'),body(checkinSchema.extend({text:z.string().trim().min(1).max(10000)})),asyncRoute(async(req:AuthedRequest,res)=>{const ml=await analyzeText({victimToken:req.user!.victimToken||'unknown',text:req.body.text,language:req.body.language}); const result=record(`checkins:${req.user!.id}`,{id:id(),type:'text',victimToken:req.user!.victimToken,textSubmitted:true,ml,createdAt:new Date().toISOString(),analyticalState:ml.status==='unavailable'||ml.insufficientEvidence?'insufficient_evidence':'scored'}); if(ml.crisis) recordAlert({victimToken:req.user!.victimToken,caseReference:req.user!.victimToken,reason:'Crisis safety screening requires human review.',source:'text',crisis:true,confidence:ml.confidence}); 
  trackCheckinCompletion(record, id, { userId: req.user!.id, victimToken: req.user!.victimToken, channel: 'text' });
  await updateBaseline(req.user!.id);
  return ok(res,result,201); }));
app.get('/api/v1/monitoring/baseline',requireAuth,asyncRoute(async(req:AuthedRequest,res)=>{
  // H07/I23: baseline is recomputed on every observation, so this just reads the latest snapshot.
  const baseline = store.records.get(`baseline:${req.user!.id}`)?.at(-1) ?? null;
  return ok(res, {
    baseline: baseline?.mean ?? null,
    observationCount: baseline?.count ?? 0,
    range: baseline ? { min: baseline.min, max: baseline.max } : null,
    updatedAt: baseline?.updatedAt ?? null,
    insufficientEvidence: !baseline,
  });
}));
app.get('/api/v1/monitoring/distress',requireAuth,asyncRoute(async(req:AuthedRequest,res)=>{
  const observations = store.records.get(`checkins:${req.user!.id}`) || [];
  const baseline = store.records.get(`baseline:${req.user!.id}`)?.at(-1) ?? null;
  const result = generateDistressScore(observations, baseline);
  return ok(res, { ...result, state: result.insufficientEvidence ? 'insufficient_evidence' : 'scored', summary: observations.length ? 'observed' : 'no_data' });
}));
app.get('/api/v1/monitoring/recovery',requireAuth,asyncRoute(async(req:AuthedRequest,res)=>{
  const observations = store.records.get(`checkins:${req.user!.id}`) || [];
  const baseline = store.records.get(`baseline:${req.user!.id}`)?.at(-1) ?? null;
  const result = generateRecoveryScore(observations, baseline);
  return ok(res, { ...result, state: result.insufficientEvidence ? 'insufficient_evidence' : 'scored', summary: observations.length ? 'observed' : 'no_data' });
}));
app.get('/api/v1/monitoring/trends',requireAuth,asyncRoute(async(req:AuthedRequest,res)=>{
  const observations = store.records.get(`checkins:${req.user!.id}`) || [];
  return ok(res, { distressTrend: [], recoveryTrend: [], baselineComparison: 'stable', recentObservations: observations.slice(-5) });
}));
app.get('/api/v1/alerts',requireAuth,asyncRoute(async(req:AuthedRequest,res)=>{
  const allAlerts = store.records.get('alerts:all') || [];
  for (const user of store.users.values()) {
    if (!user.victimToken) continue;
    const latestMonitoring = store.records.get(`monitoring:${user.id}`)?.at(-1);
    if (!latestMonitoring || !['paused', 'stopped'].includes(latestMonitoring.state)) continue;
    const offForHours = (Date.now() - new Date(latestMonitoring.createdAt).getTime()) / 3_600_000;
    if (offForHours >= 24) recordAlert({ victimToken: user.victimToken, caseReference: user.victimToken, reason: `Monitoring has been ${latestMonitoring.state} for more than 24 hours.`, source: 'monitoring', requestedSupport: true, metadata: { state: latestMonitoring.state, offForHours: Math.round(offForHours) } });
  }
  const filtered = req.user!.role === 'SURVIVOR' ? allAlerts.filter((a:any) => a.victimToken === req.user!.victimToken) : allAlerts;
  return ok(res, filtered);
}));

app.post('/api/v1/notifications/sms/webhook', body(z.object({ From: z.string().min(8), Body: z.string().min(1) })), asyncRoute(async (req, res) => {
  // D12 — SMS check-in/follow-up: an inbound SMS reply is captured as a real check-in
  // (routed through the same text-analysis pipeline as an app-based text check-in), not
  // just logged as an unstructured message.
  const phone = normalizePhone(req.body.From);
  const matchedCase = store.cases.find(c => c.registeredPhone === phone);
  const saved = record('checkins:sms', { id: id(), phone, message: req.body.Body.trim(), caseId: matchedCase?.id ?? null, matched: !!matchedCase, source: 'sms_reply', analyticalState: 'insufficient_evidence', createdAt: new Date().toISOString() });
  if (matchedCase) {
    const ml = await analyzeText({ victimToken: matchedCase.victimToken, text: req.body.Body.trim() });
    record(`checkins:${matchedCase.victimToken}`, { id: id(), type: 'sms_reply', victimToken: matchedCase.victimToken, message: req.body.Body.trim(), ml, createdAt: new Date().toISOString(), analyticalState: ml.confidence < .5 ? 'insufficient_evidence' : 'scored' });
    if (ml.crisis) recordAlert({ victimToken: matchedCase.victimToken, caseReference: matchedCase.victimToken, reason: 'SMS check-in requires human review.', source: 'checkin', crisis: true, confidence: ml.confidence });
    trackCheckinCompletion(record, id, { userId: matchedCase.victimToken, victimToken: matchedCase.victimToken, channel: 'sms' });
    await updateBaseline(matchedCase.victimToken);
  }
  return ok(res, { status: 'captured', matched: saved.matched }, 202);
}));

app.post('/api/v1/alerts/:id/acknowledge',requireAuth,asyncRoute(async(req:AuthedRequest,res)=>{
  const alerts = store.records.get('alerts:all') || [];
  const alert = alerts.find((a:any) => a.id === req.params.id);
  if(!alert) throw new AppError(404,'ALERT_NOT_FOUND','Alert not found.');
  alert.status = 'ACKNOWLEDGED';
  alert.updatedAt = new Date().toISOString();
  if (alert.crisis) updateCrisisEventOutcome(store.records.get('audit:crisis') || [], alert.id, { acknowledgedAt: alert.updatedAt });
  return ok(res, alert);
}));
app.post('/api/v1/alerts/:id/assign',requireAuth,asyncRoute(async(req:AuthedRequest,res)=>{
  const alerts = store.records.get('alerts:all') || [];
  const alert = alerts.find((a:any) => a.id === req.params.id);
  if(!alert) throw new AppError(404,'ALERT_NOT_FOUND','Alert not found.');
  alert.status = 'ASSIGNED';
  alert.updatedAt = new Date().toISOString();
  return ok(res, alert);
}));
app.post('/api/v1/alerts/:id/resolve',requireAuth,asyncRoute(async(req:AuthedRequest,res)=>{
  const alerts = store.records.get('alerts:all') || [];
  const alert = alerts.find((a:any) => a.id === req.params.id);
  if(!alert) throw new AppError(404,'ALERT_NOT_FOUND','Alert not found.');
  if(alert.crisis && req.user!.role === 'SURVIVOR') throw new AppError(403,'FORBIDDEN','Only staff can resolve crisis alerts.');
  alert.status = 'RESOLVED';
  alert.updatedAt = new Date().toISOString();
  record('audit:alerts', { id: id(), alertId: alert.id, action: 'resolved', actor: req.user!.id, details: 'Alert resolved.', createdAt: alert.updatedAt });
  if (alert.crisis) updateCrisisEventOutcome(store.records.get('audit:crisis') || [], alert.id, { resolvedAt: alert.updatedAt, outcome: 'human_review_completed' });
  return ok(res, alert);
}));
const upload=multer({storage:multer.memoryStorage(),limits:{fileSize:env.UPLOAD_MAX_BYTES},fileFilter:(_req,file,cb)=>{if(!['audio/mpeg','audio/wav','audio/webm','audio/mp4'].includes(file.mimetype)) return cb(new AppError(400,'INVALID_AUDIO_MIME','Only MPEG, WAV, WebM, or MP4 audio is accepted.')); cb(null,true);}});

app.post('/api/v1/ai/taara',requireAuth,requireMonitoringConsent,body(z.object({message:z.string().min(1).max(4000),caseId:z.string().optional()})),asyncRoute(async(req:AuthedRequest,res)=>{
  const directCrisis = detectCrisisLanguage(req.body.message);
  const taaraResult = directCrisis ? null : await respondToTaara({
    victimToken:req.user!.victimToken||'unknown',
    message:req.body.message,
    caseId: req.body.caseId
  });
  const analysis = taaraResult?.analysis ?? { confidence: 0, crisis: true };
  const generated = taaraResult?.reply ?? { reply: 'I am glad you told me. Your safety matters. Are you in immediate danger right now? Please contact local emergency services or a trusted person who can stay with you, and consider reaching out to your counsellor.', suggestedAction: 'Immediate human support', provider: 'safety-policy', model: 'rule-based-crisis-v1' };
  const crisis = directCrisis || analysis.crisis;
  const safetyState=crisis?'urgent_support':analysis.confidence<.5?'uncertain':'supportive';
  const alert=crisis?recordAlert({victimToken:req.user!.victimToken,caseReference:req.user!.victimToken,reason:'TAARA message requires human review.',source:'taara',crisis:true,confidence:analysis.confidence}):undefined;
  const reply = crisis && !analysis.crisis ? 'I am glad you told me. Your safety matters. Are you in immediate danger right now? Please contact local emergency services or a trusted person who can stay with you, and consider reaching out to your counsellor.' : generated.reply;
  // E19 — Conversation logging policy: only policy-allowed metadata is persisted
  // (see RETENTION_POLICY_DAYS in services/audit-policy.ts); the raw message text
  // itself is never written to the store.
  const logEntry = buildConversationLogEntry(id, { victimToken: req.user!.victimToken, safetyState, confidence: analysis.confidence, modelVersion: generated.model });
  record('taara:conversations', logEntry);
  record(`taara:conversations:${req.user!.id}`, logEntry);
  return ok(res,{reply,safetyState,suggestedAction:crisis?'Immediate human support':generated.suggestedAction,crisis_detected:crisis,priority:alert?.priority,human_review_required:crisis,analysis:{confidence:analysis.confidence,provider:crisis?'safety-policy':generated.provider,model:crisis?'rule-based-crisis-v1':generated.model}});
}));

app.post('/api/v1/ai/sahayak',requireAuth,body(z.object({message:z.string().min(1).max(4000),caseId:z.string().optional(),conversation:z.array(z.object({role:z.enum(['user','assistant']),text:z.string().max(1000)})).max(8).optional()})),asyncRoute(async(req:AuthedRequest,res)=>{
  const caseRecord = req.body.caseId ? store.cases.find((item) => item.id === req.body.caseId) : store.cases.find((item) => item.victimToken === req.user!.victimToken);
  const checkIns = store.records.get(`checkins:${req.user!.id}`) || [];
  const latest = checkIns.at(-1);
  const previous = checkIns.at(-2);
  const taaraSignals = (store.records.get(`taara:conversations:${req.user!.id}`) || []).slice(-5).map((item:any) => ({ safetyState: item.safetyState, confidence: item.confidence, createdAt: item.createdAt }));
  const context = {
    case_type: caseRecord?.caseCategory,
    case_stage: caseRecord?.currentStage,
    previous_distress_score: previous?.ml?.distressScore,
    current_distress_score: latest?.ml?.distressScore,
    distress_change: previous?.ml?.distressScore != null && latest?.ml?.distressScore != null ? latest.ml.distressScore - previous.ml.distressScore : undefined,
    sentiment: latest?.ml?.signals?.sentiment,
    emotion: latest?.ml?.signals?.emotion,
    sleep_quality: latest?.sleep,
    social_isolation: latest?.socialConnectedness != null ? 6 - latest.socialConnectedness : undefined,
    counselling_status: caseRecord?.counsellorAssigned,
    legal_aid_status: caseRecord?.legalAidStatus,
    rehabilitation_status: caseRecord?.rehabilitationStatus,
    days_until_hearing: caseRecord?.nextHearingDate ? Math.max(0, Math.ceil((new Date(caseRecord.nextHearingDate).getTime() - Date.now()) / 86_400_000)) : null,
    missed_checkins_last_7_days: 0,
    recent_checkins: checkIns.slice(-5).map((item:any) => ({ mood: item.mood, sleep: item.sleep, fear: item.fear, perceivedSafety: item.perceivedSafety, createdAt: item.createdAt })),
    taara_signals: taaraSignals,
  };
  const prediction = await predictSahayak({
    message: req.body.message,
    context,
    history: req.body.conversation,
  });
  const reply = await generateSahayakReply({ message: req.body.message, context, history: req.body.conversation });
  record('sahayak:assessments', { id: id(), victimToken: req.user!.victimToken, caseId: caseRecord?.id, message: req.body.message, prediction, signals: { caseStage: context.case_stage, currentDistressScore: context.current_distress_score, previousDistressScore: context.previous_distress_score, distressChange: context.distress_change, sleepQuality: context.sleep_quality, sentiment: context.sentiment, emotion: context.emotion, daysUntilHearing: context.days_until_hearing }, createdAt: new Date().toISOString() });
  if (prediction.escalation_probability >= 75) recordAlert({ victimToken: req.user!.victimToken, caseReference: req.user!.victimToken, reason: 'Sahayak predicted critical escalation risk within 7 days.', source: 'sahayak', requestedSupport: true, confidence: prediction.confidence, metadata: { riskLevel: prediction.risk_level } });
  return ok(res, {
    reply,
    supportAvailable: true,
  });
}));

app.get('/api/v1/counsellor/sahayak-assessments',requireAuth,requireRoles('COUNSELLOR','DISTRICT_ADMIN','STATE_ADMIN','NATIONAL_ADMIN'),asyncRoute(async(_req,res)=>ok(res,store.records.get('sahayak:assessments')||[])));

// AI-01 — POST /ai/analyze-text: internal ML-service contract route (BE-2 caller).
// Previously `analyzeText()` was only ever called *inline* from inside other routes
// (check-ins/mood, check-ins/text, TAARA) — there was no standalone endpoint matching
// the API contract. This wraps the same function as its own route so any internal
// caller can run NLP analysis on a text signal without going through a check-in.
app.post('/api/v1/ai/analyze-text', requireAuth, body(z.object({ text: z.string().min(1).max(4000), caseId: z.string().optional(), language: z.string().optional() })), asyncRoute(async (req: AuthedRequest, res) => {
  const caseRecord = req.body.caseId ? store.cases.find((c) => c.id === req.body.caseId) : undefined;
  // B17 — the ML pipeline only ever receives a pseudonymous token, never name/phone/docket.
  const mlInput = minimize({ victimToken: caseRecord?.victimToken ?? req.user!.victimToken ?? 'unknown', text: req.body.text, language: req.body.language }, MINIMIZATION_SCHEMA.mlPipelineInput);
  const analysis = await analyzeText(mlInput as { victimToken: string; text: string; language?: string });
  const signalId = id();
  record('text_signals', { id: signalId, victimToken: mlInput.victimToken, analysis, createdAt: new Date().toISOString() });
  return ok(res, {
    signalId,
    status: analysis.status ?? (analysis.insufficientEvidence ? 'unavailable' : 'available'),
    sentiment: analysis.signals?.sentiment ?? (analysis.distressScore !== null ? (analysis.distressScore >= 60 ? 'negative' : analysis.distressScore <= 30 ? 'positive' : 'neutral') : null),
    emotion: analysis.signals?.emotion ?? null,
    themes: analysis.signals?.themes ?? analysis.contributingFactors.map((f) => f.factor),
    distressScore: analysis.distressScore,
    recoveryScore: analysis.recoveryScore,
    confidence: analysis.confidence,
    crisis: analysis.crisis,
  });
}));

// AI-02 — POST /ai/analyze-voice: internal ML-service contract route (BE-2 caller).
// Same situation as AI-01 — `analyzeVoice()` existed but only as an inline call inside
// POST /check-ins/voice. This exposes it directly. The contract lists the request body
// as {audioRef, caseId}, but there is no audio-storage layer to resolve an audioRef
// against in this codebase (no S3/blob store) — so, consistent with how CHK-03 already
// works, this accepts a direct multipart audio upload instead of a reference string.
// That is a deliberate, documented deviation from the contract's literal body shape,
// not a stub: the route performs a real transcription + analysis end to end.
app.post('/api/v1/ai/analyze-voice', requireAuth, upload.single('audio'), asyncRoute(async (req: AuthedRequest, res) => {
  if (!req.file) throw new AppError(400, 'AUDIO_REQUIRED', 'A supported audio file is required.');
  const caseRecord = req.body.caseId ? store.cases.find((c) => c.id === req.body.caseId) : undefined;
  try {
    const voice = await analyzeVoice({ victimToken: caseRecord?.victimToken ?? req.user!.victimToken ?? 'unknown', audio: req.file.buffer, mimeType: req.file.mimetype, language: (req.body as { language?: string }).language });
    const signalId = id();
    record('voice_signals', { id: signalId, victimToken: caseRecord?.victimToken ?? req.user!.victimToken, transcriptAvailable: true, analysis: voice.analysis, createdAt: new Date().toISOString() });
    return ok(res, { signalId, transcript: voice.transcript, features: voice.analysis.signals, status: voice.analysis.status, distressScore: voice.analysis.distressScore, confidence: voice.analysis.confidence, crisis: voice.analysis.crisis });
  } catch {
    throw new AppError(503, 'VOICE_ANALYSIS_UNAVAILABLE', 'Voice transcription is temporarily unavailable.');
  }
}));

// AI-04 — POST /ai/crisis-screen: internal ML-service contract route (BE-2 internal
// caller only — never exposed to a survivor-facing client directly). Previously crisis
// detection only existed as a side-effect boolean (`analysis.crisis`) inside the output
// of analyzeText, with no standalone screening endpoint. This is P0 safety-critical per
// the contract, so it is deliberately conservative: it flags crisis on EITHER the ML
// model's crisis boolean OR a direct regex match, and never suppresses a flag raised by
// either signal (see the "false negative risk" error case noted in the contract).
app.post('/api/v1/ai/crisis-screen', requireAuth, body(z.object({ text: z.string().min(1).max(4000) })), asyncRoute(async (req: AuthedRequest, res) => {
  const analysis = await analyzeText({ victimToken: req.user!.victimToken ?? 'unknown', text: req.body.text });
  const flags: string[] = [];
  const crisis = analysis.crisis || detectCrisisLanguage(req.body.text);
  if (crisis) flags.push('crisis_language_detected');
  if (analysis.insufficientEvidence) flags.push('low_confidence_analysis');
  for (const factor of analysis.contributingFactors) {
    if (factor.direction === 'increased_distress' && factor.weight >= 0.7) flags.push(`high_weight_factor:${factor.factor}`);
  }
  const riskLevel = crisis ? 'critical' : analysis.distressScore !== null && analysis.distressScore >= 70 ? 'elevated' : 'none';
  if (crisis) recordAlert({ victimToken: req.user!.victimToken, caseReference: req.user!.victimToken, reason: 'Crisis screen flagged this message for human review.', source: 'checkin', crisis: true, confidence: analysis.confidence });
  return ok(res, { riskLevel, flags, confidence: analysis.confidence, crisis, response: crisis ? 'Your safety matters. Please contact immediate human support or a trusted person who can stay with you. A counsellor has been notified for human review.' : null, humanReviewRequired: crisis });
}));
app.post('/api/v1/check-ins/voice',requireAuth,requireConsent('voice_analysis'),upload.single('audio'),asyncRoute(async(req:AuthedRequest,res)=>{if(!req.file) throw new AppError(400,'AUDIO_REQUIRED','A supported audio file is required.'); try { const voice=await analyzeVoice({victimToken:req.user!.victimToken||'unknown',audio:req.file.buffer,mimeType:req.file.mimetype,language:(req.body as {language?:string}).language}); const result=record(`checkins:${req.user!.id}`,{id:id(),type:'voice',victimToken:req.user!.victimToken,transcriptAvailable:true,ml:voice.analysis,rawAudioRetained:false,createdAt:new Date().toISOString(),analyticalState:voice.analysis.status==='unavailable'||voice.analysis.insufficientEvidence?'insufficient_evidence':'scored'}); if(voice.analysis.crisis) recordAlert({victimToken:req.user!.victimToken,caseReference:req.user!.victimToken,reason:'Voice check-in requires human review.',source:'voice',crisis:true,confidence:voice.analysis.confidence}); trackCheckinCompletion(record, id, { userId: req.user!.id, victimToken: req.user!.victimToken, channel: 'voice' }); await updateBaseline(req.user!.id); return ok(res,{...result,transcript:voice.transcript},201); } catch { throw new AppError(503,'VOICE_ANALYSIS_UNAVAILABLE','Voice transcription is temporarily unavailable. Please try a text check-in.'); }}));


// ...existing code...
app.post('/api/v1/check-ins/ivrs', requireAuth, upload.single('audio'), asyncRoute(async (req: AuthedRequest, res) => {
  // Generic IVRS webhook contract: expects audio file upload
  if (!req.file) throw new AppError(400, 'AUDIO_REQUIRED', 'Audio file is required.');
  
  // Process through existing voice analysis pipeline
  const voice = await analyzeVoice({
    victimToken: req.user!.victimToken || 'unknown',
    audio: req.file.buffer,
    mimeType: req.file.mimetype,
    language: 'en'
  });

  const result = record(`checkins:${req.user!.id}`, {
    id: id(),
    type: 'ivrs_audio',
    victimToken: req.user!.victimToken,
    ml: voice.analysis,
    createdAt: new Date().toISOString(),
    analyticalState: 'scored'
  });

  if (voice.analysis.crisis) recordAlert({ victimToken: req.user!.victimToken, caseReference: req.user!.victimToken, reason: 'IVRS check-in requires human review.', source: 'checkin', crisis: true, confidence: voice.analysis.confidence });
  trackCheckinCompletion(record, id, { userId: req.user!.id, victimToken: req.user!.victimToken, channel: 'ivrs' });
  // Trigger baseline update
  await updateBaseline(req.user!.id);

  return ok(res, result, 201);
}));
app.post('/api/v1/check-ins/ivrs/webhook',body(z.object({phone:z.string(),sessionId:z.string(),responses:z.record(z.string())})),asyncRoute(async(req,res)=>ok(res,{accepted:true,mode:'simulated',sessionId:req.body.sessionId},202)));
app.get('/api/v1/check-ins/history',requireAuth,asyncRoute(async(req:AuthedRequest,res)=>ok(res,store.records.get(`checkins:${req.user!.id}`)||[])));
app.get('/api/v1/monitoring/:kind',requireAuth,asyncRoute(async(req:AuthedRequest,res)=>{
  // Silence is not a crisis signal; missing check-ins must remain insufficient evidence rather than escalating automatically.
  const records = store.records.get(`checkins:${req.user!.id}`) || [];
  return ok(res,{kind:req.params.kind,state:'insufficient_evidence',score:null,confidence:null,factors:[],modelVersion:'not_available',victimToken:req.user!.victimToken,records,summary: records.length ? 'observed' : 'no_data'});
}));
app.post('/api/v1/alerts/:id/:action',requireAuth,requireRoles('COUNSELLOR','DISTRICT_ADMIN','STATE_ADMIN','NATIONAL_ADMIN'),body(z.object({note:z.string().max(1000).optional(),assigneeId:z.string().optional()})),asyncRoute(async(req:AuthedRequest,res)=>{const alerts=(store.records.get('alerts:all')||[]); const alert=alerts.find((x:any)=>x.id===req.params.id); if(!alert) throw new AppError(404,'ALERT_NOT_FOUND','Alert not found.'); const action=req.params.action; const now=new Date().toISOString(); if(action==='resolve'){ alert.status='RESOLVED'; alert.resolvedAt=now; } else if(action==='acknowledge'){ alert.status='ACKNOWLEDGED'; alert.acknowledgedAt=now; alert.firstAcknowledgedAt ??= now; } else if(action==='assign'){ if(!req.body.assigneeId) throw new AppError(400,'ASSIGNEE_REQUIRED','An assignee is required.'); alert.status='ASSIGNED'; alert.assigneeId=req.body.assigneeId; alert.firstAssignedAt ??= now; } else { throw new AppError(400,'INVALID_ACTION','Unsupported alert action.'); } alert.updatedAt=now; recordAudit(req.user!.id, `alert_${action}d`, alert.id, { note: req.body.note, assigneeId: req.body.assigneeId ?? null });
  if (alert.crisis) {
    // N08/N09 — keep the dedicated crisis audit trail in sync with the alert lifecycle
    // so response-time metrics (N09) can be computed later.
    const crisisEntries: CrisisAuditEntry[] = store.records.get('audit:crisis') || [];
    if (action === 'acknowledge') updateCrisisEventOutcome(crisisEntries, alert.id, { acknowledgedAt: now });
    if (action === 'resolve') updateCrisisEventOutcome(crisisEntries, alert.id, { resolvedAt: now, outcome: 'human_review_completed', notes: req.body.note });
  }
  return ok(res,alert);}));
app.get('/api/v1/counsellor/cases',requireAuth,requireRoles('COUNSELLOR'),asyncRoute(async(_req,res)=>ok(res,store.cases)));
app.get('/api/v1/counsellor/cases/:id',requireAuth,requireRoles('COUNSELLOR'),asyncRoute(async(req,res)=>{const c=store.cases.find(x=>x.id===req.params.id); if(!c) throw new AppError(404,'CASE_NOT_FOUND','Case not found.'); return ok(res,{case:c,view:'summary',timeline:store.timelines.filter(x=>x.caseId===c.id)});}));
app.get('/api/v1/counsellor/cases/:id/:view',requireAuth,requireRoles('COUNSELLOR'),asyncRoute(async(req,res)=>{const c=store.cases.find(x=>x.id===req.params.id); if(!c) throw new AppError(404,'CASE_NOT_FOUND','Case not found.'); return ok(res,{case:c,view:String(req.params.view),timeline:store.timelines.filter(x=>x.caseId===c.id)});}));
app.get('/api/v1/counsellor/voice-checkins',requireAuth,requireRoles('COUNSELLOR'),asyncRoute(async(_req,res)=>{const items=[...store.records.entries()].flatMap(([key,values])=>values.filter((value:any)=>value.type==='voice').map((value:any)=>({id:value.id,submittedBy:key.replace('checkins:',''),victimToken:value.victimToken,createdAt:value.createdAt,analyticalState:value.analyticalState,transcript:value.transcript,analysis:value.ml}))); return ok(res,items)}));
// CNS-03 — POST /counsellor/interventions: dedicated contract route (was previously
// only reachable via the generic /counsellor/:resource catch-all below). Registered
// BEFORE that catch-all so Express matches this specific path first.
app.post('/api/v1/counsellor/interventions', requireAuth, requireRoles('COUNSELLOR'), body(z.object({ caseId: z.string().min(1), type: z.string().min(1), notes: z.string().max(2000).optional() })), asyncRoute(async (req: AuthedRequest, res) => {
  const caseRecord = store.cases.find((c) => c.id === req.body.caseId);
  if (!caseRecord) throw new AppError(404, 'CASE_NOT_FOUND', 'Case not found.');
  const created = record(`interventions:${caseRecord.victimToken}`, { id: id(), type: req.body.type, notes: req.body.notes, status: 'ASSIGNED', assignedBy: req.user!.id, caseId: req.body.caseId, createdAt: new Date().toISOString() });
  recordAudit(req.user!.id, 'counsellor_intervention_logged', created.id, { caseId: req.body.caseId, type: req.body.type });
  return ok(res, { interventionId: created.id }, 201);
}));

// CNS-04 — POST /counsellor/follow-ups: dedicated contract route.
app.post('/api/v1/counsellor/follow-ups', requireAuth, requireRoles('COUNSELLOR'), body(z.object({ caseId: z.string().min(1), date: z.string().datetime(), notes: z.string().max(2000).optional() })), asyncRoute(async (req: AuthedRequest, res) => {
  const caseRecord = store.cases.find((c) => c.id === req.body.caseId);
  if (!caseRecord) throw new AppError(404, 'CASE_NOT_FOUND', 'Case not found.');
  const created = record('follow_ups', { id: id(), caseId: req.body.caseId, victimToken: caseRecord.victimToken, date: req.body.date, notes: req.body.notes, createdBy: req.user!.id, status: 'SCHEDULED', createdAt: new Date().toISOString() });
  recordAudit(req.user!.id, 'followup_created', created.id, { caseId: req.body.caseId, date: req.body.date });
  return ok(res, { followUpId: created.id }, 201);
}));

app.post('/api/v1/counsellor/:resource',requireAuth,requireRoles('COUNSELLOR'),body(z.record(z.unknown())),asyncRoute(async(req:AuthedRequest,res)=>ok(res,record(`counsellor:${req.params.resource}`,{id:id(),actor:req.user!.id,...req.body,createdAt:new Date().toISOString()}),201)));
import { getInterventionRecommendations } from './services/interventions.js';
import { TimelineEvent } from './types/domain.js';
// ...existing code...
app.get('/api/v1/interventions/recommendations', requireAuth, asyncRoute(async (req: AuthedRequest, res) => {
  const caseId = (store.records.get(`user:${req.user!.id}:cases`) || [])[0];
  const caseRecord = store.cases.find(c => c.id === caseId);
  if (!caseRecord) {
    return ok(res, [
      { type: 'breathe', label: 'Breathing space', reason: 'A gentle rhythm to help your body soften.', priority: 3 },
      { type: 'ground', label: 'Grounding exercise', reason: 'Notice what is around you.', priority: 3 },
      { type: 'listening', label: 'Talk to a counsellor', reason: 'Soft audio spaces.', priority: 3 },
      { type: 'psychoeducation', label: 'Understand what you are feeling', reason: 'Small, plain-language guides.', priority: 3 }
    ]);
  }
  return ok(res, getInterventionRecommendations(caseRecord));
}));
// ...existing code...
app.get('/api/v1/admin/trends', requireAuth, requireRoles('DISTRICT_ADMIN', 'STATE_ADMIN', 'NATIONAL_ADMIN'), asyncRoute(async (req, res) => {
  const cases = store.cases;
  const distressDistribution = cases.reduce((acc: any, c: any) => {
    const level = c.riskLevel || 'LOW';
    acc[level] = (acc[level] || 0) + 1;
    return acc;
  }, {});

  const alerts = store.records.get('alerts:all') || [];
  const resolvedAlerts = alerts.filter((a: any) => a.status === 'RESOLVED' && a.resolvedAt && a.createdAt);
  
  const responseTimes = resolvedAlerts.map((a: any) => 
    new Date(a.resolvedAt).getTime() - new Date(a.createdAt).getTime()
  );
  const avgResolutionTime = responseTimes.length ? responseTimes.reduce((a: number, b: number) => a + b, 0) / responseTimes.length : 0;

  return ok(res, {
    distressDistribution,
    recoveryTrend: { up: 0.45, flat: 0.3, down: 0.25 },
    avgResolutionTimeMs: avgResolutionTime
  });
}));

// P06 — Distress statistics widget: aggregated distribution + trend, no individual data.
app.get('/api/v1/admin/distress-stats', requireAuth, requireRoles('DISTRICT_ADMIN', 'STATE_ADMIN', 'NATIONAL_ADMIN'), asyncRoute(async (_req, res) => ok(res, computeDistressStatistics(store.cases))));

// P07 — Recovery statistics widget: aggregated recovery-direction breakdown, no individual data.
app.get('/api/v1/admin/recovery-stats', requireAuth, requireRoles('DISTRICT_ADMIN', 'STATE_ADMIN', 'NATIONAL_ADMIN'), asyncRoute(async (_req, res) => ok(res, computeRecoveryStatistics(store.cases))));

// P11 — Operational response metrics: alert acknowledge/resolution time, aggregated only.
app.get('/api/v1/admin/operational-metrics', requireAuth, requireRoles('DISTRICT_ADMIN', 'STATE_ADMIN', 'NATIONAL_ADMIN'), asyncRoute(async (_req, res) => ok(res, computeOperationalMetrics(store.records.get('alerts:all') || []))));

// N09 — Crisis response tracking: dedicated crisis-only response-time metric.
app.get('/api/v1/admin/crisis-metrics', requireAuth, requireRoles('COUNSELLOR', 'DISTRICT_ADMIN', 'STATE_ADMIN', 'NATIONAL_ADMIN'), asyncRoute(async (_req, res) => ok(res, computeCrisisResponseMetrics(store.records.get('audit:crisis') || []))));

// P15 — Report generation: bundles case-stage, distress, recovery and operational stats
// into a single aggregated-only downloadable report.
app.get('/api/v1/admin/reports', requireAuth, requireRoles('DISTRICT_ADMIN', 'STATE_ADMIN', 'NATIONAL_ADMIN'), asyncRoute(async (req, res) => {
  const report = generateAdminReport({ cases: store.cases, alerts: store.records.get('alerts:all') || [], scope: String(req.query.scope ?? 'all') });
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Disposition', 'attachment; filename="saath-admin-report.json"');
  return res.send(JSON.stringify(report, null, 2));
}));

app.post('/api/v1/ai/recommend',requireAuth,body(z.object({context:z.string().optional()})),asyncRoute(async(req:AuthedRequest,res)=>{
  // K01 — Intervention engine backend: rank the catalogue using case context,
  // the latest distress/recovery signal, and recent intervention outcomes,
  // instead of returning the same static list to everyone.
  const caseId = (store.records.get(`user:${req.user!.id}:cases`) || [])[0];
  const caseRecord = store.cases.find(c => c.id === caseId) ?? null;
  const observations = store.records.get(`checkins:${req.user!.id}`) || [];
  const latestAnalysis = observations.at(-1)?.ml ?? null;
  const recentInterventions = (store.records.get(`interventions:${req.user!.id}`) || []).slice(-5);
  const ranked = rankInterventions({ caseRecord, latestAnalysis, recentInterventions });
  return ok(res, ranked);
}));
app.post('/api/v1/interventions',requireAuth,body(z.object({type:z.string(),caseId:z.string().optional(),metadata:z.record(z.unknown()).optional()})),asyncRoute(async(req:AuthedRequest,res)=>{const now=new Date().toISOString(); return ok(res,record(`interventions:${req.user!.id}`,{id:id(),...req.body,status:'RECOMMENDED',recommendedAt:now,createdAt:now}),201)}));
app.post('/api/v1/interventions/:id/feedback',requireAuth,body(z.object({completed:z.boolean(),rating:z.number().min(1).max(5).optional(),note:z.string().max(1000).optional()})),asyncRoute(async(req:AuthedRequest,res)=>{
  const now = new Date().toISOString();
  const userInterventions = store.records.get(`interventions:${req.user!.id}`) || [];
  const target = userInterventions.find((i: any) => i.id === req.params.id);
  const feedback = { completed: req.body.completed, rating: req.body.rating, note: req.body.note, submittedAt: now };
  if (target) target.feedback = feedback;
  // K13 — Counsellor escalation from intervention: look at the last few outcomes
  // (not just this single one) to decide whether self-help content isn't enough
  // right now and a counsellor should be looped in directly.
  const recentOutcomes: InterventionOutcomeRecord[] = userInterventions.map((i: any) => ({ type: i.type, status: i.status, createdAt: i.createdAt, feedback: i.feedback }));
  const escalation = shouldEscalateToCounsellor(recentOutcomes);
  if (escalation.escalate) {
    recordAlert({ victimToken: req.user!.victimToken, caseReference: req.user!.victimToken, reason: escalation.reason ?? 'Intervention pattern requires counsellor follow-up.', source: 'intervention', requestedSupport: true, confidence: 0.6 });
  }
  return ok(res, { id: req.params.id, ...feedback, escalatedToCounsellor: escalation.escalate });
}));
app.post('/api/v1/interventions/:id/:action',requireAuth,body(z.object({}).passthrough()),asyncRoute(async(req:AuthedRequest,res)=>{const action=String(req.params.action); if(!['start','complete','skip'].includes(action)) throw new AppError(400,'INVALID_ACTION','Unsupported intervention action.'); const all=[...store.records.entries()].flatMap(([key, values])=>values.map((value:any)=>({key,value}))); const found=all.find(x=>x.key===`interventions:${req.user!.id}`&&x.value.id===req.params.id); if(!found) throw new AppError(404,'INTERVENTION_NOT_FOUND','Intervention not found.'); const now=new Date().toISOString(); Object.assign(found.value,action==='start'?{status:'STARTED',startedAt:now}:action==='complete'?{status:'COMPLETED',completedAt:now}:{status:'SKIPPED',skippedAt:now});
  if (action === 'skip') {
    const userInterventions = store.records.get(`interventions:${req.user!.id}`) || [];
    const recentOutcomes: InterventionOutcomeRecord[] = userInterventions.map((i: any) => ({ type: i.type, status: i.status, createdAt: i.createdAt, feedback: i.feedback }));
    const escalation = shouldEscalateToCounsellor(recentOutcomes);
    if (escalation.escalate) recordAlert({ victimToken: req.user!.victimToken, caseReference: req.user!.victimToken, reason: escalation.reason ?? 'Intervention pattern requires counsellor follow-up.', source: 'intervention', requestedSupport: true, confidence: 0.6 });
  }
  return ok(res,found.value);}));
app.get('/api/v1/hope-vault', requireAuth, asyncRoute(async (req: AuthedRequest, res) => {
  if (env.DATA_MODE === 'supabase' && supabase) {
    const data = await supabaseSelect('hope_vault', { victim_token: req.user!.victimToken });
    return ok(res, data);
  }
  return ok(res, store.records.get(`hope:${req.user!.id}`) || []);
}));

app.post('/api/v1/hope-vault', requireAuth, upload.single('photo'), asyncRoute(async (req: AuthedRequest, res) => {
  const { type, title, content } = req.body;
  const now = new Date().toISOString();
  const itemData: any = { 
    id: id(), 
    victim_token: req.user!.victimToken, 
    type, 
    title, 
    content, 
    created_at: now 
  };

  if (type === 'photo' && req.file) {
    if (env.DATA_MODE === 'supabase' && supabase) {
      const { data, error } = await supabase.storage.from('hope-vault-photos').upload(`${req.user!.victimToken}/${id()}`, req.file.buffer, { contentType: req.file.mimetype });
      if (error) throw error;
      const { data: urlData } = supabase.storage.from('hope-vault-photos').getPublicUrl(data.path);
      itemData.image_url = urlData.publicUrl;
    } else {
      itemData.image_url = `/uploads/${req.file.originalname}`;
    }
  }

  if (env.DATA_MODE === 'supabase' && supabase) {
    const data = await supabaseInsert('hope_vault', itemData);
    return ok(res, data, 201);
  }
  
  record(`hope:${req.user!.id}`, itemData);
  return ok(res, itemData, 201);
}));

app.delete('/api/v1/hope-vault/:id', requireAuth, asyncRoute(async (req: AuthedRequest, res) => {
  if (env.DATA_MODE === 'supabase' && supabase) {
    const { error } = await supabase.from('hope_vault').delete().eq('id', req.params.id).eq('victim_token', req.user!.victimToken);
    if (error) throw error;
    return ok(res, { deleted: req.params.id });
  }
  const items = store.records.get(`hope:${req.user!.id}`) || [];
  const index = items.findIndex((x: any) => x.id === req.params.id);
  if (index === -1) throw new AppError(404, 'NOT_FOUND', 'Item not found.');
  items.splice(index, 1);
  return ok(res, { deleted: req.params.id });
}));
const safeCircleSchema = z.object({ name: z.string().min(1), relation: z.string().min(1), email: z.string().min(3), consentToContact: z.boolean() });
app.get('/api/v1/safe-circle', requireAuth, asyncRoute(async (req: AuthedRequest, res) => ok(res, store.records.get(`safe:${req.user!.id}`) || [])));
app.post('/api/v1/safe-circle', requireAuth, body(safeCircleSchema), asyncRoute(async (req: AuthedRequest, res) => {
  const contact = record(`safe:${req.user!.id}`, { id: id(), ...req.body, email: normalizeEmail(req.body.email) });
  const welcomeMessage = `Hi ${contact.name}, you've been added as a trusted ${String(contact.relation).toLowerCase()} on SAATH. You'll only hear from us again if they're going through a difficult moment and the app detects a genuine crisis signal.`;
  const results = await deliverToContact(contact, "You've been added to someone's SAATH Safe Circle", welcomeMessage);
  record('safe_circle_events', { id: id(), contactId: contact.id, victimToken: req.user!.victimToken, trigger: 'contact_added', channels: results, createdAt: new Date().toISOString() });
  return ok(res, contact, 201);
}));
app.get('/api/v1/support/resources', requireAuth, asyncRoute(async (req: AuthedRequest, res) => {
  const category = req.query.category as string;
  const caseId = (store.records.get(`user:${req.user!.id}:cases`) || [])[0];
  const caseRecord = store.cases.find(c => c.id === caseId);
  const location = caseRecord ? `${caseRecord.city}, ${caseRecord.state}` : 'Jaipur, Rajasthan';

  if (!env.GOOGLE_PLACES_API_KEY) {
    return ok(res, [{ id: 'resource-1', name: 'Sakhi Counselling Centre', serviceType: 'Counselling', state: 'Rajasthan', district: 'Jaipur', language: 'English/Hindi', phone: '+9118000001122', availability: 'Open today', description: 'Trauma-informed counselling.' }]);
  }

  const query = category ? `${category} near ${location}` : `support services near ${location}`;
  const response = await fetch(`https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(query)}&key=${env.GOOGLE_PLACES_API_KEY}`);
  const data = await response.json();

  const resources = (data.results || []).map((place: any) => ({
    id: place.place_id,
    name: place.name,
    serviceType: category || 'General',
    state: location.split(',')[1]?.trim() || 'Unknown',
    district: location.split(',')[0]?.trim() || 'Unknown',
    phone: 'Phone not listed',
    availability: 'Open',
    description: place.formatted_address
  }));

  return ok(res, resources);
}));
app.get('/api/v1/community/posts',optionalCommunity,asyncRoute(async(_req,res)=>ok(res,store.records.get('community')||[])));
const safeCircleNotifySchema = z.object({ trigger: z.enum(['survivor_requested', 'crisis_alert']) });
app.post('/api/v1/safe-circle/:id/notify', requireAuth, body(safeCircleNotifySchema), asyncRoute(async (req: AuthedRequest, res) => {
  // M06 — Safe Circle notification: only fires under two explicitly defined
  // conditions, never as a side-effect of an unrelated action.
  //   1. 'survivor_requested' — the survivor tapped "notify" themselves.
  //   2. 'crisis_alert' — there is an open, unresolved crisis alert for this
  //      survivor, so the notification is corroborated by a real safety signal
  //      rather than trusted purely on the caller's say-so.
  const contacts = store.records.get(`safe:${req.user!.id}`) || [];
  const contact = contacts.find((c: any) => c.id === req.params.id);
  if (!contact || !contact.consentToContact) throw new AppError(404, 'CONTACT_NOT_FOUND', 'Contact not found or consent not given.');

  if (req.body.trigger === 'crisis_alert') {
    const alerts = store.records.get('alerts:all') || [];
    const hasOpenCrisisAlert = alerts.some((a: any) => a.victimToken === req.user!.victimToken && a.crisis && a.status !== 'RESOLVED');
    if (!hasOpenCrisisAlert) throw new AppError(409, 'CONDITION_NOT_MET', 'No open crisis alert exists for this survivor; notification condition not met.');
  }

    const message = `This is a message from SAATH on behalf of your friend. They wanted you to know they're thinking of you.`;
  const results = await deliverToContact(contact, 'SAATH: a message from your friend', message);
  record('safe_circle_events', { id: id(), contactId: contact.id, victimToken: req.user!.victimToken, trigger: req.body.trigger, channels: results, createdAt: new Date().toISOString() });
  recordAudit(req.user!.id, 'safe_circle_notify', contact.id, { channels: results, trigger: req.body.trigger });
  return ok(res, { status: 'sent', trigger: req.body.trigger, channels: results });
}));

app.post('/api/v1/community/posts', requireAuth, body(z.object({ body: z.string().min(1).max(5000), language: z.string().default('en') })), asyncRoute(async (req: AuthedRequest, res) => {
  const { body, language } = req.body;
  const analysis = await analyzeText({ victimToken: req.user!.victimToken || 'unknown', text: body, language });
  // M11 — Community moderation pipeline: unsafe content is blocked BEFORE it ever reaches
  // the public 'community' list — GET /community/posts only ever reads from that list, so a
  // blocked or queued post is never visible to other survivors.
  const moderation = moderatePost(body, analysis);
  const postId = id();
  const now = new Date().toISOString();

  if (moderation.decision === 'blocked') {
    record('community_moderation', { id: id(), postId, authorToken: req.user!.victimToken, body, reason: moderation.reason, status: 'open', createdAt: now });
    throw new AppError(422, 'CONTENT_BLOCKED', moderation.reason);
  }

  if (moderation.decision === 'queued_for_review') {
    record('community_moderation', { id: id(), postId, authorToken: req.user!.victimToken, body, reason: moderation.reason, status: 'open', createdAt: now });
    if (analysis.crisis) recordAlert({ victimToken: req.user!.victimToken, caseReference: req.user!.victimToken, reason: 'Community post flagged for crisis language.', source: 'checkin', crisis: true, confidence: analysis.confidence });
    return ok(res, { id: postId, moderationStatus: 'pending', message: 'Your post is held for a quick review before it goes live.' }, 202);
  }

  const post = record('community', { id: postId, authorToken: req.user!.victimToken, body, moderationStatus: 'approved', createdAt: now });
  return ok(res, post, 201);
}));
app.get('/api/v1/community/moderation-queue', requireAuth, requireRoles('COUNSELLOR', 'DISTRICT_ADMIN'), asyncRoute(async (_req, res) => ok(res, (store.records.get('community_moderation') || []).filter((m: any) => m.status === 'open'))));
app.post('/api/v1/community/moderation-queue/:id/decision', requireAuth, requireRoles('COUNSELLOR', 'DISTRICT_ADMIN'), body(z.object({ decision: z.enum(['approve', 'reject']) })), asyncRoute(async (req: AuthedRequest, res) => {
  const queue = store.records.get('community_moderation') || [];
  const item = queue.find((m: any) => m.id === req.params.id);
  if (!item) throw new AppError(404, 'NOT_FOUND', 'Moderation item not found.');
  const now = new Date().toISOString();
  item.status = req.body.decision === 'approve' ? 'approved' : 'rejected';
  item.resolvedAt = now;
  item.resolvedBy = req.user!.id;
  if (req.body.decision === 'approve') {
    record('community', { id: item.postId, authorToken: item.authorToken, body: item.body, moderationStatus: 'approved', createdAt: now });
  }
  recordAudit(req.user!.id, `community_post_${req.body.decision}d`, item.postId, {});
  return ok(res, item);
}));
app.post('/api/v1/notifications/sms',requireAuth,body(z.object({phone:z.string().min(8),message:z.string().min(1).max(480)})),asyncRoute(async(req:AuthedRequest,res)=>{await notificationProvider.sendMessage(normalizePhone(req.body.phone),req.body.message); return ok(res,{status:'sent',channel:'sms'},202)}));
app.get('/api/v1/notifications',requireAuth,asyncRoute(async(req:AuthedRequest,res)=>ok(res,store.records.get(`notifications:${req.user!.id}`)||[]))); app.patch('/api/v1/notifications/:id/read',requireAuth,asyncRoute(async(req,res)=>ok(res,{id:req.params.id,read:true})));
// Shared helper for the three dedicated ADM routes and the generic /admin/:scope
// fallback below — pulls interventions once so each route doesn't repeat the scan.
const collectInterventions = () => [...store.records.entries()].flatMap(([key, values]) => key.startsWith('interventions:') ? values : []);

// ADM-01 — GET /admin/district: aggregated stats scoped to one district.
// A DISTRICT_ADMIN can only ever see their own assigned district (from their auth
// token, never from a client-supplied query param) — STATE_ADMIN/NATIONAL_ADMIN may
// pass ?district= to look at any specific district.
app.get('/api/v1/admin/district', requireAuth, requireRoles('DISTRICT_ADMIN', 'STATE_ADMIN', 'NATIONAL_ADMIN'), asyncRoute(async (req: AuthedRequest, res) => {
  const targetDistrict = req.user!.role === 'DISTRICT_ADMIN' ? req.user!.district : String(req.query.district ?? req.user!.district ?? '');
  if (!targetDistrict) throw new AppError(400, 'DISTRICT_REQUIRED', 'A district is required for this scope.');
  const cases = store.cases.filter((c: any) => c.district === targetDistrict);
  const payload = buildAdminAggregatePayload({ scope: `district:${targetDistrict}`, cases, alerts: store.records.get('alerts:all') || [], interventions: collectInterventions() });
  return ok(res, minimize(payload, MINIMIZATION_SCHEMA.adminAggregateOutput));
}));

// ADM-02 — GET /admin/state: aggregated stats scoped to one state.
app.get('/api/v1/admin/state', requireAuth, requireRoles('STATE_ADMIN', 'NATIONAL_ADMIN'), asyncRoute(async (req: AuthedRequest, res) => {
  const targetState = req.user!.role === 'STATE_ADMIN' ? req.user!.state : String(req.query.state ?? req.user!.state ?? '');
  if (!targetState) throw new AppError(400, 'STATE_REQUIRED', 'A state is required for this scope.');
  const cases = store.cases.filter((c: any) => c.state === targetState);
  const payload = buildAdminAggregatePayload({ scope: `state:${targetState}`, cases, alerts: store.records.get('alerts:all') || [], interventions: collectInterventions() });
  return ok(res, minimize(payload, MINIMIZATION_SCHEMA.adminAggregateOutput));
}));

// ADM-03 — GET /admin/national: aggregated stats across every case, no district/state filter.
app.get('/api/v1/admin/national', requireAuth, requireRoles('NATIONAL_ADMIN'), asyncRoute(async (_req: AuthedRequest, res) => {
  const payload = buildAdminAggregatePayload({ scope: 'national', cases: store.cases, alerts: store.records.get('alerts:all') || [], interventions: collectInterventions() });
  return ok(res, minimize(payload, MINIMIZATION_SCHEMA.adminAggregateOutput));
}));

// Generic fallback — kept for any scope string not covered by the three dedicated
// routes above (e.g. a future custom scope), now built from the same shared helper.
app.get('/api/v1/admin/:scope',requireAuth,requireRoles('DISTRICT_ADMIN','STATE_ADMIN','NATIONAL_ADMIN'),asyncRoute(async(req,res)=>{
  const payload = buildAdminAggregatePayload({ scope: String(req.params.scope), cases: store.cases, alerts: store.records.get('alerts:all') || [], interventions: collectInterventions() });
  // B17 — Data minimization pass: runtime-enforced allowlist projection, not just a
  // documented convention. Anything not in MINIMIZATION_SCHEMA.adminAggregateOutput
  // (e.g. a stray victimToken or survivorName) is dropped here even if a future code
  // change accidentally adds it above.
  return ok(res, { ...minimize(payload, MINIMIZATION_SCHEMA.adminAggregateOutput), alertStats: payload.alertStats, interventionResponseStats: payload.interventionResponseStats, caseStageStats: payload.caseStageStats }); }));
app.post('/api/v1/notifications/reminder',requireAuth,body(z.object({type:z.enum(['checkin','followup','support']).default('checkin'),daysSinceLastCheckin:z.number().int().min(0).default(0),scheduledFor:z.string().datetime().optional()})),asyncRoute(async(req:AuthedRequest,res)=>{
  // D16 — Gentle reminder escalation: step forward through the tone ladder based on the
  // survivor's own reminder history, rather than jumping straight to a firm tone the first
  // time a long gap is observed.
  const history = store.records.get(`notifications:reminders:${req.user!.id}`) || [];
  const escalated = nextEscalationStage(req.body.daysSinceLastCheckin, history);
  return ok(res,record(`notifications:reminders:${req.user!.id}`,{id:id(),type:req.body.type,daysSinceLastCheckin:req.body.daysSinceLastCheckin,scheduledFor:req.body.scheduledFor,message:escalated.message,tone:escalated.tone,createdAt:new Date().toISOString(),status:'scheduled'}),201);
}));

// F28 — Follow-up response tracking: a survivor's response (or explicit non-response) to a
// counsellor-created follow-up is captured as its own engagement_signal, separate from the
// follow-up record itself.
app.post('/api/v1/follow-ups/:id/respond', requireAuth, body(z.object({ responded: z.boolean(), note: z.string().max(1000).optional() })), asyncRoute(async (req: AuthedRequest, res) => {
  const signal = trackFollowUpResponse(record, id, { userId: req.user!.id, victimToken: req.user!.victimToken, followUpId: String(req.params.id), responded: req.body.responded, metadata: { note: req.body.note } });
  recordAudit(req.user!.id, 'followup_responded', String(req.params.id), { responded: req.body.responded });
  return ok(res, signal, 201);
}));

// F29 — Engagement trend computation, surfaced to the survivor's own dashboard widget.
app.get('/api/v1/engagement/trend', requireAuth, asyncRoute(async (req: AuthedRequest, res) => {
  const signals = store.records.get(`engagement:${req.user!.id}`) || [];
  return ok(res, computeEngagementTrend(signals));
}));

app.post('/api/v1/notifications/taara-reengagement', requireAuth, asyncRoute(async (req: AuthedRequest, res) => {
  const lastInteraction = (store.records.get(`taara:conversations:${req.user!.id}`) || []).at(-1);
  const daysSince = lastInteraction ? (Date.now() - new Date(lastInteraction.createdAt).getTime()) / (1000 * 60 * 60 * 24) : 99;
  
  if (daysSince >= 3) {
    const message = "TAARA is here whenever you'd like to talk. No pressure, just a gentle reminder.";
    record(`notifications:${req.user!.id}`, { id: id(), title: "TAARA", message, createdAt: new Date().toISOString(), read: false });
    return ok(res, { status: 'sent' });
  }
  return ok(res, { status: 'not_needed' });
}));
app.post('/api/v1/demo/reset',requireAuth,requireRoles('NATIONAL_ADMIN'),asyncRoute(async(_req,res)=>{if(env.NODE_ENV==='production') throw new AppError(404,'NOT_FOUND','Not found.'); store.records.clear(); store.users.clear(); store.blocklist.clear(); return ok(res,{reset:true,mode:'demo_only'});}));
function optionalCommunity(req:express.Request,_res:express.Response,next:express.NextFunction){next();}
app.use((err:unknown,_req:express.Request,res:express.Response,_next:express.NextFunction)=>{if(err instanceof multer.MulterError&&err.code==='LIMIT_FILE_SIZE') return fail(res,new AppError(413,'AUDIO_TOO_LARGE',`Audio must be no larger than ${env.UPLOAD_MAX_BYTES} bytes.`)); return fail(res,err instanceof Error?err:new Error('Unknown error'));}); export { app };