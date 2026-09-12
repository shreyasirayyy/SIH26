/**
 * E19 — Conversation logging policy
 * N08 — Crisis audit logging
 * N09 — Crisis response tracking
 * B17 — Data minimization pass
 * -----------------------------------------------------------------------
 * All four tasks are really the same problem from four angles: what do we
 * log, for how long, who can see it, and how do we prove a crisis event
 * was actually followed up on. Kept together in one file so the retention
 * rule and the crisis-audit shape stay consistent.
 */

/** E19 — Conversation logging policy ------------------------------------ */

/**
 * How long different classes of data are retained in the store, in days.
 * `null` = kept only as long as the demo/session lasts (never persisted
 * to a durable table in memory-mode).
 *
 * This is the documented + enforced retention policy required by E19's
 * acceptance criteria ("Retention policy documented and enforced").
 */
export const RETENTION_POLICY_DAYS = {
  taaraConversationMetadata: 90, // safetyState, confidence, model version — no raw message text
  taaraRawMessageText: 0, // never persisted past the request/response cycle
  auditLogs: 365,
  crisisAuditLogs: 730, // crisis events are retained longer for safety review
  engagementSignals: 180,
} as const;

export interface ConversationLogEntry {
  id: string;
  victimToken?: string;
  createdAt: string;
  safetyState: string;
  confidence: number;
  modelVersion: string;
}

/**
 * Builds the conversation log entry that is safe to persist under the
 * policy above: metadata only, never the raw message text. This is what
 * services/app.ts should call instead of logging `req.body.message`
 * directly.
 */
export function buildConversationLogEntry(idFn: () => string, params: {
  victimToken?: string;
  safetyState: string;
  confidence: number;
  modelVersion: string;
}): ConversationLogEntry {
  return {
    id: idFn(),
    victimToken: params.victimToken,
    createdAt: new Date().toISOString(),
    safetyState: params.safetyState,
    confidence: params.confidence,
    modelVersion: params.modelVersion,
  };
}

/** Returns true if a record is older than its retention window and should be purged. */
export function isExpired(createdAt: string, retentionDays: number): boolean {
  if (retentionDays <= 0) return true;
  const ageMs = Date.now() - new Date(createdAt).getTime();
  return ageMs > retentionDays * 24 * 60 * 60 * 1000;
}

/** N08 — Crisis audit logging -------------------------------------------- */

export interface CrisisAuditEntry {
  id: string;
  alertId: string;
  victimToken?: string;
  source: 'taara' | 'text' | 'voice' | 'checkin' | 'manual';
  detectedAt: string;
  acknowledgedAt?: string;
  resolvedAt?: string;
  outcome?: 'human_review_completed' | 'false_positive' | 'escalated_to_authorities' | 'ongoing';
  notes?: string;
}

type RecordFn = (key: string, value: unknown) => unknown;

/** Every crisis alert creation MUST call this — it is the single source of truth for N08/N09. */
export function logCrisisEvent(
  record: RecordFn,
  idFn: () => string,
  params: { alertId: string; victimToken?: string; source: CrisisAuditEntry['source'] }
): CrisisAuditEntry {
  const entry: CrisisAuditEntry = {
    id: idFn(),
    alertId: params.alertId,
    victimToken: params.victimToken,
    source: params.source,
    detectedAt: new Date().toISOString(),
    outcome: 'ongoing',
  };
  record('audit:crisis', entry);
  return entry;
}

/** Called when a crisis alert is acknowledged or resolved to close out the audit trail. */
export function updateCrisisEventOutcome(
  entries: CrisisAuditEntry[],
  alertId: string,
  update: Partial<Pick<CrisisAuditEntry, 'acknowledgedAt' | 'resolvedAt' | 'outcome' | 'notes'>>
): CrisisAuditEntry | null {
  const entry = [...entries].reverse().find((e) => e.alertId === alertId);
  if (!entry) return null;
  Object.assign(entry, update);
  return entry;
}

