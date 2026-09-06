import { store } from '../../../db/store.js';
import type { CaseRecord, TimelineEvent } from '../../../types/domain.js';

/** Synthetic hackathon adapter only; it is not an NHAA production integration. */
export class MockNhaaAdapter {
  async findByReference(referenceId: string): Promise<CaseRecord | null> { return store.cases.find(c => c.docket.toLowerCase() === referenceId.toLowerCase()) ?? null; }
  async timeline(caseId: string): Promise<TimelineEvent[]> { return store.timelines.filter(x => x.caseId === caseId); }
}
