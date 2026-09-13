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
const now = Date.now();
const initialRecords = new Map<string, any[]>();

initialRecords.set('alerts:all', [
  {
    id: 'alert-001',
    victimToken: 'VIC_a8f931',
    caseReference: 'NHAA-DL-2026-001284',
    reason: 'Sahayak NLP flagged acute distress escalation and panic state in recent check-in.',
    source: 'sahayak',
    crisis: true,
    priority: 'P1',
    severity: 'urgent',
    status: 'NEW',
    confidence: 0.94,
    createdAt: new Date(now - 3600000).toISOString(),
    updatedAt: new Date(now - 3600000).toISOString(),
    count: 1,
  },
  {
    id: 'alert-002',
    victimToken: 'VIC_84f192',
    caseReference: 'NHAA-RJ-2026-004821',
    reason: 'Survivor requested counsellor call via IVRS check-in (Severe sleep disturbance & hearing anxiety reported).',
    source: 'checkin',
    crisis: false,
    requestedSupport: true,
    priority: 'P2',
    severity: 'support_request',
    status: 'NEW',
    confidence: 0.88,
    createdAt: new Date(now - 7200000).toISOString(),
    updatedAt: new Date(now - 7200000).toISOString(),
    count: 1,
  },
  {
    id: 'alert-003',
    victimToken: 'VIC_91c320',
    caseReference: 'NHAA-MH-2026-002907',
    reason: 'Upcoming court trial hearing within 4 days. Moderate distress drift detected.',
    source: 'monitoring',
    crisis: false,
    requestedSupport: false,
    priority: 'P3',
    severity: 'watch',
    status: 'ACKNOWLEDGED',
    acknowledgedAt: new Date(now - 1800000).toISOString(),
    firstAcknowledgedAt: new Date(now - 1800000).toISOString(),
    confidence: 0.76,
    createdAt: new Date(now - 14400000).toISOString(),
    updatedAt: new Date(now - 1800000).toISOString(),
    count: 1,
  },
]);

initialRecords.set('follow_ups', [
  {
    id: 'flw-001',
    caseId: 'synthetic-case-001',
    victimToken: 'VIC_a8f931',
    survivorName: 'Ananya Rao',
    docket: 'NHAA-DL-2026-001284',
    date: new Date(now + 86400000).toISOString(),
    notes: 'Safety grounding session & investigation update.',
    privateNotes: 'Survivor expressed acute panic regarding statement recording. Focus on cognitive stabilization and legal officer coordination.',
    survivorNotes: 'Scheduled check-in call with Counsellor Anjali Sharma.',
    createdBy: 'C001',
    status: 'PROPOSED',
    initiatedBy: 'COUNSELLOR',
    createdAt: new Date(now - 7200000).toISOString(),
  },
  {
    id: 'flw-002',
    caseId: 'synthetic-case-002',
    victimToken: 'VIC_84f192',
    survivorName: 'Sunita Kumari',
    docket: 'NHAA-RJ-2026-004821',
    date: new Date(now + 172800000).toISOString(),
    notes: 'Review interim compensation disbursal & sleep routine.',
    privateNotes: 'Verified bank mandate status. Coordinate with district nodal officer if disbursement is delayed past Friday.',
    survivorNotes: 'Confirmed follow-up call to review financial relief progress and coping strategies.',
    createdBy: 'C001',
    status: 'CONFIRMED',
    initiatedBy: 'COUNSELLOR',
    createdAt: new Date(now - 14400000).toISOString(),
  },
  {
    id: 'flw-003',
    caseId: 'synthetic-case-003',
    victimToken: 'VIC_91c320',
    survivorName: 'Rahul Patil',
    docket: 'NHAA-MH-2026-002907',
    date: new Date(now + 259200000).toISOString(),
    notes: 'Pre-trial emotional preparation.',
    privateNotes: 'Rahul requested shifting the session to late afternoon because of work shift.',
    survivorNotes: 'Rescheduled time requested by survivor: 5:00 PM IST.',
    proposedDate: new Date(now + 259200000 + 18000000).toISOString(),
    rescheduledReason: 'Work shift clash with morning slot.',
    createdBy: 'C001',
    status: 'RESCHEDULE_REQUESTED',
    initiatedBy: 'SURVIVOR',
    createdAt: new Date(now - 21600000).toISOString(),
  },
]);

export const memoryStore: Store = {
  cases: demoCases,
  timelines: [],
  counsellors: demoCounsellors,
  users: new Map(), records: initialRecords, blocklist: new Set(),
};
export const supabase: SupabaseClient | null = env.SUPABASE_URL && (env.SUPABASE_SECRET_KEY || env.SUPABASE_PUBLISHABLE_KEY) ? createClient(env.SUPABASE_URL, env.SUPABASE_SECRET_KEY || env.SUPABASE_PUBLISHABLE_KEY!, { auth:{autoRefreshToken:false,persistSession:false} }) : null;
export const store: Store = memoryStore;
export const id = () => randomUUID();
export async function supabaseInsert(table:string, payload:Record<string,unknown>) { if (env.DATA_MODE !== 'supabase' || !supabase) return null; const {data,error}=await supabase.from(table).insert(payload).select().single(); if(error) throw error; return data; }
export async function supabaseSelect(table:string, filters:Record<string,unknown>={}) { if (env.DATA_MODE !== 'supabase' || !supabase) return null; let query=supabase.from(table).select('*'); for(const [key,value] of Object.entries(filters)) query=query.eq(key,value); const {data,error}=await query; if(error) throw error; return data; }