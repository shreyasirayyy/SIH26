import { store } from '../db/store.js';
import type { CaseRecord, TimelineEvent } from '../types/domain.js';
export interface NhaaAdapter { findByDocketAndPhone(docket:string,phone:string):Promise<CaseRecord|null>; timeline(caseId:string):Promise<TimelineEvent[]>; }
export class MockNhaaAdapter implements NhaaAdapter { async findByDocketAndPhone(docket:string,phone:string){ return store.cases.find(c=>c.docket.toLowerCase()===docket.toLowerCase()&&c.registeredPhone===phone)||null; } async timeline(caseId:string){ return store.timelines.filter(event=>event.caseId===caseId); } }
export const caseAdapter:NhaaAdapter = new MockNhaaAdapter();
