import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { randomUUID } from 'node:crypto';
import canonicalCases from './synthetic-cases.json';
import { env } from '../config/env.js';
import type { CaseRecord, TimelineEvent } from '../types/domain.js';

export interface Store { cases: CaseRecord[]; timelines: TimelineEvent[]; users: Map<string, any>; records: Map<string, any[]>; blocklist: Set<string>; }

// This is the only memory-mode case source. It maps the authoritative synthetic
// dataset without adding another fixture or exposing direct identity data.
const demoCases: CaseRecord[] = canonicalCases.map((source, index) => ({
  id: `synthetic-case-${String(index + 1).padStart(3, '0')}`,
  docket: source.docket_id, victimToken: source.victim_token,
  survivorName: source.name_masked, registeredPhone: source.registered_mobile_masked,
  registrationDate: source.complaint_date, state: source.state, district: source.district,
  caseCategory: source.case_type, incidentDate: source.incident_date, currentStage: source.case_stage,
  firStatus: source.fir_registered ? 'Registered' : 'Not registered', investigationStatus: source.investigation_status,
  chargesheetStatus: source.chargesheet_status, nextHearingDate: source.next_court_date,
  hearingCount: source.previous_hearings, adjournmentCount: source.adjournments,
  compensationStatus: source.financial_relief_status, compensationAmountApproved: source.approved_amount,
  compensationAmountReceived: source.disbursed_amount, protectionStatus: source.protection_status,
  relocationStatus: source.relocation_requested ? 'Requested' : 'Not requested',
  legalAidStatus: source.legal_aid_assigned ? 'Assigned' : 'Not assigned',
  rehabilitationStatus: source.rehabilitation_status, counsellorAssigned: source.counsellor_assigned ? 'assigned' : undefined,
  preferredLanguage: source.preferred_language,
}));
export const memoryStore: Store = {
  cases: demoCases,
  timelines: demoCases.flatMap((caseRecord) => [
    { id: `${caseRecord.id}-registered`, caseId: caseRecord.id, date: caseRecord.registrationDate, type: 'case' as const, label: 'Synthetic case registered' },
    { id: `${caseRecord.id}-monitoring`, caseId: caseRecord.id, date: caseRecord.registrationDate, type: 'wellbeing' as const, label: 'Voluntary wellbeing check-in available' },
  ]),
  users: new Map(), records: new Map(), blocklist: new Set(),
};
export const supabase: SupabaseClient | null = env.SUPABASE_URL && (env.SUPABASE_SECRET_KEY || env.SUPABASE_PUBLISHABLE_KEY) ? createClient(env.SUPABASE_URL, env.SUPABASE_SECRET_KEY || env.SUPABASE_PUBLISHABLE_KEY!, { auth:{autoRefreshToken:false,persistSession:false} }) : null;
export const store: Store = memoryStore;
export const id = () => randomUUID();
export async function supabaseInsert(table:string, payload:Record<string,unknown>) { if (env.DATA_MODE !== 'supabase' || !supabase) return null; const {data,error}=await supabase.from(table).insert(payload).select().single(); if(error) throw error; return data; }
export async function supabaseSelect(table:string, filters:Record<string,unknown>={}) { if (env.DATA_MODE !== 'supabase' || !supabase) return null; let query=supabase.from(table).select('*'); for(const [key,value] of Object.entries(filters)) query=query.eq(key,value); const {data,error}=await query; if(error) throw error; return data; }
