import { store } from '../db/store.js';
import type { CaseRecord, TimelineEvent } from '../types/domain.js';
export interface NhaaAdapter { findByDocket(docket:string):Promise<CaseRecord|null>; timeline(caseId:string):Promise<TimelineEvent[]>; }
export class MockNhaaAdapter implements NhaaAdapter { async findByDocket(docket:string){ return store.cases.find(c=>c.docket.toLowerCase()===docket.toLowerCase())||null; } async timeline(caseId:string){ return store.timelines.filter(event=>event.caseId===caseId); } }
export const caseAdapter:NhaaAdapter = new MockNhaaAdapter();
