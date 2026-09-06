import { analyzeText, generateTaaraReply } from '../ml.js';
/** Provider-neutral TAARA boundary. Provider credentials remain server-side. */
export async function respondToTaara(input: { victimToken: string; message: string; language?: string }) { const analysis = await analyzeText({ victimToken: input.victimToken, text: input.message, language: input.language }); const reply = await generateTaaraReply({ message: input.message, language: input.language, analysis }); return { analysis, reply }; }
