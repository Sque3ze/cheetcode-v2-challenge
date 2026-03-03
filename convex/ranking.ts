/**
 * Shared ranking comparator for the leaderboard tiebreak policy.
 *
 * Used by both leaderboard.ts (sort) and sessions.ts (update check).
 * Keep in sync — this is the single source of truth for ranking order.
 *
 *   1. Higher score wins
 *   2. Fewer wrong attempts wins
 *   3. Earlier lastCorrectAt wins
 *   4. Fewer API calls wins
 */

export interface RankableEntry {
  score: number;
  wrongAttempts: number;
  lastCorrectAt?: number;
  apiCalls?: number;
}

/** Returns negative if `a` ranks higher, positive if `b` ranks higher, 0 if equal. */
export function compareRank(a: RankableEntry, b: RankableEntry): number {
  if (b.score !== a.score) return b.score - a.score;
  if (a.wrongAttempts !== b.wrongAttempts) return a.wrongAttempts - b.wrongAttempts;
  const aTime = a.lastCorrectAt ?? Infinity;
  const bTime = b.lastCorrectAt ?? Infinity;
  if (aTime !== bTime) return aTime - bTime;
  return (a.apiCalls ?? Infinity) - (b.apiCalls ?? Infinity);
}
