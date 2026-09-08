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
    const previousStage = found.currentStage;
    found.currentStage = newStage;
    const event: TimelineEvent = { id: id(), caseId, date: new Date().toISOString(), type: 'case', label: `Stage updated to ${newStage}` };
    store.timelines.push(event);
    // A27 — Case stage synchronization: also written under the `case_events` record key so
    // it is queryable the same way as every other event stream in the system, satisfying
    // "Stage changes reflected within monitoring cycle" without needing a separate poll job
    // — the change is visible to any reader of case_events the moment it happens.
    const caseEvents = store.records.get('case_events') || [];
    caseEvents.push({ id: id(), caseId, type: 'stage_change', previousStage, newStage, occurredAt: event.date });
    store.records.set('case_events', caseEvents);
    return found;
  }
}