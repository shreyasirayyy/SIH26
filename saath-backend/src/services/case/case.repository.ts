import { MockNhaaAdapter } from './adapters/mock-nhaa.adapter.js';
export interface CaseRepository { findByReference(referenceId: string): ReturnType<MockNhaaAdapter['findByReference']>; timeline(caseId: string): ReturnType<MockNhaaAdapter['timeline']>; }
export const caseRepository: CaseRepository = new MockNhaaAdapter();
