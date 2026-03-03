/**
 * Shared ranking comparator for the leaderboard tiebreak policy.
 *
 * Used by both leaderboard.ts (sort) and sessions.ts (update check).
 * Keep in sync — this is the single source of truth for ranking order.
 *
 *   1. Higher composite score wins
 *   2. Higher completion percentage wins
 *   3. Fewer wrong attempts wins
 *   4. Earlier lastCorrectAt wins
 *   5. Fewer API calls wins
 */

/** Composite score weights: completion% × COMPLETION_WEIGHT + orchestration × ORCHESTRATION_WEIGHT */
export const COMPLETION_WEIGHT = 0.6;
export const ORCHESTRATION_WEIGHT = 0.4;

export interface RankableEntry {
  score: number;
  completionScore?: number;
  wrongAttempts: number;
  lastCorrectAt?: number;
  apiCalls?: number;
}

/** Returns negative if `a` ranks higher, positive if `b` ranks higher, 0 if equal. */
export function compareRank(a: RankableEntry, b: RankableEntry): number {
  if (b.score !== a.score) return b.score - a.score;
  const aComp = a.completionScore ?? 0;
  const bComp = b.completionScore ?? 0;
  if (bComp !== aComp) return bComp - aComp;
  if (a.wrongAttempts !== b.wrongAttempts) return a.wrongAttempts - b.wrongAttempts;
  const aTime = a.lastCorrectAt ?? Infinity;
  const bTime = b.lastCorrectAt ?? Infinity;
  if (aTime !== bTime) return aTime - bTime;
  return (a.apiCalls ?? Infinity) - (b.apiCalls ?? Infinity);
}
