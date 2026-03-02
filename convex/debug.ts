import { query } from "./_generated/server";

/** Temporary debug: list all sessions */
export const allSessions = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("sessions").order("desc").collect();
  },
});

/** Temporary debug: list all submissions */
export const allSubmissions = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("submissions").order("desc").collect();
  },
});
