export const ROLES = ['SURVIVOR','COUNSELLOR','DISTRICT_ADMIN','STATE_ADMIN','NATIONAL_ADMIN'] as const;
export type Role = typeof ROLES[number];
export type MonitoringState = 'active'|'paused'|'stopped';
export type Priority = 'P1'|'P2'|'P3'|'P4';
export interface AuthUser { id: string; role: Role; victimToken?: string; district?: string; state?: string; jti?: string; }
export interface CaseRecord {
  city?: any; 
  id: string; 
  docket: string; 
  victimToken: string; 
  survivorName: string; 
  registeredPhone: string; 
  registrationDate: string; 
  state: string; 
  district: string; 
  caseCategory: string; 
  incidentDate: string; 
  currentStage: string; 
  firStatus: string; 
  investigationStatus: string; 
  chargesheetStatus: string; 
  nextHearingDate: string|null; 
  hearingCount: number; 
  adjournmentCount: number; 
  compensationStatus: string; 
  compensationAmountApproved: number; 
  compensationAmountReceived: number; 
  protectionStatus: string; 
  relocationStatus: string; 
  legalAidStatus: string; 
  rehabilitationStatus: string; 
  counsellorAssigned?: string; 
  preferredLanguage: string;
  firDate?: string | null;
  firNumber?: string | null;
  investigatingOfficerId?: string;
  pendingAmount?: number;
  threatLastReported?: string | null;
  protectionOfficerAssigned?: boolean;
  monitoringStarted?: string;
  baselineDistressScore?: number;
  currentDistressScore?: number;
  riskLevel?: string;
  assignedCounsellorId?: string | null;
  followupFrequency?: string | null;
}
export interface Counsellor {
  id: string;
  name: string;
  email: string;
  phone?: string;
  password: string;
  specialisation?: string;
  languages?: string;
  state?: string;
  role: 'Counsellor';
  status?: string;
  experienceYears?: number;
  casesAssigned?: number;
  lastLogin?: string | null;
}
export interface TimelineEvent { id: string; caseId: string; date: string; type: 'case'|'support'|'wellbeing'; label: string; metadata?: Record<string, unknown>; }