import type { MlResult } from './ml.js';

/**
 * M11 — Community moderation pipeline
 * -----------------------------------------------------------------------
 * Acceptance criteria: "Unsafe content blocked before publish." The
 * previous implementation only marked flagged posts 'pending' but still
 * inserted them into the same list the community feed reads from — i.e.
 * nothing was actually blocked. This module makes the block real: an
 * unsafe post is written to a moderation queue instead of the public feed,
 * and only a human moderator action can move it across.
 */

export type ModerationDecision = 'approved' | 'blocked' | 'queued_for_review';

export interface ModerationResult {
  decision: ModerationDecision;
  reason: string;
}

const UNSAFE_PATTERNS = [
  /\b(kill (myself|yourself)|suicide|end (my|it) all)\b/i,
  /\b(address|phone number|meet me at)\b.{0,40}\b(now|tonight|come)\b/i, // crude doxxing/meet-up bait heuristic
];

/**
 * Decides whether a community post should be published, blocked outright,
 * or queued for a human moderator — using the same ML crisis signal as
 * the rest of the platform, plus a couple of pattern-based unsafe-content
 * checks that don't require a model call (fast-path for obvious cases).
 */
export function moderatePost(body: string, analysis: Pick<MlResult, 'crisis' | 'confidence'>): ModerationResult {
  if (UNSAFE_PATTERNS.some((pattern) => pattern.test(body))) {
    return { decision: 'blocked', reason: 'Content matched an unsafe-content pattern and was blocked before publish.' };
  }
  if (analysis.crisis) {
    return { decision: 'queued_for_review', reason: 'Crisis language detected — held for moderator review, not published.' };
  }
  if (analysis.confidence < 0.4) {
    return { decision: 'queued_for_review', reason: 'Low-confidence analysis — held for moderator review before publish.' };
  }
  return { decision: 'approved', reason: 'No unsafe patterns or crisis signal detected.' };
}

export interface ModerationQueueItem {
  id: string;
  postId: string;
  authorToken?: string;
  body: string;
  reason: string;
  status: 'open' | 'approved' | 'rejected';
  createdAt: string;
  resolvedAt?: string;
  resolvedBy?: string;
}