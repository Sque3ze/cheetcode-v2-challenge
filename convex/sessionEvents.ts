import { v } from "convex/values";
import { internalMutation, internalQuery, action } from "./_generated/server";
import { internal } from "./_generated/api";
import { assertSecret } from "./authHelpers";

const EVENT_TYPES = v.union(
  v.literal("session_started"),
  v.literal("challenge_viewed"),
  v.literal("challenge_interacted"),
  v.literal("answer_submitted"),
  v.literal("answer_correct"),
  v.literal("answer_wrong"),
  v.literal("challenge_locked"),
  v.literal("session_completed")
);

/**
 * Insert a single event into the session event log.
 */
export const emit = internalMutation({
  args: {
    sessionId: v.id("sessions"),
    type: EVENT_TYPES,
    challengeId: v.optional(v.string()),
    metadata: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("sessionEvents", {
      sessionId: args.sessionId,
      type: args.type,
      timestamp: Date.now(),
      challengeId: args.challengeId,
      metadata: args.metadata,
    });
  },
});

/**
 * Authenticated action gateway for emitting events from API routes.
 * Fire-and-forget — callers should .catch(() => {}).
 */
export const emitEvent = action({
  args: {
    secret: v.string(),
    sessionId: v.id("sessions"),
    type: EVENT_TYPES,
    challengeId: v.optional(v.string()),
    metadata: v.optional(v.any()),
  },
  handler: async (ctx, args): Promise<void> => {
    assertSecret(args.secret);
    await ctx.runMutation(internal.sessionEvents.emit, {
      sessionId: args.sessionId,
      type: args.type,
      challengeId: args.challengeId,
      metadata: args.metadata,
    });
  },
});

/**
 * Get all events for a session, ordered by timestamp ascending.
 * Used for session timeline replay.
 */
export const getBySession = internalQuery({
  args: { sessionId: v.id("sessions") },
  handler: async (ctx, args) => {
    const events = await ctx.db
      .query("sessionEvents")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .collect();
    return events.sort((a, b) => a.timestamp - b.timestamp);
  },
});

/**
 * Get events of a specific type for a session.
 */
export const getBySessionAndType = internalQuery({
  args: {
    sessionId: v.id("sessions"),
    type: EVENT_TYPES,
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("sessionEvents")
      .withIndex("by_session_type", (q) =>
        q.eq("sessionId", args.sessionId).eq("type", args.type)
      )
      .collect();
  },
});

/** Authenticated gateway for reading session events */
export const fetchBySession = action({
  args: { secret: v.string(), sessionId: v.id("sessions") },
  handler: async (ctx, args): Promise<any> => {
    assertSecret(args.secret);
    return await ctx.runQuery(internal.sessionEvents.getBySession, {
      sessionId: args.sessionId,
    });
  },
});
