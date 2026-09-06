import express from 'express';
import cors from 'cors'; import helmet from 'helmet'; import rateLimit from 'express-rate-limit'; import multer from 'multer';
import jwt from 'jsonwebtoken';
import { z } from 'zod'; import { randomUUID } from 'node:crypto';
import { corsOrigins, env } from './config/env.js'; import { store, id } from './db/store.js'; import { AppError, asyncRoute, fail, ok, requestId } from './utils/http.js'; import { normalizePhone, notificationProvider } from './services/notifications.js'; import { requireAuth, requireRoles, signUser, type AuthedRequest } from './middleware/auth.js'; import { analyzeText, analyzeVoice } from './services/ml.js'; import { respondToTaara } from './services/taara/index.js'; import { findEligibleCase } from './services/case/case.service.js';
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
    // Equivalent, active alerts for the same survivor and reason are collapsed
    // for 15 minutes.  The event remains visible through occurrenceCount and
    // lastSeenAt, without creating an unlimited active-alert queue.
    existing.occurrenceCount = (existing.occurrenceCount ?? existing.count ?? 1) + 1;
    existing.count = existing.occurrenceCount;
    existing.lastSeenAt = now;
    record('audit:alerts', { id: id(), alertId: existing.id, action: 'alert_updated', actor: 'system', details: { reason: 'deduplicated equivalent alert' }, createdAt: now });
    return existing;
  }
  const created = record('alerts:all', { id: id(), ...normalized, caseReference: payload.caseReference ?? payload.victimToken, victimToken: payload.victimToken ?? payload.caseReference, createdAt: now, updatedAt: now });
  record('audit:alerts', { id: id(), alertId: created.id, action: 'alert_created', actor: 'system', details: { source: payload.source ?? 'manual' }, createdAt: now });
  return created;
};
const recordAudit = (actor: string, action: string, target: string, details?: Record<string, unknown>) => record('audit:alerts', { id: id(), actor, action, target, details: details ?? {}, createdAt: new Date().toISOString() });
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
const safeCase = (c: any) => ({ id:c.id, reference_id:c.docket, docket_id:c.docket, docket:c.docket, victimToken:c.victimToken, state:c.state, district:c.district, currentStage:c.currentStage, caseCategory:c.caseCategory, preferredLanguage:c.preferredLanguage, isSynthetic:true });
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
app.get('/api/v1/cases/:id',requireAuth,asyncRoute(async(req:AuthedRequest,res)=>{const c=store.cases.find(x=>x.id===req.params.id||x.victimToken===req.params.id||x.docket===req.params.id); if(!c) throw new AppError(404,'CASE_NOT_FOUND','Case not found.'); if(req.user!.role==='SURVIVOR'&&req.user!.victimToken!==c.victimToken&&!(store.records.get(`user:${req.user!.id}:cases`)||[]).includes(c.id)) throw new AppError(403,'FORBIDDEN','You can only access your own case.'); return ok(res,safeCase(c));}));
app.get('/api/v1/cases/:id/timeline',requireAuth,asyncRoute(async(req,res)=>ok(res,store.timelines.filter(x=>x.caseId===req.params.id))));
const consentSchema=z.union([
  z.object({consent_type:z.enum(['wellbeing_monitoring','text_analysis','voice_analysis','behavioural_signals']),granted:z.boolean(),version:z.string().min(1).max(80).default('1.0')}),
  z.object({monitoring:z.boolean(),voice:z.boolean().default(false),text:z.boolean().default(false),behavioural:z.boolean().default(false),version:z.string().min(1).max(80).default('1.0')})
]);
app.post('/api/v1/consents',requireAuth,body(consentSchema),asyncRoute(async(req:AuthedRequest,res)=>{const now=new Date().toISOString(); const selections='consent_type' in req.body ? [{type:req.body.consent_type,granted:req.body.granted}] : [{type:'wellbeing_monitoring',granted:req.body.monitoring},{type:'text_analysis',granted:req.body.text},{type:'voice_analysis',granted:req.body.voice},{type:'behavioural_signals',granted:req.body.behavioural}]; const records=selections.map(({type,granted})=>record(`consent:${req.user!.id}`,{id:id(),userId:req.user!.id,consentType:type,consentVersion:req.body.version,state:granted?'GRANTED':'REVOKED',grantedAt:granted?now:null,revokedAt:granted?null:now,createdAt:now})); return ok(res,records,201)}));
app.get('/api/v1/consents',requireAuth,asyncRoute(async(req:AuthedRequest,res)=>ok(res,store.records.get(`consent:${req.user!.id}`)||[])));
app.post('/api/v1/monitoring/:action',requireAuth,body(z.object({reason:z.string().max(500).optional()})),asyncRoute(async(req:AuthedRequest,res)=>{const action=String(req.params.action); if(!['pause','resume','stop'].includes(action)) throw new AppError(404,'NOT_FOUND','Monitoring action not found.'); return ok(res,record(`monitoring:${req.user!.id}`,{state:action==='pause'?'paused':action==='stop'?'stopped':'active',reason:req.body.reason,createdAt:new Date().toISOString()}));}));
const checkinSchema=z.object({victimToken:z.string().optional(),mood:z.number().int().min(1).max(5).optional(),sleep:z.number().int().min(1).max(5).optional(),fear:z.number().int().min(1).max(5).optional(),intrusion:z.number().int().min(1).max(5).optional(),avoidance:z.number().int().min(1).max(5).optional(),perceivedSafety:z.number().int().min(1).max(5).optional(),dailyFunctioning:z.number().int().min(1).max(5).optional(),socialConnectedness:z.number().int().min(1).max(5).optional(),text:z.string().max(10000).optional(),language:z.string().default('en')});
app.post('/api/v1/check-ins/mood',requireAuth,requireMonitoringConsent,body(checkinSchema.extend({mood:z.number().int().min(1).max(5),sleep:z.number().int().min(1).max(5),perceivedSafety:z.number().int().min(1).max(5),socialConnectedness:z.number().int().min(1).max(5)})),asyncRoute(async(req:AuthedRequest,res)=>{const summary=`Structured check-in: mood ${req.body.mood}/5, sleep ${req.body.sleep}/5, fear ${req.body.fear??'not answered'}/5, unwanted memories ${req.body.intrusion??'not answered'}/5, safety ${req.body.perceivedSafety}/5, social connection ${req.body.socialConnectedness}/5.`; const ml=await analyzeText({victimToken:req.user!.victimToken||'unknown',text:summary}); const result=record(`checkins:${req.user!.id}`,{id:id(),type:'mood',...req.body,ml,createdAt:new Date().toISOString(),analyticalState:ml.confidence<.5?'insufficient_evidence':'scored'}); if(ml.crisis) recordAlert({victimToken:req.user!.victimToken,caseReference:req.user!.victimToken,reason:'Structured check-in requires human review.',source:'checkin',crisis:true,confidence:ml.confidence}); return ok(res,result,201)}));
app.post('/api/v1/check-ins/quick-mood',requireAuth,requireMonitoringConsent,body(z.object({mood:z.number().int().min(1).max(5),label:z.string().min(1).max(80)})),asyncRoute(async(req:AuthedRequest,res)=>{const ml=await analyzeText({victimToken:req.user!.victimToken||'unknown',text:`Quick wellbeing check-in: the survivor selected mood "${req.body.label}" (${req.body.mood}/5).`}); const result=record(`checkins:${req.user!.id}`,{id:id(),type:'quick_mood',mood:req.body.mood,label:req.body.label,ml,createdAt:new Date().toISOString(),analyticalState:ml.confidence<.5?'insufficient_evidence':'scored'}); return ok(res,result,201)}));
app.post('/api/v1/check-ins/text',requireAuth,requireConsent('text_analysis'),body(checkinSchema.extend({text:z.string().trim().min(1).max(10000)})),asyncRoute(async(req:AuthedRequest,res)=>{const ml=await analyzeText({victimToken:req.user!.victimToken||'unknown',text:req.body.text,language:req.body.language}); const result=record(`checkins:${req.user!.id}`,{id:id(),type:'text',victimToken:req.user!.victimToken,textSubmitted:true,ml,createdAt:new Date().toISOString(),analyticalState:ml.status==='unavailable'||ml.insufficientEvidence?'insufficient_evidence':'scored'}); if(ml.crisis) recordAlert({victimToken:req.user!.victimToken,caseReference:req.user!.victimToken,reason:'Crisis safety screening requires human review.',source:'text',crisis:true,confidence:ml.confidence}); return ok(res,result,201); }));
app.get('/api/v1/monitoring/baseline',requireAuth,asyncRoute(async(req:AuthedRequest,res)=>{
  const observations = store.records.get(`checkins:${req.user!.id}`) || [];
  const baseline = observations.length > 0 ? observations[0].ml : { distressScore: null, recoveryScore: null, confidence: 0, insufficientEvidence: true };
  return ok(res, { baseline: baseline.distressScore, recovery: baseline.recoveryScore, confidence: baseline.confidence, trend: 'stable', timestamp: new Date().toISOString(), insufficientEvidence: baseline.insufficientEvidence });
}));
app.get('/api/v1/monitoring/distress',requireAuth,asyncRoute(async(req:AuthedRequest,res)=>{
  const observations = store.records.get(`checkins:${req.user!.id}`) || [];
  const latest = observations.at(-1)?.ml ?? { distressScore: null, confidence: 0, insufficientEvidence: true };
  return ok(res, { score: latest.distressScore, confidence: latest.confidence, trend: 'stable', contributingFactors: latest.contributingFactors ?? [], insufficientEvidence: latest.insufficientEvidence, timestamp: new Date().toISOString() });
}));
app.get('/api/v1/monitoring/recovery',requireAuth,asyncRoute(async(req:AuthedRequest,res)=>{
  const observations = store.records.get(`checkins:${req.user!.id}`) || [];
  const latest = observations.at(-1)?.ml ?? { recoveryScore: null, confidence: 0, insufficientEvidence: true };
  return ok(res, { score: latest.recoveryScore, confidence: latest.confidence, trend: 'stable', contributingFactors: latest.contributingFactors ?? [], insufficientEvidence: latest.insufficientEvidence, timestamp: new Date().toISOString() });
}));
app.get('/api/v1/monitoring/trends',requireAuth,asyncRoute(async(req:AuthedRequest,res)=>{
  const observations = store.records.get(`checkins:${req.user!.id}`) || [];
  return ok(res, { distressTrend: [], recoveryTrend: [], baselineComparison: 'stable', recentObservations: observations.slice(-5) });
}));
app.get('/api/v1/alerts',requireAuth,asyncRoute(async(req:AuthedRequest,res)=>{
  const allAlerts = store.records.get('alerts:all') || [];
  const filtered = req.user!.role === 'SURVIVOR' ? allAlerts.filter((a:any) => a.victimToken === req.user!.victimToken) : allAlerts;
  return ok(res, filtered);
}));
app.post('/api/v1/alerts/:id/acknowledge',requireAuth,asyncRoute(async(req:AuthedRequest,res)=>{
  const alerts = store.records.get('alerts:all') || [];
  const alert = alerts.find((a:any) => a.id === req.params.id);
  if(!alert) throw new AppError(404,'ALERT_NOT_FOUND','Alert not found.');
  alert.status = 'ACKNOWLEDGED';
  alert.updatedAt = new Date().toISOString();
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
  return ok(res, alert);
}));
app.post('/api/v1/ai/taara',requireAuth,requireMonitoringConsent,body(z.object({message:z.string().min(1).max(4000),caseId:z.string().optional()})),asyncRoute(async(req:AuthedRequest,res)=>{const {analysis,reply:generated}=await respondToTaara({victimToken:req.user!.victimToken||'unknown',message:req.body.message}); const safetyState=analysis.crisis?'urgent_support':analysis.confidence<.5?'uncertain':'supportive'; const alert=analysis.crisis?recordAlert({victimToken:req.user!.victimToken,caseReference:req.user!.victimToken,reason:'TAARA message requires human review.',source:'taara',crisis:true,confidence:analysis.confidence}):undefined; record('taara:conversations',{id:id(),victimToken:req.user!.victimToken,createdAt:new Date().toISOString(),safetyState,confidence:analysis.confidence,modelVersion:generated.model}); return ok(res,{reply:generated.reply,safetyState,suggestedAction:generated.suggestedAction,crisis_detected:analysis.crisis,priority:alert?.priority,human_review_required:analysis.crisis,analysis:{confidence:analysis.confidence,provider:generated.provider,model:generated.model}}); }));
const upload=multer({storage:multer.memoryStorage(),limits:{fileSize:env.UPLOAD_MAX_BYTES},fileFilter:(_req,file,cb)=>{if(!['audio/mpeg','audio/wav','audio/webm','audio/mp4'].includes(file.mimetype)) return cb(new AppError(400,'INVALID_AUDIO_MIME','Only MPEG, WAV, WebM, or MP4 audio is accepted.')); cb(null,true);}});
app.post('/api/v1/check-ins/voice',requireAuth,requireConsent('voice_analysis'),upload.single('audio'),asyncRoute(async(req:AuthedRequest,res)=>{if(!req.file) throw new AppError(400,'AUDIO_REQUIRED','A supported audio file is required.'); try { const voice=await analyzeVoice({victimToken:req.user!.victimToken||'unknown',audio:req.file.buffer,mimeType:req.file.mimetype,language:(req.body as {language?:string}).language}); const result=record(`checkins:${req.user!.id}`,{id:id(),type:'voice',victimToken:req.user!.victimToken,transcriptAvailable:true,ml:voice.analysis,rawAudioRetained:false,createdAt:new Date().toISOString(),analyticalState:voice.analysis.status==='unavailable'||voice.analysis.insufficientEvidence?'insufficient_evidence':'scored'}); if(voice.analysis.crisis) recordAlert({victimToken:req.user!.victimToken,caseReference:req.user!.victimToken,reason:'Voice check-in requires human review.',source:'voice',crisis:true,confidence:voice.analysis.confidence}); return ok(res,{...result,transcript:voice.transcript},201); } catch { throw new AppError(503,'VOICE_ANALYSIS_UNAVAILABLE','Voice transcription is temporarily unavailable. Please try a text check-in.'); }}));
app.post('/api/v1/check-ins/ivrs',requireAuth,requireMonitoringConsent,body(z.object({language:z.string().default('en'),responses:z.record(z.string()).default({}),requestCounsellorCall:z.boolean().default(false),provider:z.enum(['simulated','production']).default('simulated')})),asyncRoute(async(req:AuthedRequest,res)=>{const result=record(`checkins:${req.user!.id}`,{id:id(),type:'ivrs',...req.body,createdAt:new Date().toISOString(),analyticalState:'insufficient_evidence'}); if(req.body.requestCounsellorCall) recordAlert({victimToken:req.user!.victimToken,caseReference:req.user!.victimToken,reason:'Survivor requested a counsellor phone call after IVRS check-in.',source:'ivrs',requestedSupport:true,channel:'phone_call'}); return ok(res,result,201)}));
app.post('/api/v1/check-ins/ivrs/webhook',body(z.object({phone:z.string(),sessionId:z.string(),responses:z.record(z.string())})),asyncRoute(async(req,res)=>ok(res,{accepted:true,mode:'simulated',sessionId:req.body.sessionId},202)));
app.get('/api/v1/check-ins/history',requireAuth,asyncRoute(async(req:AuthedRequest,res)=>ok(res,store.records.get(`checkins:${req.user!.id}`)||[])));
app.get('/api/v1/monitoring/:kind',requireAuth,asyncRoute(async(req:AuthedRequest,res)=>{
  // Silence is not a crisis signal; missing check-ins must remain insufficient evidence rather than escalating automatically.
  const records = store.records.get(`checkins:${req.user!.id}`) || [];
  return ok(res,{kind:req.params.kind,state:'insufficient_evidence',score:null,confidence:null,factors:[],modelVersion:'not_available',victimToken:req.user!.victimToken,records,summary: records.length ? 'observed' : 'no_data'});
}));
app.post('/api/v1/alerts/:id/:action',requireAuth,requireRoles('COUNSELLOR','DISTRICT_ADMIN','STATE_ADMIN','NATIONAL_ADMIN'),body(z.object({note:z.string().max(1000).optional(),assigneeId:z.string().optional()})),asyncRoute(async(req:AuthedRequest,res)=>{const alerts=(store.records.get('alerts:all')||[]); const alert=alerts.find((x:any)=>x.id===req.params.id); if(!alert) throw new AppError(404,'ALERT_NOT_FOUND','Alert not found.'); const action=req.params.action; const now=new Date().toISOString(); if(action==='resolve'){ alert.status='RESOLVED'; alert.resolvedAt=now; } else if(action==='acknowledge'){ alert.status='ACKNOWLEDGED'; alert.acknowledgedAt=now; alert.firstAcknowledgedAt ??= now; } else if(action==='assign'){ if(!req.body.assigneeId) throw new AppError(400,'ASSIGNEE_REQUIRED','An assignee is required.'); alert.status='ASSIGNED'; alert.assigneeId=req.body.assigneeId; alert.firstAssignedAt ??= now; } else { throw new AppError(400,'INVALID_ACTION','Unsupported alert action.'); } alert.updatedAt=now; recordAudit(req.user!.id, `alert_${action}d`, alert.id, { note: req.body.note, assigneeId: req.body.assigneeId ?? null }); return ok(res,alert);}));
app.get('/api/v1/counsellor/cases',requireAuth,requireRoles('COUNSELLOR'),asyncRoute(async(_req,res)=>ok(res,store.cases)));
app.get('/api/v1/counsellor/cases/:id',requireAuth,requireRoles('COUNSELLOR'),asyncRoute(async(req,res)=>{const c=store.cases.find(x=>x.id===req.params.id); if(!c) throw new AppError(404,'CASE_NOT_FOUND','Case not found.'); return ok(res,{case:c,view:'summary',timeline:store.timelines.filter(x=>x.caseId===c.id)});}));
app.get('/api/v1/counsellor/cases/:id/:view',requireAuth,requireRoles('COUNSELLOR'),asyncRoute(async(req,res)=>{const c=store.cases.find(x=>x.id===req.params.id); if(!c) throw new AppError(404,'CASE_NOT_FOUND','Case not found.'); return ok(res,{case:c,view:String(req.params.view),timeline:store.timelines.filter(x=>x.caseId===c.id)});}));
app.get('/api/v1/counsellor/voice-checkins',requireAuth,requireRoles('COUNSELLOR'),asyncRoute(async(_req,res)=>{const items=[...store.records.entries()].flatMap(([key,values])=>values.filter((value:any)=>value.type==='voice').map((value:any)=>({id:value.id,submittedBy:key.replace('checkins:',''),victimToken:value.victimToken,createdAt:value.createdAt,analyticalState:value.analyticalState,transcript:value.transcript,analysis:value.ml}))); return ok(res,items)}));
app.post('/api/v1/counsellor/:resource',requireAuth,requireRoles('COUNSELLOR'),body(z.record(z.unknown())),asyncRoute(async(req:AuthedRequest,res)=>ok(res,record(`counsellor:${req.params.resource}`,{id:id(),actor:req.user!.id,...req.body,createdAt:new Date().toISOString()}),201)));
app.get('/api/v1/interventions/recommendations',requireAuth,asyncRoute(async(_req,res)=>ok(res,[{type:'breathing',label:'Breathing space'},{type:'grounding',label:'Grounding exercise'},{type:'listening',label:'Talk to a counsellor'},{type:'psychoeducation',label:'Understand what you are feeling'}])));
app.post('/api/v1/ai/recommend',requireAuth,body(z.object({context:z.string().optional()})),asyncRoute(async(_req,res)=>ok(res,[{type:'breathing',label:'Breathing space'},{type:'grounding',label:'Grounding exercise'},{type:'listening',label:'Talk to a counsellor'},{type:'psychoeducation',label:'Understand what you are feeling'}])));
app.post('/api/v1/interventions',requireAuth,body(z.object({type:z.string(),caseId:z.string().optional(),metadata:z.record(z.unknown()).optional()})),asyncRoute(async(req:AuthedRequest,res)=>{const now=new Date().toISOString(); return ok(res,record(`interventions:${req.user!.id}`,{id:id(),...req.body,status:'RECOMMENDED',recommendedAt:now,createdAt:now}),201)}));
app.post('/api/v1/interventions/:id/:action',requireAuth,body(z.object({}).passthrough()),asyncRoute(async(req:AuthedRequest,res)=>{const action=String(req.params.action); if(!['start','complete','skip'].includes(action)) throw new AppError(400,'INVALID_ACTION','Unsupported intervention action.'); const all=[...store.records.entries()].flatMap(([key, values])=>values.map((value:any)=>({key,value}))); const found=all.find(x=>x.key===`interventions:${req.user!.id}`&&x.value.id===req.params.id); if(!found) throw new AppError(404,'INTERVENTION_NOT_FOUND','Intervention not found.'); const now=new Date().toISOString(); Object.assign(found.value,action==='start'?{status:'STARTED',startedAt:now}:action==='complete'?{status:'COMPLETED',completedAt:now}:{status:'SKIPPED',skippedAt:now}); return ok(res,found.value);}));
app.post('/api/v1/interventions/:id/feedback',requireAuth,body(z.object({completed:z.boolean(),rating:z.number().min(1).max(5).optional(),note:z.string().max(1000).optional()})),asyncRoute(async(req,res)=>{const payload={id:req.params.id,...req.body,completedAt:new Date().toISOString()}; if(!req.body.completed && req.body.rating && req.body.rating <= 2) recordAlert({victimToken:'unknown',caseReference:'counsellor-review',reason:'Low intervention rating requires counsellor follow-up.',source:'intervention',requestedSupport:true,confidence:0.6}); return ok(res,payload); }));
app.get('/api/v1/hope-vault',requireAuth,asyncRoute(async(req:AuthedRequest,res)=>ok(res,store.records.get(`hope:${req.user!.id}`)||[]))); app.post('/api/v1/hope-vault',requireAuth,body(z.object({type:z.string(),title:z.string().max(200),content:z.string().max(10000)})),asyncRoute(async(req:AuthedRequest,res)=>ok(res,record(`hope:${req.user!.id}`,{id:id(),...req.body,createdAt:new Date().toISOString()}),201))); app.delete('/api/v1/hope-vault/:id',requireAuth,asyncRoute(async(req,res)=>ok(res,{deleted:req.params.id})));
app.get('/api/v1/safe-circle',requireAuth,asyncRoute(async(req:AuthedRequest,res)=>ok(res,store.records.get(`safe:${req.user!.id}`)||[]))); app.post('/api/v1/safe-circle',requireAuth,body(z.object({name:z.string().min(1),phone:z.string().min(8),consentToContact:z.boolean()})),asyncRoute(async(req:AuthedRequest,res)=>ok(res,record(`safe:${req.user!.id}`,{id:id(),...req.body,phone:normalizePhone(req.body.phone)}),201))); app.patch('/api/v1/safe-circle/:id',requireAuth,body(z.record(z.unknown())),asyncRoute(async(req,res)=>ok(res,{id:req.params.id,...req.body}))); app.delete('/api/v1/safe-circle/:id',requireAuth,asyncRoute(async(req,res)=>ok(res,{deleted:req.params.id})));
app.get('/api/v1/support/resources',asyncRoute(async(_req,res)=>ok(res,[{id:'resource-1',name:'Sakhi Counselling Centre',serviceType:'Counselling',state:'Rajasthan',district:'Jaipur',language:'English/Hindi',phone:'+9118000001122',availability:'Open today'}]))); app.get('/api/v1/support/resources/:id',asyncRoute(async(req,res)=>ok(res,{id:req.params.id})));
app.get('/api/v1/community/posts',optionalCommunity,asyncRoute(async(_req,res)=>ok(res,store.records.get('community')||[]))); app.post('/api/v1/community/posts',requireAuth,body(z.object({body:z.string().min(1).max(5000),language:z.string().default('en')})),asyncRoute(async(req:AuthedRequest,res)=>ok(res,record('community',{id:id(),authorToken:req.user!.victimToken,body:req.body.body,moderationStatus:'pending',createdAt:new Date().toISOString()}),201))); app.post('/api/v1/community/posts/:id/report',requireAuth,body(z.object({reason:z.string().min(1).max(500)})),asyncRoute(async(req,res)=>ok(res,{reported:req.params.id,reason:req.body.reason},202)));
app.post('/api/v1/notifications/sms',requireAuth,body(z.object({phone:z.string().min(8),message:z.string().min(1).max(480)})),asyncRoute(async(req:AuthedRequest,res)=>{await notificationProvider.sendMessage(normalizePhone(req.body.phone),req.body.message); return ok(res,{status:'sent',channel:'sms'},202)}));
app.get('/api/v1/notifications',requireAuth,asyncRoute(async(req:AuthedRequest,res)=>ok(res,store.records.get(`notifications:${req.user!.id}`)||[]))); app.patch('/api/v1/notifications/:id/read',requireAuth,asyncRoute(async(req,res)=>ok(res,{id:req.params.id,read:true})));
app.get('/api/v1/admin/:scope',requireAuth,requireRoles('DISTRICT_ADMIN','STATE_ADMIN','NATIONAL_ADMIN'),asyncRoute(async(req,res)=>{ const alerts = store.records.get('alerts:all') || []; const interventions = [...store.records.entries()].flatMap(([key, values]) => key.startsWith('interventions:') ? values : []); return ok(res,{scope:req.params.scope,privacyBoundary:'aggregated_only',caseCount:store.cases.length,alertCount:alerts.length,alertStats:{open:alerts.filter((a:any)=>a.status==='open').length,resolved:alerts.filter((a:any)=>a.status==='resolved').length,urgent:alerts.filter((a:any)=>a.severity==='urgent').length,support_request:alerts.filter((a:any)=>a.severity==='support_request').length},interventionResponseStats:{started:interventions.length,completed:interventions.filter((i:any)=>i.status==='completed').length,feedbackCount:interventions.filter((i:any)=>i.feedback).length},distressTrend:[],recoveryTrend:[],caseStageStats: Object.entries((store.cases||[]).reduce((acc, c:any) => { acc[c.currentStage] = (acc[c.currentStage] || 0) + 1; return acc; }, {} as Record<string, number>)).map(([label, count]) => ({label, count}))}); }));
app.post('/api/v1/notifications/reminder',requireAuth,body(z.object({type:z.enum(['checkin','followup','support']).default('checkin'),message:z.string().min(1).max(500),scheduledFor:z.string().datetime().optional()})),asyncRoute(async(req:AuthedRequest,res)=>ok(res,record(`notifications:reminders:${req.user!.id}`,{id:id(),...req.body,createdAt:new Date().toISOString(),status:'scheduled'}),201)));
app.post('/api/v1/demo/reset',requireAuth,requireRoles('NATIONAL_ADMIN'),asyncRoute(async(_req,res)=>{if(env.NODE_ENV==='production') throw new AppError(404,'NOT_FOUND','Not found.'); store.records.clear(); store.users.clear(); store.blocklist.clear(); return ok(res,{reset:true,mode:'demo_only'});}));
function optionalCommunity(req:express.Request,_res:express.Response,next:express.NextFunction){next();}
app.use((err:unknown,_req:express.Request,res:express.Response,_next:express.NextFunction)=>{if(err instanceof multer.MulterError&&err.code==='LIMIT_FILE_SIZE') return fail(res,new AppError(413,'AUDIO_TOO_LARGE',`Audio must be no larger than ${env.UPLOAD_MAX_BYTES} bytes.`)); return fail(res,err instanceof Error?err:new Error('Unknown error'));}); export { app };
