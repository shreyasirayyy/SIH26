import { GoogleGenAI } from '@google/genai';
import { env } from '../config/env.js';

const ai = new GoogleGenAI({
  apiKey: env.GEMINI_API_KEY,
});

const SYSTEM_PROMPT = `
You are the escalation prediction engine for SAATH, an AI-powered
mental health monitoring and support platform for victims and survivors
of atrocities.

Your task is to estimate the likelihood of significant distress
escalation within the next 7 days.

IMPORTANT:
- Distinguish current distress from future escalation.
- A high current distress score does NOT automatically mean high
  escalation risk if the distress is stable and protective factors
  are present.
- Consider all provided features together.
- Pay particular attention to distress trajectory, adverse events,
  case-related stress, wellbeing signals, support status, and engagement.
- Do not diagnose any mental health condition.
- Do not make autonomous medical, legal, police, relocation,
  hospitalisation, or other high-stakes decisions.
- Recommendations are only for authorised human professionals.

RISK LEVELS:
0-24 = LOW
25-49 = MODERATE
50-74 = HIGH
75-100 = CRITICAL

CONFIDENCE:
- Confidence must be between 0 and 1.
- For a single snapshot with limited longitudinal information,
  normally use 0.60-0.85.
- Repeated and consistent longitudinal observations may justify
  0.80-0.90.
- Use above 0.90 only when substantial longitudinal evidence exists.
- Confidence represents certainty in the prediction, NOT severity.

EVIDENCE RULES:
- Use only information provided in the input.
- Do not invent missing information.
- Do not claim that a feature increased, decreased, improved,
  or worsened unless the input explicitly provides the relevant
  comparison or trend.
- Contributing factors must be based on actual input features.
- Early warning signals must be based on actual input features.
- Do not use external knowledge or web searches.

The input contains these 20 features:
1. Case type
2. Case stage
3. Sentiment
4. Emotion
5. Threat indicator
6. Court stress
7. Financial distress
8. Social isolation
9. Engagement score
10. Previous distress score
11. Distress change
12. Current distress score
13. Court delay
14. Family conflict
15. Days until hearing
16. Counselling status
17. Legal aid status
18. Rehabilitation status
19. Missed check-ins in the last 7 days
20. Sleep quality

Return only the requested structured JSON output.
`;

export async function predictEscalation(input: Record<string, unknown>) {
  const response = await ai.models.generateContent({
  model: 'gemini-3-flash-preview',
  contents: `${SYSTEM_PROMPT}

CASE DATA:
${JSON.stringify(input)}
`,
  config: {
    responseMimeType: 'application/json',
    responseSchema: {
      type: 'object',
      properties: {
        escalation_probability: {
          type: 'number',
          description:
            'Estimated probability of significant distress escalation within the next 7 days, from 0 to 100.',
        },
        risk_level: {
          type: 'string',
          enum: ['LOW', 'MODERATE', 'HIGH', 'CRITICAL'],
          description:
            'Escalation risk category based on the escalation probability.',
        },
        confidence: {
          type: 'number',
          description: 'Confidence in the prediction from 0 to 1.',
        },
        time_horizon: {
          type: 'string',
          enum: ['7 days'],
          description: 'Prediction time horizon.',
        },
        contributing_factors: {
          type: 'array',
          items: {
            type: 'string',
          },
          description:
            'The 3 to 5 most important factors contributing to the prediction.',
        },
        early_warning_signals: {
          type: 'array',
          items: {
            type: 'string',
          },
          description:
            'Important signals indicating that distress may be worsening.',
        },
        recommended_followup: {
          type: 'string',
          description:
            'Recommended follow-up action for an authorized human professional.',
        },
      },
      required: [
        'escalation_probability',
        'risk_level',
        'confidence',
        'time_horizon',
        'contributing_factors',
        'early_warning_signals',
        'recommended_followup',
      ],
    },
  },
  });

  return response.text;
}