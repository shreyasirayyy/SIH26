export type Role = "survivor" | "counsellor" | "district" | "state" | "national";

export interface CaseRecord {
  id: string;
  docket: string;
  victimToken: string;
  survivorName: string;
  registrationDate: string;
  registrationChannel: string;
  state: string;
  district: string;
  caseCategory: string;
  incidentDate: string;
  currentStage: "Registered" | "Investigation" | "Trial" | "Compensation" | "Rehabilitation";
  riskLevel?: string;
  firStatus: string;
  investigationStatus: string;
  chargesheetStatus: string;
  nextHearingDate: string | null;
  hearingCount: number;
  adjournmentCount: number;
  compensationStatus: "Not applicable" | "Pending" | "Partial disbursement" | "Disbursed";
  compensationAmountApproved: number;
  compensationAmountReceived: number;
  protectionStatus: "Not requested" | "Under review" | "Granted";
  relocationStatus: "Not requested" | "Under review" | "Relocated";
  legalAidStatus: string;
  rehabilitationStatus: string;
  counsellorAssigned: string;
  assignedCounsellor?: {
    name: string;
    specialisation?: string;
    phone?: string;
  } | null;
  preferredLanguage: string;
  assignedCounsellorId?: string | null;
  followupFrequency?: string | null;
  baselineDistressScore?: number;
  currentDistressScore?: number;
}

export interface CounsellorProfile {
  id: string;
  name: string;
  email: string;
  phone?: string;
  specialisation?: string;
  languages?: string;
  state?: string;
  role: "Counsellor";
  status?: string;
  experienceYears?: number;
  casesAssigned?: number;
  lastLogin?: string | null;
}

export interface CheckIn {
  timestamp: string;
  victimToken: string;
  mood: number;
  sleep: number;
  fear: number;
  intrusion: number;
  avoidance: number;
  socialConnectedness: number;
  perceivedSafety: number;
  textSentiment: number;
}

export interface AiOutput {
  victimToken: string;
  timestamp: string;
  distressScore: number;
  recoveryScore: number;
  confidence: "Low" | "Moderate" | "High";
  escalationEstimate: "Stable" | "Watch" | "Elevated" | "Critical";
  priorityLevel: "P1" | "P2" | "P3" | "P4";
  insufficientEvidence?: boolean;
  contributingSignals: string[];
  recommendedIntervention: string;
}

export interface InterventionFeedback {
  activity: string;
  helpful: boolean;
  timestamp?: string;
}

export interface TimelineEvent {
  date: string;
  type: "case" | "support" | "wellbeing";
  label: string;
}

export interface AuditLogEntry {
  timestamp: string;
  actorId: string;
  role: string;
  victimToken: string;
  action: string;
  reason: string;
}