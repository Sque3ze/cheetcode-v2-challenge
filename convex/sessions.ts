import { v } from "convex/values";
import { internalMutation, internalQuery, action } from "./_generated/server";
import { internal } from "./_generated/api";
import { assertSecret } from "./authHelpers";
import { compareRank, COMPLETION_WEIGHT, ORCHESTRATION_WEIGHT } from "./ranking";

const SESSION_COOLDOWN_MS = 10_000;

/**
 * Create a new timed session.
 * Server sets the clock — no client-reported timestamps trusted.
 */
export const create = internalMutation({
  args: { github: v.string(), durationMs: v.number(), userAgent: v.optional(v.string()), isTestSession: v.optional(v.boolean()) },
  handler: async (ctx, args) => {
    // Rate limit: reject if user has an active or very recent session
    const active = await ctx.db
      .query("sessions")
      .withIndex("by_github_status", (q) =>
        q.eq("github", args.github).eq("status", "active")
      )
      .first();
    if (active) {
      // If it's expired but not yet marked, mark it
      if (Date.now() > active.expiresAt) {
        await ctx.db.patch(active._id, { status: "expired" });
      } else {
        throw new Error("active session already exists");
      }
    }

    // Cooldown check
    const recent = await ctx.db
      .query("sessions")
      .withIndex("by_github", (q) => q.eq("github", args.github))
      .order("desc")
      .first();
    if (recent && Date.now() - recent.startedAt < SESSION_COOLDOWN_MS) {
      throw new Error("rate limited — wait a few seconds");
    }

    const startedAt = Date.now();
    const expiresAt = startedAt + args.durationMs;

    const sessionId = await ctx.db.insert("sessions", {
      github: args.github,
      startedAt,
      expiresAt,
      status: "active",
      userAgent: args.userAgent,
      isTestSession: args.isTestSession,
    });

    // Auto-expire if still active after the time limit
    await ctx.scheduler.runAfter(args.durationMs, internal.sessions.expire, {
      sessionId,
    });

    return { sessionId, startedAt, expiresAt };
  },
});

/**
 * Increment the API call counter for a session.
 */
export const incrementApiCalls = internalMutation({
  args: { sessionId: v.id("sessions") },
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.sessionId);
    if (!session) return;
    await ctx.db.patch(args.sessionId, {
      apiCalls: (session.apiCalls ?? 0) + 1,
    });
  },
});

/**
 * Get a session by ID.
 */
export const get = internalQuery({
  args: { sessionId: v.id("sessions") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.sessionId);
  },
});

/**
 * Get the active session for a user (if any).
 */
export const getActive = internalQuery({
  args: { github: v.string() },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_github_status", (q) =>
        q.eq("github", args.github).eq("status", "active")
      )
      .first();

    if (!session) return null;

    // Check if expired
    if (Date.now() > session.expiresAt) {
      return null; // Will be marked expired by the complete mutation
    }

    return session;
  },
});

/**
 * Mark a session as completed and compute final score.
 */
export const complete = internalMutation({
  args: {
    sessionId: v.id("sessions"),
    github: v.string(),
    earnedPoints: v.number(),
    totalPoints: v.number(),
    wrongAttempts: v.number(),
    lastCorrectAt: v.optional(v.number()),
    apiCalls: v.optional(v.number()),
    orchestrationScore: v.optional(v.number()),
    orchestrationMetrics: v.optional(
      v.object({
        parallelizationScore: v.number(),
        dagEfficiency: v.number(),
        criticalPathSpeed: v.number(),
        submissionConfidence: v.number(),
        failureRecoveryScore: v.optional(v.number()),
        tiersReached: v.number(),
      })
    ),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.sessionId);
    if (!session) throw new Error("session not found");
    if (session.github !== args.github) throw new Error("github mismatch");

    // Compute completion percentage (raw)
    const completionScore =
      args.totalPoints > 0
        ? Math.round((args.earnedPoints / args.totalPoints) * 10000) / 100
        : 0;

    // Compute composite score
    const orchPct = args.orchestrationScore ?? 0;
    const score = Math.round((completionScore * COMPLETION_WEIGHT + orchPct * ORCHESTRATION_WEIGHT) * 100) / 100;

    // Mark session completed and persist metrics on the session record
    await ctx.db.patch(args.sessionId, {
      status: "completed",
      earnedPoints: args.earnedPoints,
      totalPoints: args.totalPoints,
      wrongAttempts: args.wrongAttempts,
      score,
      completionScore,
      orchestrationScore: args.orchestrationScore,
      orchestrationMetrics: args.orchestrationMetrics,
    });

    // Update leaderboard (only if this is a new best score)
    const existing = await ctx.db
      .query("leaderboard")
      .withIndex("by_github", (q) => q.eq("github", args.github))
      .first();

    const entry = {
      github: args.github,
      score,
      completionScore,
      earnedPoints: args.earnedPoints,
      totalPoints: args.totalPoints,
      wrongAttempts: args.wrongAttempts,
      lastCorrectAt: args.lastCorrectAt,
      apiCalls: args.apiCalls,
      completedAt: Date.now(),
      sessionId: args.sessionId,
      orchestrationScore: args.orchestrationScore,
      orchestrationMetrics: args.orchestrationMetrics,
      isTestSession: session.isTestSession,
    };

    if (!existing) {
      if (args.earnedPoints > 0) {
        await ctx.db.insert("leaderboard", entry);
      }
    } else if (compareRank({ score, ...args }, existing) < 0) {
      await ctx.db.patch(existing._id, entry);
    }

    return { score, completionScore, earnedPoints: args.earnedPoints, totalPoints: args.totalPoints };
  },
});

