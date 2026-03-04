import { query } from "./_generated/server";
import { compareRank } from "./ranking";

/**
 * Get the full leaderboard, sorted by the tiebreak policy
 * defined in convex/ranking.ts.
 */
export const getAll = query({
  args: {},
  handler: async (ctx) => {
    const entries = await ctx.db
      .query("leaderboard")
      .withIndex("by_score")
      .order("desc")
      .collect();

    // Filter out test sessions from public leaderboard
    const realEntries = entries.filter((e) => !e.isTestSession);
    return realEntries.sort(compareRank);
  },
});
