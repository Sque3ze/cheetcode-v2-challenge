import { v } from "convex/values";
import { internalMutation, internalQuery, action } from "./_generated/server";
import { internal } from "./_generated/api";
import { assertSecret } from "./authHelpers";

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
      // Only update renderToken on re-view — preserve original viewedAt
      // and lastInteractAt to prevent timing/rate-limit resets
      await ctx.db.patch(existing._id, {
        renderToken: args.renderToken,
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
export const get = internalQuery({
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
    assertSecret(args.secret);
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
    assertSecret(args.secret);
    const { secret: _, ...mutationArgs } = args;
    await ctx.runMutation(internal.challengeViews.recordInteract, mutationArgs);
  },
});

/** Authenticated gateway for reading a challenge view */
export const fetchView = action({
  args: { secret: v.string(), sessionId: v.id("sessions"), challengeId: v.string() },
  handler: async (ctx, args): Promise<any> => {
    assertSecret(args.secret);
    return await ctx.runQuery(internal.challengeViews.get, {
      sessionId: args.sessionId,
      challengeId: args.challengeId,
    });
  },
});
