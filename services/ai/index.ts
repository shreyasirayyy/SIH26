import { DEMO_TRAJECTORIES } from "@/data/demo/cases";
import { AiOutput, CheckIn } from "@/types";

// AI service abstraction. Demo implementations only — no real model calls.
// Frontend components must go through this abstraction, never hard-code AI logic.

function delay<T>(value: T, ms = 500): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms));
}

export const aiService = {
  async analyzeCheckIn(_checkIn: Partial<CheckIn>): Promise<{ acknowledged: boolean }> {
    return delay({ acknowledged: true }, 400);
  },

  async getDistressTrajectory(victimToken: string): Promise<AiOutput[]> {
    return delay(DEMO_TRAJECTORIES[victimToken]?.aiOutputs ?? [], 300);
  },

  async getCheckInHistory(victimToken: string): Promise<CheckIn[]> {
    return delay(DEMO_TRAJECTORIES[victimToken]?.checkIns ?? [], 300);
  },

  async getLatestEstimate(victimToken: string): Promise<AiOutput | null> {
    const traj = DEMO_TRAJECTORIES[victimToken]?.aiOutputs ?? [];
    return delay(traj.length ? traj[traj.length - 1] : null, 300);
  },

  async getExplanation(victimToken: string): Promise<string[]> {
    const latest = DEMO_TRAJECTORIES[victimToken]?.aiOutputs.at(-1);
    return delay(latest?.contributingSignals ?? [], 200);
  },

  async getRecommendation(victimToken: string): Promise<string> {
    const latest = DEMO_TRAJECTORIES[victimToken]?.aiOutputs.at(-1);
    return delay(latest?.recommendedIntervention ?? "No recommendation available yet.", 200);
  },
};
