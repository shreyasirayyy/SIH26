import { store, id } from '../../../db/store.js';
import type { CaseRecord, TimelineEvent } from '../../../types/domain.js';

/** Synthetic hackathon adapter only; it is not an NHAA production integration. */
export class MockNhaaAdapter {
  async findByReference(referenceId: string): Promise<CaseRecord | null> {
    return store.cases.find(c => c.docket.toLowerCase() === referenceId.toLowerCase()) ?? null;
  }
  async timeline(caseId: string): Promise<TimelineEvent[]> {
    return store.timelines.filter(x => x.caseId === caseId);
  }
  async updateStage(caseId: string, newStage: string): Promise<CaseRecord | null> {
    const found = store.cases.find(c => c.id === caseId);
    if (!found) return null;
    found.currentStage = newStage;
    const event: TimelineEvent = { id: id(), caseId, date: new Date().toISOString(), type: 'case', label: `Stage updated to ${newStage}` };
    store.timelines.push(event);
    return found;
  }
}