/** N09 — Crisis response tracking ----------------------------------------- */

export interface CrisisResponseMetrics {
  totalCrisisEvents: number;
  acknowledgedCount: number;
  resolvedCount: number;
  avgAcknowledgeMs: number | null;
  avgResolveMs: number | null;
  outstandingCount: number;
}

/** Computes the "response time metric" required by N09's acceptance criteria. */
export function computeCrisisResponseMetrics(entries: CrisisAuditEntry[]): CrisisResponseMetrics {
  const ackDurations = entries
    .filter((e) => e.acknowledgedAt)
    .map((e) => new Date(e.acknowledgedAt!).getTime() - new Date(e.detectedAt).getTime());
  const resolveDurations = entries
    .filter((e) => e.resolvedAt)
    .map((e) => new Date(e.resolvedAt!).getTime() - new Date(e.detectedAt).getTime());

  return {
    totalCrisisEvents: entries.length,
    acknowledgedCount: entries.filter((e) => e.acknowledgedAt).length,
    resolvedCount: entries.filter((e) => e.resolvedAt).length,
    avgAcknowledgeMs: ackDurations.length ? Math.round(ackDurations.reduce((a, b) => a + b, 0) / ackDurations.length) : null,
    avgResolveMs: resolveDurations.length ? Math.round(resolveDurations.reduce((a, b) => a + b, 0) / resolveDurations.length) : null,
    outstandingCount: entries.filter((e) => !e.resolvedAt).length,
  };
}

/** B17 — Data minimization pass ------------------------------------------- */

/**
 * Field-level allowlists per downstream consumer. Used both as living
 * documentation (this doubles as the "schema review doc" acceptance
 * criteria) and as an enforceable projection function, so a route can't
 * accidentally leak more than it should to, say, the ML pipeline.
 */
export const MINIMIZATION_SCHEMA = {
  // The ML pipeline must only ever receive a pseudonymous token, never name/phone/docket.
  mlPipelineInput: ['victimToken', 'text', 'language', 'audio', 'mimeType'] as const,
  // Admin/aggregate dashboards must never receive individually identifying fields.
  adminAggregateOutput: ['scope', 'caseCount', 'alertStats', 'distressDistribution', 'recoveryTrend'] as const,
  // Counsellor case view is allowed identity fields because counsellors are the authorised
  // human-in-the-loop role; survivors and admins are not.
  counsellorCaseView: ['id', 'docket', 'victimToken', 'survivorName', 'caseCategory', 'currentStage', 'riskLevel'] as const,
  // A survivor viewing their own case must never see their own registeredPhone echoed back
  // in the payload — the phone number is only ever used server-side to match SMS replies,
  // never surfaced in an API response, even to the survivor it belongs to.
  survivorCaseView: [
    'id', 'reference_id', 'docket_id', 'docket', 'isSynthetic', 'survivorName', 'registrationDate',
    'registrationChannel', 'state', 'district', 'caseCategory', 'incidentDate', 'currentStage',
    'firStatus', 'investigationStatus', 'chargesheetStatus', 'nextHearingDate', 'hearingCount',
    'adjournmentCount', 'compensationStatus', 'compensationAmountApproved', 'compensationAmountReceived',
    'protectionStatus', 'relocationStatus', 'legalAidStatus', 'rehabilitationStatus', 'counsellorAssigned',
    'preferredLanguage', 'riskLevel', 'firDate', 'firNumber', 'investigatingOfficerId', 'pendingAmount',
    'threatLastReported', 'protectionOfficerAssigned', 'monitoringStarted', 'baselineDistressScore',
    'currentDistressScore'
  ] as const,
} as const;

/** Projects an object down to an allowlisted set of keys — enforces the schema above at runtime. */
export function minimize<T extends Record<string, unknown>>(obj: T, allowlist: readonly string[]): Partial<T> {
  const result: Partial<T> = {};
  for (const key of allowlist) {
    if (key in obj) (result as Record<string, unknown>)[key] = obj[key];
  }
  return result;
}