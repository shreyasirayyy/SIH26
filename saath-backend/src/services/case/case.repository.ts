import { MockNhaaAdapter } from './adapters/mock-nhaa.adapter.js';
export interface CaseRepository {
  findByReference(referenceId: string): ReturnType<MockNhaaAdapter['findByReference']>;
  timeline(caseId: string): ReturnType<MockNhaaAdapter['timeline']>;
  updateStage(caseId: string, newStage: string): ReturnType<MockNhaaAdapter['updateStage']>;
}
export const caseRepository: CaseRepository = new MockNhaaAdapter();