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

    return entries.sort(compareRank);
  },
});
