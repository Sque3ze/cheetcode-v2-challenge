import { v } from "convex/values";
import { internalMutation, query, action } from "./_generated/server";
import { internal } from "./_generated/api";

/**
 * Record (or update) a challenge view. Upserts by session+challenge.
 */
export const record = internalMutation({
  args: {
    sessionId: v.id("sessions"),
    challengeId: v.string(),
    viewedAt: v.number(),
    renderToken: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("challengeViews")
      .withIndex("by_session_challenge", (q) =>
        q.eq("sessionId", args.sessionId).eq("challengeId", args.challengeId)
      )
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        viewedAt: args.viewedAt,
        renderToken: args.renderToken,
        lastInteractAt: undefined,
      });
    } else {
      await ctx.db.insert("challengeViews", {
        sessionId: args.sessionId,
        challengeId: args.challengeId,
        viewedAt: args.viewedAt,
        renderToken: args.renderToken,
      });
    }
  },
});

/**
 * Get the challenge view record for a session+challenge.
 */
export const get = query({
  args: {
    sessionId: v.id("sessions"),
    challengeId: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("challengeViews")
      .withIndex("by_session_challenge", (q) =>
        q.eq("sessionId", args.sessionId).eq("challengeId", args.challengeId)
      )
      .first();
  },
});

/**
 * Update lastInteractAt timestamp for rate-limiting.
 */
export const recordInteract = internalMutation({
  args: {
    sessionId: v.id("sessions"),
    challengeId: v.string(),
    interactAt: v.number(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("challengeViews")
      .withIndex("by_session_challenge", (q) =>
        q.eq("sessionId", args.sessionId).eq("challengeId", args.challengeId)
      )
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, { lastInteractAt: args.interactAt });
    }
  },
});

// ─── Action gateways (callable from Next.js API routes) ────────

/** Authenticated gateway for recording challenge views */
export const recordView = action({
  args: {
    secret: v.string(),
    sessionId: v.id("sessions"),
    challengeId: v.string(),
    viewedAt: v.number(),
    renderToken: v.string(),
  },
  handler: async (ctx, args): Promise<void> => {
    if (args.secret !== process.env.CONVEX_MUTATION_SECRET) {
      throw new Error("unauthorized");
    }
    const { secret: _, ...mutationArgs } = args;
    await ctx.runMutation(internal.challengeViews.record, mutationArgs);
  },
});

/** Authenticated gateway for recording interact timestamps */
export const recordInteractAction = action({
  args: {
    secret: v.string(),
    sessionId: v.id("sessions"),
    challengeId: v.string(),
    interactAt: v.number(),
  },
  handler: async (ctx, args): Promise<void> => {
    if (args.secret !== process.env.CONVEX_MUTATION_SECRET) {
      throw new Error("unauthorized");
    }
    const { secret: _, ...mutationArgs } = args;
    await ctx.runMutation(internal.challengeViews.recordInteract, mutationArgs);
  },
});
