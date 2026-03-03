import { v } from "convex/values";
import { internalMutation, internalQuery, action } from "./_generated/server";
import { internal } from "./_generated/api";
import { assertSecret } from "./authHelpers";

/**
 * Record a submission attempt for a challenge.
 * Called by the validation API route after checking the answer.
 */
export const record = internalMutation({
  args: {
    sessionId: v.id("sessions"),
    challengeId: v.string(),
    answer: v.string(),
    correct: v.boolean(),
    attemptNumber: v.number(),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("submissions", {
      sessionId: args.sessionId,
      challengeId: args.challengeId,
      answer: args.answer,
      correct: args.correct,
      attemptNumber: args.attemptNumber,
      submittedAt: Date.now(),
    });
  },
});

/**
 * Get all submissions for a session.
 */
export const getBySession = internalQuery({
  args: { sessionId: v.id("sessions") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("submissions")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .collect();
  },
});

/**
 * Get submissions for a specific challenge in a session.
 */
export const getBySessionChallenge = internalQuery({
  args: { sessionId: v.id("sessions"), challengeId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("submissions")
      .withIndex("by_session_challenge", (q) =>
        q.eq("sessionId", args.sessionId).eq("challengeId", args.challengeId)
      )
      .collect();
  },
});

/**
 * Get the attempt count and solved status for all challenges in a session.
 * Used by the session status API to return challenge statuses.
 */
export const getSessionChallengeStatuses = internalQuery({
  args: { sessionId: v.id("sessions") },
  handler: async (ctx, args) => {
    const submissions = await ctx.db
      .query("submissions")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .collect();

    // Aggregate by challenge
    const statusMap = new Map<
      string,
      { attempts: number; solved: boolean; lastCorrectAt?: number }
    >();

    for (const sub of submissions) {
      const existing = statusMap.get(sub.challengeId) ?? {
        attempts: 0,
        solved: false,
      };
      existing.attempts = Math.max(existing.attempts, sub.attemptNumber);
      if (sub.correct) {
        existing.solved = true;
        existing.lastCorrectAt = sub.submittedAt;
      }
      statusMap.set(sub.challengeId, existing);
    }

    // Convert Map to plain object for Convex serialization
    const result: Record<
      string,
      { attempts: number; solved: boolean; lastCorrectAt?: number }
    > = {};
    for (const [key, value] of statusMap) {
      result[key] = value;
    }
    return result;
  },
});

// ─── Action gateways ───────────────────────────────────────────

/** Authenticated gateway for recording submissions */
export const recordSubmission = action({
  args: {
    secret: v.string(),
    sessionId: v.id("sessions"),
    challengeId: v.string(),
    answer: v.string(),
    correct: v.boolean(),
    attemptNumber: v.number(),
  },
  handler: async (ctx, args): Promise<void> => {
    assertSecret(args.secret);
    const { secret: _, ...mutationArgs } = args;
    await ctx.runMutation(internal.submissions.record, mutationArgs);
  },
});

/**
 * Get aggregate stats for a session (for scoring).
 */
export const getSessionStats = internalQuery({
  args: { sessionId: v.id("sessions") },
  handler: async (ctx, args) => {
    const submissions = await ctx.db
      .query("submissions")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .collect();

    let wrongAttempts = 0;
    let lastCorrectAt: number | undefined;
    const solvedChallenges = new Set<string>();

    for (const sub of submissions) {
      if (sub.correct) {
        solvedChallenges.add(sub.challengeId);
        if (!lastCorrectAt || sub.submittedAt > lastCorrectAt) {
          lastCorrectAt = sub.submittedAt;
        }
      } else {
        wrongAttempts++;
      }
    }

    return {
      solvedChallenges: Array.from(solvedChallenges),
      wrongAttempts,
      lastCorrectAt,
    };
  },
});

// ─── Read action gateways ─────────────────────────────────────

/** Authenticated gateway for getBySessionChallenge */
export const fetchBySessionChallenge = action({
  args: { secret: v.string(), sessionId: v.id("sessions"), challengeId: v.string() },
  handler: async (ctx, args): Promise<any> => {
    assertSecret(args.secret);
    return await ctx.runQuery(internal.submissions.getBySessionChallenge, {
      sessionId: args.sessionId,
      challengeId: args.challengeId,
    });
  },
});

/** Authenticated gateway for getSessionChallengeStatuses */
export const fetchSessionChallengeStatuses = action({
  args: { secret: v.string(), sessionId: v.id("sessions") },
  handler: async (ctx, args): Promise<any> => {
    assertSecret(args.secret);
    return await ctx.runQuery(internal.submissions.getSessionChallengeStatuses, {
      sessionId: args.sessionId,
    });
  },
});

/** Authenticated gateway for getSessionStats */
export const fetchSessionStats = action({
  args: { secret: v.string(), sessionId: v.id("sessions") },
  handler: async (ctx, args): Promise<any> => {
    assertSecret(args.secret);
    return await ctx.runQuery(internal.submissions.getSessionStats, {
      sessionId: args.sessionId,
    });
  },
});
