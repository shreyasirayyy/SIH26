import { z } from 'zod';
import { env } from '../config/env.js';

const sahayakOutput = z.object({
  escalation_probability: z.number().min(0).max(100),
  risk_level: z.enum(['LOW', 'MODERATE', 'HIGH', 'CRITICAL']),
  confidence: z.number().min(0).max(1),
  time_horizon: z.literal('7 days'),
  contributing_factors: z.array(z.string()),
  early_warning_signals: z.array(z.string()),
  recommended_followup: z.string(),
});

const SYSTEM_PROMPT = `You are SAATH's Sahayak Escalation Prediction Engine.

Estimate the likelihood of significant distress escalation within the next 7 days. Predict escalation, not simply current distress. Use current and previous distress, changes and trends, recent threats, court stress, financial distress, social isolation, sleep, engagement, missed check-ins, upcoming hearings, family conflict, counselling, legal aid, and rehabilitation together. A high current distress score alone is not critical if the trajectory is stable or improving.

Return ONLY valid JSON with exactly these fields: escalation_probability (0-100), risk_level (LOW|MODERATE|HIGH|CRITICAL), confidence (0-1), time_horizon (7 days), contributing_factors (concise evidence-based strings), early_warning_signals (concise evidence-based strings), recommended_followup (human follow-up only).

Never diagnose. Never claim certainty. Never fabricate missing information or infer sensitive information. Do not expose personally identifying information. This is decision support requiring human review. Confidence must not exceed 0.90 unless substantial longitudinal evidence is explicitly provided; with only current and previous distress plus one snapshot, confidence must be 0.60-0.85. Recommendations must not make autonomous medical, legal, police, relocation, hospitalization, or other high-impact decisions.`;

export type SahayakInput = {
  message: string;
  context?: Record<string, unknown>;
  history?: Array<{ role: 'user' | 'assistant'; text: string }>;
};

export type SahayakResult = z.infer<typeof sahayakOutput>;

function fallbackPrediction(message: string): SahayakResult {
  const urgent = /(unsafe|threat|threatened|can't cope|cannot cope|self[- ]harm|hurt myself|suicide|kill myself|danger)/i.test(message);
  return {
    escalation_probability: urgent ? 55 : 20,
    risk_level: urgent ? 'HIGH' : 'LOW',
    confidence: 0.6,
    time_horizon: '7 days',
    contributing_factors: urgent ? ['Recent message contains a safety concern'] : ['Not enough longitudinal evidence is available yet'],
    early_warning_signals: urgent ? ['Safety concern needs human review'] : [],
    recommended_followup: urgent ? 'Priority counsellor review' : 'Routine monitoring and continue check-ins',
  };
}

export async function predictSahayak(input: SahayakInput): Promise<SahayakResult> {
  if (!env.GEMINI_API_KEY) return fallbackPrediction(input.message);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15_000);
  try {
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(env.GEMINI_MODEL)}:generateContent?key=${encodeURIComponent(env.GEMINI_API_KEY)}`;
    const response = await fetch(endpoint, {
      method: 'POST',
      signal: controller.signal,
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
        contents: [{ role: 'user', parts: [{ text: JSON.stringify({ recent_message: input.message, signals: input.context ?? {} }) }] }],
        generationConfig: {
          temperature: 0,
          responseMimeType: 'application/json',
          responseSchema: {
            type: 'OBJECT',
            properties: {
              escalation_probability: { type: 'NUMBER' },
              risk_level: { type: 'STRING', enum: ['LOW', 'MODERATE', 'HIGH', 'CRITICAL'] },
              confidence: { type: 'NUMBER' },
              time_horizon: { type: 'STRING', enum: ['7 days'] },
              contributing_factors: { type: 'ARRAY', items: { type: 'STRING' } },
              early_warning_signals: { type: 'ARRAY', items: { type: 'STRING' } },
              recommended_followup: { type: 'STRING' },
            },
            required: ['escalation_probability', 'risk_level', 'confidence', 'time_horizon', 'contributing_factors', 'early_warning_signals', 'recommended_followup'],
          },
        },
      }),
    });
    if (!response.ok) throw new Error(`Sahayak request failed: ${response.status}`);
    const payload = await response.json() as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> };
    const text = payload.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) throw new Error('Sahayak returned no prediction.');
    return sahayakOutput.parse(JSON.parse(text));
  } catch (error) {
    console.error('Sahayak Gemini request failed; using controlled fallback.', error instanceof Error ? error.message : error);
    return fallbackPrediction(input.message);
  } finally {
    clearTimeout(timeout);
  }
}

function fallbackReply(input: SahayakInput): string {
  const text = input.message.toLowerCase();
  if (/(hearing|court|case|legal|docket|lawyer)/i.test(text)) return 'That sounds connected to your case. What part feels hardest right now: the next hearing, waiting for updates, or getting support?';
  if (/(sleep|tired|rest)/i.test(text)) return 'Thank you for sharing that. How has your sleep been affecting your day?';
  if (/(unsafe|threat|danger|scared|afraid)/i.test(text)) return 'I hear that you are feeling worried about safety. Do you feel safe where you are right now, or would you like help reaching your support team?';
  if (/(family|home|alone|support)/i.test(text)) return 'It sounds like support around you matters here. Who, if anyone, has felt easiest to talk to lately?';
  return 'Thank you for telling me. When you think about the last few days, what has been weighing on you the most?';
}

export async function generateSahayakReply(input: SahayakInput): Promise<string> {
  const history = (input.history ?? []).slice(-8);
  if (!env.GEMINI_API_KEY) return fallbackReply(input);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12_000);
  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(env.GEMINI_MODEL)}:generateContent?key=${encodeURIComponent(env.GEMINI_API_KEY)}`, {
      method: 'POST', signal: controller.signal, headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: `You are Sahayak, a warm conversational support assistant inside SAATH. You are separate from TAARA. Speak naturally, simply, and briefly in 1-3 sentences. Ask exactly ONE gentle follow-up question in every reply, related indirectly to the person's case, hearing, support, sleep, safety, family, finances, or how today feels. Do not mention distress scores, escalation, risk, confidence, models, prediction, clinical assessment, diagnosis, or hidden monitoring. Do not interrogate or ask multiple questions. Do not give legal or medical advice. If the person mentions immediate danger or self-harm, respond with empathy and ask whether they are safe right now and whether they want human support.` }] },
        contents: [{ role: 'user', parts: [{ text: JSON.stringify({ current_message: input.message, recent_conversation: history, available_signals: input.context ?? {} }) }] }],
        generationConfig: { temperature: 0.55, maxOutputTokens: 180 },
      }),
    });
    if (!response.ok) throw new Error(`Sahayak conversation failed: ${response.status}`);
    const payload = await response.json() as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> };
    const reply = payload.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
    if (!reply) throw new Error('Sahayak returned no conversational reply.');
    return reply;
  } catch (error) {
    console.error('Sahayak conversation failed; using guided fallback.', error instanceof Error ? error.message : error);
    return fallbackReply(input);
  } finally {
    clearTimeout(timeout);
  }
}
