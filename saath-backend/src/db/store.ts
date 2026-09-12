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
const normalizeStage = (stage?: string) => {
  switch (stage) {
    case 'complaint_review':
      return 'Registered';
    case 'investigation':
      return 'Investigation';
    case 'trial':
      return 'Trial';
    case 'compensation':
      return 'Compensation';
    case 'rehabilitation':
      return 'Rehabilitation';
    default:
      return stage ?? 'Registered';
  }
};

const demoCases: CaseRecord[] = canonicalCases.map((source, index) => ({
  id: `synthetic-case-${String(index + 1).padStart(3, '0')}`,
  docket: source.docket_id,
  victimToken: source.victim_token,
  survivorName: source.name_masked,
  registeredPhone: source.registered_mobile_masked,
  registrationDate: source.complaint_date,
  registrationChannel: source.registration_channel,
  state: source.state,
  district: source.district,
  city: source.city,
  caseCategory: source.case_type,
  incidentDate: source.incident_date,
  currentStage: normalizeStage(source.case_stage),
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
  complainantType: source.complainant_type,
  ageGroup: source.age_group,
  gender: source.gender,
  monitoringConsent: source.monitoring_consent,
  preferredContactChannel: source.preferred_contact_channel,
  incidentCategory: source.incident_category,
  complaintSummary: source.complaint_summary,
  firDate: source.fir_date,
  firNumber: source.fir_number,
  policeStation: source.police_station,
  investigatingOfficerId: source.investigating_officer_id,
  districtNodalOfficerId: source.district_nodal_officer_id,
  financialReliefEligible: source.financial_relief_eligible,
  lastPaymentDate: source.last_payment_date,
  previousThreatReported: source.previous_threat_reported,
  threatLastReported: source.threat_last_reported,
  protectionRequested: source.protection_requested,
  protectionOfficerAssigned: source.protection_officer_assigned,
  relocationRequested: source.relocation_requested,
  monitoringStarted: source.monitoring_started,
  baselineCompleted: source.baseline_completed,
  baselineDistressScore: source.baseline_distress_score,
  currentDistressScore: source.current_distress_score,
  predicted7dScore: source.predicted_7d_score,
  riskLevel: source.risk_level,
  assignedCounsellorId: source.assigned_counsellor_id ?? null,
  followupFrequency: source.followup_frequency ?? null,
  pendingAmount: source.pending_amount,
  stageStartedAt: source.stage_started_at,
  daysInCurrentStage: source.days_in_current_stage,
  accusedArrestStatus: source.accused_arrest_status,
}));
export const memoryStore: Store = {
  cases: demoCases,
  timelines: [],
  counsellors: demoCounsellors,
  users: new Map(), records: new Map(), blocklist: new Set(),
};
export const supabase: SupabaseClient | null = env.SUPABASE_URL && (env.SUPABASE_SECRET_KEY || env.SUPABASE_PUBLISHABLE_KEY) ? createClient(env.SUPABASE_URL, env.SUPABASE_SECRET_KEY || env.SUPABASE_PUBLISHABLE_KEY!, { auth:{autoRefreshToken:false,persistSession:false} }) : null;
export const store: Store = memoryStore;
export const id = () => randomUUID();
export async function supabaseInsert(table:string, payload:Record<string,unknown>) { if (env.DATA_MODE !== 'supabase' || !supabase) return null; const {data,error}=await supabase.from(table).insert(payload).select().single(); if(error) throw error; return data; }
export async function supabaseSelect(table:string, filters:Record<string,unknown>={}) { if (env.DATA_MODE !== 'supabase' || !supabase) return null; let query=supabase.from(table).select('*'); for(const [key,value] of Object.entries(filters)) query=query.eq(key,value); const {data,error}=await query; if(error) throw error; return data; }