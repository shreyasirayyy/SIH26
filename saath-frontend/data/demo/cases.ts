import { AiOutput, CaseRecord, CheckIn, TimelineEvent } from "@/types";

// SYNTHETIC / DEMONSTRATION DATA ONLY.
// No real victim records, no real NHAA integration. For SIH prototype use only.

export const DEMO_CASES: CaseRecord[] = [
  {
    id: "synthetic-case-001",
    docket: "NHAA-RJ-2026-004821",
    victimToken: "VIC_8291",
    survivorName: "Sunita",
    registrationDate: "2026-08-18",
    registrationChannel: "NHAA Integrated Portal",
    state: "Rajasthan",
    district: "Jaipur",
    caseCategory: "Grievous Hurt & Intimidation",
    incidentDate: "2026-08-15",
    currentStage: "Investigation",
    firStatus: "Filed",
    investigationStatus: "In progress",
    chargesheetStatus: "Pending",
    nextHearingDate: "2026-09-18",
    hearingCount: 1,
    adjournmentCount: 0,
    compensationStatus: "Partial disbursement",
    compensationAmountApproved: 200000,
    compensationAmountReceived: 75000,
    protectionStatus: "Under review",
    relocationStatus: "Not requested",
    legalAidStatus: "Assigned",
    rehabilitationStatus: "In progress",
    counsellorAssigned: "Dr. Neha",
    preferredLanguage: "Hindi",
  },
  {
    id: "synthetic-case-002",
    docket: "NHAA-MH-2026-011932",
    victimToken: "VIC_4410",
    survivorName: "Priya",
    registrationDate: "2026-07-02",
    registrationChannel: "IVRS",
    state: "Maharashtra",
    district: "Pune",
    caseCategory: "Domestic Violence",
    incidentDate: "2026-06-28",
    currentStage: "Trial",
    firStatus: "Filed",
    investigationStatus: "Completed",
    chargesheetStatus: "Filed",
    nextHearingDate: "2026-09-10",
    hearingCount: 4,
    adjournmentCount: 2,
    compensationStatus: "Pending",
    compensationAmountApproved: 0,
    compensationAmountReceived: 0,
    protectionStatus: "Granted",
    relocationStatus: "Relocated",
    legalAidStatus: "Assigned",
    rehabilitationStatus: "Assigned",
    counsellorAssigned: "Dr. Neha",
    preferredLanguage: "Marathi",
  },
  {
    id: "synthetic-case-003",
    docket: "NHAA-UP-2026-007765",
    victimToken: "VIC_1173",
    survivorName: "Anjali",
    registrationDate: "2026-08-01",
    registrationChannel: "NHAA Integrated Portal",
    state: "Uttar Pradesh",
    district: "Lucknow",
    caseCategory: "Sexual Assault",
    incidentDate: "2026-07-30",
    currentStage: "Investigation",
    firStatus: "Filed",
    investigationStatus: "In progress",
    chargesheetStatus: "Pending",
    nextHearingDate: null,
    hearingCount: 0,
    adjournmentCount: 0,
    compensationStatus: "Not applicable",
    compensationAmountApproved: 0,
    compensationAmountReceived: 0,
    protectionStatus: "Not requested",
    relocationStatus: "Not requested",
    legalAidStatus: "Assigned",
    rehabilitationStatus: "Not started",
    counsellorAssigned: "Mr. Arjun",
    preferredLanguage: "Hindi",
  },
  {
    id: "synthetic-case-004",
    docket: "NHAA-KA-2026-002210",
    victimToken: "VIC_9052",
    survivorName: "Deepa",
    registrationDate: "2026-05-20",
    registrationChannel: "Approved NGO Channel",
    state: "Karnataka",
    district: "Bengaluru Urban",
    caseCategory: "Grievous Hurt & Intimidation",
    incidentDate: "2026-05-18",
    currentStage: "Rehabilitation",
    firStatus: "Filed",
    investigationStatus: "Completed",
    chargesheetStatus: "Filed",
    nextHearingDate: "2026-09-25",
    hearingCount: 2,
    adjournmentCount: 0,
    compensationStatus: "Disbursed",
    compensationAmountApproved: 150000,
    compensationAmountReceived: 150000,
    protectionStatus: "Granted",
    relocationStatus: "Not requested",
    legalAidStatus: "Assigned",
    rehabilitationStatus: "Completed",
    counsellorAssigned: "Dr. Neha",
    preferredLanguage: "Kannada",
  },
];

