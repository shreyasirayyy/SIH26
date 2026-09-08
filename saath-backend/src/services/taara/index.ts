import { analyzeText, generateTaaraReply } from '../ml.js';
import { store } from '../../db/store.js';

/** Provider-neutral TAARA boundary. Provider credentials remain server-side. */
export async function respondToTaara(input: { victimToken: string; message: string; language?: string; caseId?: string }) { 
  const analysis = await analyzeText({ victimToken: input.victimToken, text: input.message, language: input.language }); 
  const caseContext = input.caseId ? store.cases.find(c => c.id === input.caseId) : undefined;
  const reply = await generateTaaraReply({ 
    message: input.message, 
    language: input.language, 
    analysis,
    caseContext
  }); 
  return { analysis, reply }; 
}
