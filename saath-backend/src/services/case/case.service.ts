import { AppError } from '../../utils/http.js';
import { caseRepository } from './case.repository.js';
export const findEligibleCase = async (referenceId: string) => { const found = await caseRepository.findByReference(referenceId.trim()); if (!found) throw new AppError(404, 'CASE_NOT_FOUND', 'No case matched that reference ID.'); return found; };
