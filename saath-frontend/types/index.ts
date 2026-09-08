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
  preferredLanguage: string;
}

export interface CheckIn {
  timestamp: string;
  victimToken: string;
  mood: number; // 1-5
  sleep: number; // 1-5 (higher = worse)
  fear: number;
  intrusion: number;
  avoidance: number;
  socialConnectedness: number; // higher = better
  perceivedSafety: number;
  textSentiment: number; // -1 to 1
}

export interface AiOutput {
  victimToken: string;
  timestamp: string;
  distressScore: number; // 0-100
  recoveryScore: number; // 0-100
  confidence: "Low" | "Moderate" | "High";
  escalationEstimate: "Stable" | "Watch" | "Elevated" | "Critical";
  priorityLevel: "P1" | "P2" | "P3" | "P4";
  // When true, there is not yet enough check-in data or model confidence to make a clear call.
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
