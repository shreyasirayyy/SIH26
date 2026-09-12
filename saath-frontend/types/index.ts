export type Role = "survivor" | "counsellor" | "district" | "state" | "national";

export interface CaseRecord {
  id: string;
  docket: string;
  victimToken: string;
  survivorName: string;
  registrationDate: string;
  registrationChannel?: string;
  state: string;
  district: string;
  city?: string;
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
  preferredContactChannel?: string;
  complainantType?: string;
  ageGroup?: string;
  gender?: string;
  monitoringConsent?: boolean;
  incidentCategory?: string;
  complaintSummary?: string;
  firNumber?: string | null;
  firDate?: string | null;
  policeStation?: string;
  investigatingOfficerId?: string;
  districtNodalOfficerId?: string;
  financialReliefEligible?: boolean;
  lastPaymentDate?: string | null;
  previousThreatReported?: boolean;
  protectionRequested?: boolean;
  relocationRequested?: boolean;
  monitoringStarted?: string;
  baselineCompleted?: boolean;
  baselineDistressScore?: number;
  currentDistressScore?: number;
  predicted7dScore?: number;
  assignedCounsellorId?: string | null;
  followupFrequency?: string | null;
  pendingAmount?: number;
  registeredPhone?: string;
  stageStartedAt?: string | null;
  daysInCurrentStage?: number;
  accusedArrestStatus?: string;
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