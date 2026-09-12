import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { randomUUID } from 'node:crypto';
import canonicalCases from './synthetic-cases.json';
import canonicalCounsellors from './synthetic-counsellors.json';
import { env } from '../config/env.js';
import type { CaseRecord, Counsellor, TimelineEvent } from '../types/domain.js';

export interface Store { cases: CaseRecord[]; timelines: TimelineEvent[]; counsellors: Counsellor[]; users: Map<string, any>; records: Map<string, any[]>; blocklist: Set<string>; }

// Real counsellor roster — loaded from the synthetic-counsellors dataset so
// login and case-ownership checks are against actual records, not a hardcoded
// backdoor account.
const demoCounsellors: Counsellor[] = canonicalCounsellors.map((c) => ({
  id: c.counsellor_id,
  name: c.name,
  email: c.email,
  phone: c.phone,
  password: c.password,
  specialisation: c.specialisation,
  languages: c.languages,
  state: c.state,
  role: 'Counsellor',
  status: c.status,
  experienceYears: c.experience_years,
  casesAssigned: c.cases_assigned,
  lastLogin: c.last_login ?? null,
}));

// This is the only memory-mode case source. It maps the authoritative synthetic
// dataset without adding another fixture or exposing direct identity data.
const demoCases: CaseRecord[] = canonicalCases.map((source, index) => ({
  id: `synthetic-case-${String(index + 1).padStart(3, '0')}`,
  docket: source.docket_id, 
  victimToken: source.victim_token,
  survivorName: source.name_masked, 
  registeredPhone: source.registered_mobile_masked,
  registrationDate: source.complaint_date, 
  state: source.state, 
  district: source.district,
  caseCategory: source.case_type, 
  incidentDate: source.incident_date, 
  currentStage: source.case_stage,
  firStatus: source.fir_registered ? 'Registered' : 'Not registered', 
  investigationStatus: source.investigation_status,
  chargesheetStatus: source.chargesheet_status, 
  nextHearingDate: source.next_court_date,
  hearingCount: source.previous_hearings, 
  adjournmentCount: source.adjournments,
  compensationStatus: source.financial_relief_status, 
  compensationAmountApproved: source.approved_amount,
  compensationAmountReceived: source.disbursed_amount, 
  protectionStatus: source.protection_status,
  relocationStatus: source.relocation_requested ? 'Requested' : 'Not requested',
  legalAidStatus: source.legal_aid_assigned ? 'Assigned' : 'Not assigned',
  rehabilitationStatus: source.rehabilitation_status, 
  counsellorAssigned: source.counsellor_assigned ? 'Assigned' : 'Not assigned',
  preferredLanguage: source.preferred_language,
  // Add missing fields
  firDate: source.fir_date,
  firNumber: source.fir_number,
  investigatingOfficerId: source.investigating_officer_id,
  pendingAmount: source.pending_amount,
  threatLastReported: source.threat_last_reported,
  protectionOfficerAssigned: source.protection_officer_assigned,
  monitoringStarted: source.monitoring_started,
  baselineDistressScore: source.baseline_distress_score,
  currentDistressScore: source.current_distress_score,
  riskLevel: source.risk_level,
  // Real per-case counsellor assignment — previously dropped, leaving only the
  // boolean counsellorAssigned flag with no way to know *which* counsellor.
  assignedCounsellorId: source.assigned_counsellor_id ?? null,
  followupFrequency: source.followup_frequency ?? null,
}));
export const memoryStore: Store = {
  cases: demoCases,
  timelines: demoCases.flatMap((caseRecord) => [
    { id: `${caseRecord.id}-registered`, caseId: caseRecord.id, date: caseRecord.registrationDate, type: 'case' as const, label: 'Synthetic case registered' },
    { id: `${caseRecord.id}-monitoring`, caseId: caseRecord.id, date: caseRecord.registrationDate, type: 'wellbeing' as const, label: 'Voluntary wellbeing check-in available' },
  ]),
  counsellors: demoCounsellors,
  users: new Map(), records: new Map(), blocklist: new Set(),
};
export const supabase: SupabaseClient | null = env.SUPABASE_URL && (env.SUPABASE_SECRET_KEY || env.SUPABASE_PUBLISHABLE_KEY) ? createClient(env.SUPABASE_URL, env.SUPABASE_SECRET_KEY || env.SUPABASE_PUBLISHABLE_KEY!, { auth:{autoRefreshToken:false,persistSession:false} }) : null;
export const store: Store = memoryStore;
export const id = () => randomUUID();
export async function supabaseInsert(table:string, payload:Record<string,unknown>) { if (env.DATA_MODE !== 'supabase' || !supabase) return null; const {data,error}=await supabase.from(table).insert(payload).select().single(); if(error) throw error; return data; }
export async function supabaseSelect(table:string, filters:Record<string,unknown>={}) { if (env.DATA_MODE !== 'supabase' || !supabase) return null; let query=supabase.from(table).select('*'); for(const [key,value] of Object.entries(filters)) query=query.eq(key,value); const {data,error}=await query; if(error) throw error; return data; }