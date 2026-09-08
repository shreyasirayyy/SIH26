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
  if (!env.GEMINI_API_KEY) throw new Error('Sahayak AI is not configured.');

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
