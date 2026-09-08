export interface EscalationEstimate {
  status: "available" | "unavailable";
  generatedAt?: string;
  reason?: "not_configured" | "invalid_response" | "provider_error";
  result?: {
    escalation_probability: number;
    risk_level: "LOW" | "MODERATE" | "HIGH" | "CRITICAL";
    confidence: number;
    time_horizon: "7 days";
    contributing_factors: string[];
    early_warning_signals: string[];
    recommended_followup: string;
  };
}
