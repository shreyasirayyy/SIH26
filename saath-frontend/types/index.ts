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
  threatLastReported?: string | null;
  protectionRequested?: boolean;
  protectionOfficerAssigned?: string | null;
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
  lastActive?: string | null;
  lastReviewedAt?: string | null;
  lastCounsellorContactAt?: string | null;
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
  id?: string;
  type?: string;
  channel?: string;
  timestamp: string;
  createdAt?: string;
  victimToken: string;
  mood?: number;
  sleep?: number;
  fear?: number;
  intrusion?: number;
  avoidance?: number;
  socialConnectedness?: number;
  perceivedSafety?: number;
  textSentiment?: number;
  distressScore?: number;
  recoveryScore?: number;
  confidence?: number;
  notes?: string;
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

export interface AdminTrends {
  distressDistribution: Record<string, number>;
  recoveryTrend: { up: number; flat: number; down: number };
  avgResolutionTimeMs: number;
}

export interface AdminReport {
  generatedAt: string;
  scope: string;
  privacyBoundary: string;
  caseStats: { caseCount: number; stageStats: { stage: string; count: number }[] };
  distressStats: {
    caseCount: number;
    distressDistribution: Record<string, number>;
    trend: { improving: number; worsening: number; stable: number; sampleSize: number; insufficientEvidence?: boolean };
  };
  recoveryStats: {
    caseCount: number;
    recoveryTrend: { recovering: number; relapsing: number; flat: number; sampleSize: number; insufficientEvidence?: boolean };
  };
  operationalMetrics: {
    totalAlerts: number;
    openAlerts: number;
    resolvedAlerts: number;
    avgAcknowledgeTimeMs: number | null;
    avgResolutionTimeMs: number | null;
    urgentAlertCount: number;
  };
}

export interface CounsellorSummary {
  id: string;
  name: string;
  email: string;
  specialisation?: string;
  state?: string;
  status?: string;
  casesAssigned?: number;
}

export type NotificationType =
  | "case_connected"
  | "case_stage_updated"
  | "upcoming_hearing"
  | "counsellor_assigned"
  | "counselling_appointment"
  | "legal_protection_update"
  | "financial_relief_update"
  | "daily_checkin";

export interface NotificationItem {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  createdAt: string;
  read: boolean;
  priority: "high" | "medium" | "low";
  metadata?: Record<string, unknown>;
}
