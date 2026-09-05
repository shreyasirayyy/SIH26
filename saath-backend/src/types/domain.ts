export const ROLES = ['SURVIVOR','COUNSELLOR','DISTRICT_ADMIN','STATE_ADMIN','NATIONAL_ADMIN'] as const;
export type Role = typeof ROLES[number];
export type MonitoringState = 'active'|'paused'|'stopped';
export type Priority = 'P1'|'P2'|'P3'|'P4';
export interface AuthUser { id: string; role: Role; victimToken?: string; phone?: string; name?: string; district?: string; state?: string; }
export interface CaseRecord { id: string; docket: string; victimToken: string; survivorName: string; registeredPhone: string; registrationDate: string; state: string; district: string; caseCategory: string; incidentDate: string; currentStage: string; firStatus: string; investigationStatus: string; chargesheetStatus: string; nextHearingDate: string|null; hearingCount: number; adjournmentCount: number; compensationStatus: string; compensationAmountApproved: number; compensationAmountReceived: number; protectionStatus: string; relocationStatus: string; legalAidStatus: string; rehabilitationStatus: string; counsellorAssigned?: string; preferredLanguage: string; }
export interface TimelineEvent { id: string; caseId: string; date: string; type: 'case'|'support'|'wellbeing'; label: string; metadata?: Record<string, unknown>; }
export interface OtpChallenge { id: string; phone: string; hash: string; expiresAt: number; attempts: number; used: boolean; createdAt: number; }