// Deterministic pseudo-random so builds/renders are stable
function seeded(seed: number) {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

function buildTrajectory(victimToken: string, weeks: number, trend: "worsening" | "improving" | "volatile") {
  const rand = seeded(victimToken.length * 97 + weeks);
  const checkIns: CheckIn[] = [];
  const aiOutputs: AiOutput[] = [];
  const start = new Date("2026-08-10");

  let sleep = 1.5, fear = 1.5, intrusion = 1.5, social = 4, distress = 30;

  for (let i = 0; i < weeks; i++) {
    const date = new Date(start);
    date.setDate(date.getDate() + i * 7);
    const iso = date.toISOString().slice(0, 10);

    const drift = trend === "worsening" ? 0.35 : trend === "improving" ? -0.3 : (rand() - 0.5) * 1.2;
    sleep = Math.min(5, Math.max(1, sleep + drift * 0.6 + (rand() - 0.5) * 0.3));
    fear = Math.min(5, Math.max(1, fear + drift * 0.5 + (rand() - 0.5) * 0.3));
    intrusion = Math.min(5, Math.max(1, intrusion + drift * 0.5 + (rand() - 0.5) * 0.3));
    social = Math.min(5, Math.max(1, social - drift * 0.4 + (rand() - 0.5) * 0.3));
    distress = Math.min(95, Math.max(10, distress + drift * 9 + (rand() - 0.5) * 5));

    checkIns.push({
      timestamp: iso,
      victimToken,
      mood: Math.round(6 - fear),
      sleep: Math.round(sleep),
      fear: Math.round(fear),
      intrusion: Math.round(intrusion),
      avoidance: Math.round((fear + intrusion) / 2),
      socialConnectedness: Math.round(social),
      perceivedSafety: Math.round(6 - fear),
      textSentiment: Number((((6 - fear) - 3) / 3).toFixed(2)),
    });

    const recovery = Math.round(100 - distress + (rand() - 0.5) * 8);
    const priority: AiOutput["priorityLevel"] =
      distress > 70 ? "P1" : distress > 55 ? "P2" : distress > 35 ? "P3" : "P4";
    const escalation: AiOutput["escalationEstimate"] =
      distress > 75 ? "Critical" : distress > 60 ? "Elevated" : distress > 40 ? "Watch" : "Stable";

    aiOutputs.push({
      victimToken,
      timestamp: iso,
      distressScore: Math.round(distress),
      recoveryScore: Math.max(5, Math.min(95, recovery)),
      confidence: i < 2 ? "Low" : i < 4 ? "Moderate" : "High",
      escalationEstimate: escalation,
      priorityLevel: priority,
      contributingSignals: [
        sleep > 3 ? "Sleep quality declining" : "Sleep stable",
        intrusion > 3 ? "Intrusive memories increased over recent check-ins" : "Intrusion low",
        social < 2.5 ? "Social engagement declining" : "Social connectedness steady",
      ],
      recommendedIntervention:
        distress > 70
          ? "Priority counsellor review recommended within 48 hours"
          : distress > 50
          ? "Suggest grounding activity and counsellor check-in this week"
          : "Continue routine check-ins; no escalation needed",
    });
  }

  return { checkIns, aiOutputs };
}

export const DEMO_TRAJECTORIES: Record<string, { checkIns: CheckIn[]; aiOutputs: AiOutput[] }> = {
  VIC_8291: buildTrajectory("VIC_8291", 8, "worsening"),
  VIC_4410: buildTrajectory("VIC_4410", 8, "improving"),
  VIC_1173: buildTrajectory("VIC_1173", 5, "volatile"),
  VIC_9052: buildTrajectory("VIC_9052", 10, "improving"),
};

export const DEMO_TIMELINE: Record<string, TimelineEvent[]> = {
  VIC_8291: [
    { date: "2026-08-18", type: "case", label: "Complaint registered (NHAA)" },
    { date: "2026-08-20", type: "support", label: "SAATH monitoring started" },
    { date: "2026-08-24", type: "wellbeing", label: "First check-in completed" },
    { date: "2026-08-28", type: "case", label: "Threat reported to protection cell" },
    { date: "2026-08-29", type: "wellbeing", label: "Sleep disturbance increased" },
    { date: "2026-08-30", type: "support", label: "Counsellor review recommended" },
    { date: "2026-09-01", type: "wellbeing", label: "Grounding activity completed" },
    { date: "2026-09-05", type: "wellbeing", label: "Distress trend flagged for review" },
  ],
};

export const DEMO_ADMIN_TRENDS = {
  districts: [
    { district: "Jaipur", state: "Rajasthan", caseload: 42, highPriority: 6, avgResponseHrs: 14, lat: 26.9124, lng: 75.7873 },
    { district: "Pune", state: "Maharashtra", caseload: 65, highPriority: 4, avgResponseHrs: 9, lat: 18.5204, lng: 73.8567 },
    { district: "Lucknow", state: "Uttar Pradesh", caseload: 88, highPriority: 11, avgResponseHrs: 19, lat: 26.8467, lng: 80.9462 },
    { district: "Bengaluru Urban", state: "Karnataka", caseload: 51, highPriority: 3, avgResponseHrs: 7, lat: 12.9716, lng: 77.5946 },
  ],
  monthlyDistressTrend: [
    { month: "Apr", avgDistress: 48, avgRecovery: 44 },
    { month: "May", avgDistress: 51, avgRecovery: 47 },
    { month: "Jun", avgDistress: 55, avgRecovery: 49 },
    { month: "Jul", avgDistress: 53, avgRecovery: 54 },
    { month: "Aug", avgDistress: 49, avgRecovery: 58 },
    { month: "Sep", avgDistress: 45, avgRecovery: 61 },
  ],
  interventionCoverage: [
    { name: "Counselling", value: 62 },
    { name: "Legal Aid", value: 48 },
    { name: "Protection", value: 21 },
    { name: "Relocation", value: 9 },
    { name: "Financial", value: 34 },
  ],
};