/**
 * Expire a session (called when time runs out).
 */
export const expire = internalMutation({
  args: { sessionId: v.id("sessions") },
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.sessionId);
    if (!session) return;
    if (session.status === "active") {
      await ctx.db.patch(args.sessionId, { status: "expired" });
    }
  },
});

// ─── Action gateways (callable from Next.js API routes) ────────

/** Authenticated gateway for creating sessions */
export const createSession = action({
  args: { secret: v.string(), github: v.string(), durationMs: v.number(), userAgent: v.optional(v.string()), isTestSession: v.optional(v.boolean()) },
  handler: async (
    ctx,
    args
  ): Promise<{ sessionId: string; startedAt: number; expiresAt: number }> => {
    assertSecret(args.secret);
    return await ctx.runMutation(internal.sessions.create, {
      github: args.github,
      durationMs: args.durationMs,
      userAgent: args.userAgent,
      isTestSession: args.isTestSession,
    });
  },
});

/** Authenticated gateway for incrementing API call counter */
export const trackApiCall = action({
  args: { secret: v.string(), sessionId: v.id("sessions") },
  handler: async (ctx, args): Promise<void> => {
    assertSecret(args.secret);
    await ctx.runMutation(internal.sessions.incrementApiCalls, {
      sessionId: args.sessionId,
    });
  },
});

/** Authenticated gateway for completing sessions */
export const completeSession = action({
  args: {
    secret: v.string(),
    sessionId: v.id("sessions"),
    github: v.string(),
    earnedPoints: v.number(),
    totalPoints: v.number(),
    wrongAttempts: v.number(),
    lastCorrectAt: v.optional(v.number()),
    apiCalls: v.optional(v.number()),
    orchestrationScore: v.optional(v.number()),
    orchestrationMetrics: v.optional(
      v.object({
        parallelizationScore: v.number(),
        dagEfficiency: v.number(),
        criticalPathSpeed: v.number(),
        submissionConfidence: v.number(),
        failureRecoveryScore: v.optional(v.number()),
        tiersReached: v.number(),
      })
    ),
  },
  handler: async (
    ctx,
    args
  ): Promise<{ score: number; completionScore: number; earnedPoints: number; totalPoints: number }> => {
    assertSecret(args.secret);
    const { secret: _, ...mutationArgs } = args;
    return await ctx.runMutation(internal.sessions.complete, mutationArgs);
  },
});

/** Authenticated gateway for reading a session by ID */
export const fetchSession = action({
  args: { secret: v.string(), sessionId: v.id("sessions") },
  handler: async (ctx, args): Promise<any> => {
    assertSecret(args.secret);
    return await ctx.runQuery(internal.sessions.get, { sessionId: args.sessionId });
  },
});

/** Combined gateway: fetch session + challenge statuses in one action */
export const fetchSessionWithStatuses = action({
  args: { secret: v.string(), sessionId: v.id("sessions") },
  handler: async (ctx, args): Promise<{ session: any; statuses: any }> => {
    assertSecret(args.secret);
    const [session, statuses] = await Promise.all([
      ctx.runQuery(internal.sessions.get, { sessionId: args.sessionId }),
      ctx.runQuery(internal.submissions.getSessionChallengeStatuses, { sessionId: args.sessionId }),
    ]);
    return { session, statuses };
  },
});

/** Combined gateway: fetch active session by github + challenge statuses in one action */
export const fetchActiveSessionWithStatuses = action({
  args: { secret: v.string(), github: v.string() },
  handler: async (ctx, args): Promise<{ session: any; statuses: any }> => {
    assertSecret(args.secret);
    const session = await ctx.runQuery(internal.sessions.getActive, { github: args.github });
    if (!session) return { session: null, statuses: {} };
    const statuses = await ctx.runQuery(internal.submissions.getSessionChallengeStatuses, { sessionId: session._id });
    return { session, statuses };
  },
});
