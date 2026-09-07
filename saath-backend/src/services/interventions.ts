import { CaseRecord } from '../types/domain.js';

export interface InterventionRecommendation {
  type: string;
  label: string;
  reason: string;
  priority: number;
}

export const getInterventionRecommendations = (caseRecord: CaseRecord): InterventionRecommendation[] => {
  const recommendations: InterventionRecommendation[] = [
    { type: "breathe", label: "Breathe", reason: "A gentle rhythm to help your body soften.", priority: 3 },
    { type: "ground", label: "Ground", reason: "Notice what is around you, one sense at a time.", priority: 3 },
    { type: "relax", label: "Relax", reason: "A guided pause for a busy or tired mind.", priority: 3 },
    { type: "listen", label: "Listen", reason: "Soft audio spaces for whenever words feel too much.", priority: 3 },
    { type: "just-stay", label: "Just Stay", reason: "You do not have to talk right now.", priority: 3 },
    { type: "understand", label: "Understand", reason: "Small, plain-language guides for hard days.", priority: 3 },
  ];

  // Prioritization logic
  if (caseRecord.caseCategory.includes("Sexual Assault")) {
    recommendations.find(r => r.type === "ground")!.priority = 1;
    recommendations.find(r => r.type === "breathe")!.priority = 1;
    recommendations.find(r => r.type === "just-stay")!.priority = 2;
  } else if (caseRecord.caseCategory.includes("Threats") || caseRecord.caseCategory.includes("Intimidation")) {
    recommendations.find(r => r.type === "ground")!.priority = 1;
    recommendations.find(r => r.type === "breathe")!.priority = 2;
  } else if (caseRecord.caseCategory.includes("Discrimination")) {
    recommendations.find(r => r.type === "understand")!.priority = 1;
    recommendations.find(r => r.type === "ground")!.priority = 2;
  } else if (caseRecord.caseCategory.includes("Murder")) {
    recommendations.find(r => r.type === "relax")!.priority = 1;
    recommendations.find(r => r.type === "listen")!.priority = 2;
  }

  // Risk level override
  if (caseRecord.currentStage === 'Investigation' && ['CRITICAL', 'HIGH'].includes('HIGH')) { // Simplified check
    recommendations.find(r => r.type === "just-stay")!.priority = 0;
    recommendations.find(r => r.type === "just-stay")!.reason = "A gentle place to start.";
  }

  return recommendations.sort((a, b) => a.priority - b.priority);
};
