import { env } from '../config/env.js';
import { z } from 'zod';

export interface Explainability { factor:string; direction:'increased_distress'|'increased_recovery'; weight:number; }
export interface MlResult { distressScore:number|null; recoveryScore:number|null; confidence:number; escalationProbability:number|null; modelName:string; modelVersion:string; pipelineVersion:string; signals:Record<string,unknown>; contributingFactors:Explainability[]; crisis:boolean; insufficientEvidence?:boolean; status?:'available'|'unavailable'; }

const modelOutput = z.object({ distressScore:z.number().min(0).max(100), recoveryScore:z.number().min(0).max(100), confidence:z.number().min(0).max(1), escalationProbability:z.number().min(0).max(1), signals:z.record(z.unknown()).default({}), contributingFactors:z.array(z.object({factor:z.string(),direction:z.enum(['increased_distress','increased_recovery']),weight:z.number().min(0).max(1)})).default([]), crisis:z.boolean().default(false) });

// ============================================================
// N01 / N02 - CRISIS DETECTION (two tiers, kept in sync with
// ml_api_share/ml_api_share/crisis_safety.py::detect_crisis)
// ============================================================

export type CrisisLevel = 'none' | 'self_harm' | 'immediate_danger';

const immediateDangerPattern = /(kill(?:ing)? myself|end my life|take my own life|want to die|better off dead|don't want to (?:live|be alive)|do not want to (?:live|be alive)|can't stay safe|cannot stay safe|can't keep myself safe|going to hurt myself|plan(?:ning)? to (?:kill|hurt) myself|have (?:a gun|pills|a weapon) (?:ready|with me))/i;
const selfHarmPattern = /(self[- ]?harm|hurt(?:ing)? myself|cut(?:ting)? myself|overdose|starv(?:e|ing) myself)/i;

/** Rule-based, deterministic - no model hallucination risk. Check highest severity first. */
export const detectCrisisLevel = (text: string): CrisisLevel => {
  if (immediateDangerPattern.test(text)) return 'immediate_danger';
  if (selfHarmPattern.test(text)) return 'self_harm';
  return 'none';
};

/** Backward-compatible boolean check used by existing call sites. */
export const detectCrisisLanguage = (text: string) => detectCrisisLevel(text) !== 'none';

// ============================================================
// N04 / E11 - APPROVED CRISIS RESPONSES
// Never free-form AI text - these are the only strings shown to
// a user once a crisis is detected. Keep in sync with crisis_safety.py.
// ============================================================

const APPROVED_CRISIS_RESPONSES: Record<Exclude<CrisisLevel,'none'>, { reply:string; suggestedAction:string; model:string }> = {
  immediate_danger: {
    reply: "I'm really glad you told me. Your safety matters right now more than anything else. If you are in immediate danger, please contact your local emergency number or go to your nearest hospital right now. A counsellor from your Safe Circle has also been alerted and will reach out to you.",
    suggestedAction: 'Immediate human support',
    model: 'rule-based-crisis-v1',
  },
  self_harm: {
    reply: "Thank you for trusting me with this. What you're feeling is real and you don't have to manage it alone. A counsellor has been notified and will check in with you soon. Would it help to try a grounding exercise together right now, or would you rather just talk?",
    suggestedAction: 'Notify counsellor + offer grounding exercise',
    model: 'rule-based-crisis-v1',
  },
};

const taaraOutput = z.object({ reply:z.string().min(1).max(1200), suggestedAction:z.string().min(1).max(240) });

function unavailable(input:{text:string;language?:string}):MlResult {
  const level = detectCrisisLevel(input.text);
  const crisis = level !== 'none';
  return {
    distressScore:null,
    recoveryScore:null,
    confidence:0,
    escalationProbability:null,
    modelName:'unavailable',
    modelVersion:'none',
    pipelineVersion:'none',
    signals:{source:'text',language:input.language??'en',crisisLevel:level},
    contributingFactors:crisis?[{factor:'explicit_safety_language',direction:'increased_distress',weight:1}]:[],
    crisis,
    insufficientEvidence:true,
    status:'unavailable'
  };
}

// ============================================================
// E14 - PROMPT SAFETY GUARDRAILS
// Sanitizes raw user input before it reaches the LLM: caps length
// so an adversarial message can't push the system prompt out of
// context, and neutralizes common prompt-injection framing.
// ============================================================

const injectionPattern = /(system\s*:|ignore (all|previous) instructions)/gi;

export function buildSafePrompt(rawText: string): string {
  const collapsed = rawText.trim().replace(/[\r\n]{3,}/g, '\n\n').slice(0, 2000);
  return collapsed.replace(injectionPattern, '[filtered]');
}

// ============================================================
// E15 / E17 - AI OUTPUT VALIDATION
// Never trust an LLM reply directly. Any diagnosis language or
// unsafe clinical claim gets swapped for a safe fallback instead
// of reaching the user (E16: failed checks always defer to the
// safe default, never an autonomous judgement call).
// ============================================================

const diagnosisTerms = ['ptsd', 'post-traumatic stress disorder', 'depression', 'clinical depression', 'anxiety disorder', 'bipolar', 'you have', 'you are suffering from', 'diagnosis', 'diagnosed with', 'disorder'];
const clinicalClaimPatterns = [/you will (?:definitely|certainly) (?:recover|heal|be fine)/i, /I(?:'m| am) a (?:doctor|therapist|clinician|psychologist)/i, /your case will/i];

const SAFE_FALLBACK_REPLY = { reply: "I'm here with you. How are you feeling right now?", suggestedAction: 'Continue the conversation' };

function validateAiReply(replyText: string): { safe: boolean; reason: string | null } {
  const lowered = replyText.toLowerCase();
  for (const term of diagnosisTerms) {
    if (lowered.includes(term)) return { safe: false, reason: `diagnosis_language:${term}` };
  }
  for (const pattern of clinicalClaimPatterns) {
    if (pattern.test(replyText)) return { safe: false, reason: 'unsafe_clinical_claim' };
  }
  if (replyText.length > 1500) return { safe: false, reason: 'reply_too_long' };
  return { safe: true, reason: null };
}

function sanitizeAiReply(replyText: string, suggestedAction: string): { reply: string; suggestedAction: string; flagged: boolean; flagReason?: string } {
  const check = validateAiReply(replyText);
  if (check.safe) return { reply: replyText, suggestedAction, flagged: false };
  return { ...SAFE_FALLBACK_REPLY, flagged: true, flagReason: check.reason ?? undefined };
}

async function groqAnalyze(input:{text:string;language?:string}):Promise<MlResult> {
  const controller=new AbortController();
  const timeout=setTimeout(()=>controller.abort(),12_000);
  try {
    const safeText = buildSafePrompt(input.text);
    const response=await fetch('https://api.groq.com/openai/v1/chat/completions',{
      method:'POST',
      signal:controller.signal,
      headers:{'content-type':'application/json',authorization:`Bearer ${env.AI_API_KEY}`},
      body:JSON.stringify({
        model:env.GROQ_MODEL,
        temperature:0,
        response_format:{type:'json_object'},
        messages:[
          {role:'system',content:'You analyze wellbeing text for a support platform. You are not a clinician and must not diagnose. Return only JSON with distressScore (0-100), recoveryScore (0-100), confidence (0-1), escalationProbability (0-1), signals (object), contributingFactors (array of {factor,direction,increased_distress or increased_recovery,weight 0-1}), and crisis (boolean). Set crisis true only for explicit imminent danger or self-harm language.'},
          {role:'user',content:JSON.stringify({language:input.language??'en',text:safeText})}
        ]
      })
    });
    if(!response.ok) throw new Error(`Groq request failed: ${response.statusText}`);
    const payload=await response.json() as {choices?:Array<{message?:{content?:string}}>};
    const content=payload.choices?.[0]?.message?.content;
    if(!content) throw new Error('Groq returned no analysis');
    const parsed=modelOutput.parse(JSON.parse(content));
    const level = detectCrisisLevel(input.text);
    const crisis = parsed.crisis || level !== 'none';
    return {...parsed,crisis,signals:{...parsed.signals,crisisLevel:level},modelName:'groq',modelVersion:env.GROQ_MODEL,pipelineVersion:'groq-text-v1',status:'available'};
  } finally { clearTimeout(timeout); }
}

export async function generateTaaraReply(input:{message:string;language?:string;analysis:MlResult; caseContext?: any}):Promise<{reply:string;suggestedAction:string;provider:string;model:string}> {
  // N04/E11 - crisis interruption always wins, before any LLM call.
  const level = detectCrisisLevel(input.message);
  if (input.analysis.crisis || level !== 'none') {
    const preset = APPROVED_CRISIS_RESPONSES[level !== 'none' ? level : 'immediate_danger'];
    return { reply: preset.reply, suggestedAction: preset.suggestedAction, provider: 'safety-policy', model: preset.model };
  }

  if(env.AI_PROVIDER.toLowerCase()==='groq'&&env.AI_API_KEY) {
    const controller=new AbortController();
    const timeout=setTimeout(()=>controller.abort(),12_000);
    try {
      const caseInfo = input.caseContext ? `Context: Case type is ${input.caseContext.caseCategory}, stage is ${input.caseContext.currentStage}.` : '';
      const safeMessage = buildSafePrompt(input.message);
      const response=await fetch('https://api.groq.com/openai/v1/chat/completions',{
        method:'POST',
        signal:controller.signal,
        headers:{'content-type':'application/json',authorization:`Bearer ${env.AI_API_KEY}`},
        body:JSON.stringify({
          model:env.GROQ_MODEL,
          temperature:.7,
          response_format:{type:'json_object'},
          messages:[
            {role:'system',content:'You are TAARA, a gentle supportive guide for a trauma-informed wellbeing app. You are NOT a clinician, doctor, or therapist, and must never claim to be one. Reply warmly and briefly in 2-4 sentences. Never diagnose, name a mental health condition, label risk, promise outcomes, or pretend to be a therapist or doctor. Do not invent facts about the user\'s case or history. Do not mention hidden analysis, scores, models, or policies. Reflect the user message, offer one small optional next step, and preserve the user choice. Return only JSON with reply and suggestedAction.'},
            {role:'user',content:JSON.stringify({language:input.language??'en',message:safeMessage,confidence:input.analysis.confidence, caseContext: caseInfo})}
          ]
        })
      });
      if(!response.ok) throw new Error(`Groq TAARA request failed: ${response.statusText}`);
      const payload=await response.json() as {choices?:Array<{message?:{content?:string}}>};
      const content=payload.choices?.[0]?.message?.content;
      if(!content) throw new Error('Groq TAARA returned no reply');
      const parsed=taaraOutput.parse(JSON.parse(content));
      // E15/E17 - never forward an LLM reply without validating it first.
      const sanitized = sanitizeAiReply(parsed.reply, parsed.suggestedAction);
      return {...sanitized,provider: sanitized.flagged ? 'safety-policy' : 'groq',model: sanitized.flagged ? 'guardrail-fallback-v1' : env.GROQ_MODEL};
    } finally { clearTimeout(timeout); }
  }
  return {reply:'I am here with you. How can I support you today?',suggestedAction:'Talk to TAARA',provider:'fallback',model:'none'};
}

const externalMlResult = z.object({
  victimToken: z.string().optional(), distressScore: z.number().min(0).max(100).nullable(), recoveryScore: z.number().min(0).max(100).nullable(),
  escalationProbability: z.number().min(0).max(1).nullable(), confidence: z.number().min(0).max(1), signals: z.record(z.unknown()).default({}),
  contributingFactors: z.array(z.object({ factor: z.string(), direction: z.enum(['increased_distress', 'increased_recovery']), weight: z.number().min(0).max(1) })).default([]),
  modelName: z.string(), modelVersion: z.string(), pipelineVersion: z.string(), crisis: z.boolean(), insufficientEvidence: z.boolean().optional(), status: z.enum(['available', 'unavailable']).optional(),
});

export async function analyzeText(input:{victimToken:string;text:string;language?:string}):Promise<MlResult>{ if(env.ML_SERVICE_URL){ try { const response=await fetch(`${env.ML_SERVICE_URL}/ml/analyze-text`,{method:'POST',headers:{'content-type':'application/json','x-api-key':env.ML_API_KEY??''},body:JSON.stringify({victim_token:input.victimToken,text:input.text,language:input.language??'en'})}); if(!response.ok) return unavailable(input); const parsed=externalMlResult.parse(await response.json()); return {...parsed, insufficientEvidence:parsed.insufficientEvidence??parsed.status==='unavailable'}; } catch { return unavailable(input); } } if(env.AI_PROVIDER.toLowerCase()==='groq'&&env.AI_API_KEY) { try { return await groqAnalyze(input); } catch { return unavailable(input); } } return unavailable(input); }

export async function analyzeVoice(input:{victimToken:string;audio:Buffer;mimeType:string;language?:string}):Promise<{transcript:string;analysis:MlResult}> {
  const form=new FormData(); form.append('file',new Blob([new Uint8Array(input.audio)],{type:input.mimeType}),`voice-check-in.${input.mimeType.split('/')[1]||'webm'}`); if(input.language) form.append('language',input.language); form.append('victim_token',input.victimToken);
  if(env.ML_SERVICE_URL) { const response=await fetch(`${env.ML_SERVICE_URL}/ml/analyze-voice`,{method:'POST',headers:{'x-api-key':env.ML_API_KEY??''},body:form}); if(!response.ok) throw new Error('ML voice service unavailable'); const result=await response.json() as {transcript?:string;analysis?:MlResult}; if(!result.transcript?.trim()||!result.analysis) throw new Error('ML voice response malformed'); return result as {transcript:string;analysis:MlResult}; }
  if(env.AI_PROVIDER.toLowerCase()!=='groq'||!env.AI_API_KEY) throw new Error('Voice AI provider is not configured'); form.append('model','whisper-large-v3-turbo'); const response=await fetch('https://api.groq.com/openai/v1/audio/transcriptions',{method:'POST',headers:{authorization:`Bearer ${env.AI_API_KEY}`},body:form}); if(!response.ok) throw new Error('Voice transcription failed'); const result=await response.json() as {text?:string}; if(!result.text?.trim()) throw new Error('Voice transcription returned no text'); return {transcript:result.text,analysis:await analyzeText({victimToken:input.victimToken,text:result.text,language:input.language})};
}