import { query } from "./_generated/server";

/**
 * Get the full leaderboard, sorted by:
 * 1. Score (percentage) descending
 * 2. Wrong attempts ascending (tiebreaker 1)
 * 3. Last correct submission time ascending (tiebreaker 2)
 */
export const getAll = query({
  args: {},
  handler: async (ctx) => {
    const entries = await ctx.db
      .query("leaderboard")
      .withIndex("by_score")
      .order("desc")
      .collect();

    // Apply tiebreakers
    return entries.sort((a, b) => {
      // Primary: higher score wins
      if (b.score !== a.score) return b.score - a.score;
      // Tiebreaker 1: fewer wrong attempts wins
      if (a.wrongAttempts !== b.wrongAttempts)
        return a.wrongAttempts - b.wrongAttempts;
      // Tiebreaker 2: earlier last correct answer wins
      const aTime = a.lastCorrectAt ?? Infinity;
      const bTime = b.lastCorrectAt ?? Infinity;
      return aTime - bTime;
    });
  },
});
