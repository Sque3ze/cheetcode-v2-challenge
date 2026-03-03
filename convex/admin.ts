import { internalQuery, action } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import { assertSecret } from "./authHelpers";

/**
 * Overview stats for the admin dashboard.
 */
export const getOverviewStats = internalQuery({
  args: {},
  handler: async (ctx) => {
    const sessions = await ctx.db.query("sessions").collect();
    const leaderboard = await ctx.db.query("leaderboard").collect();

    const totalSessions = sessions.length;
    const completedSessions = sessions.filter(
      (s) => s.status === "completed"
    ).length;

    const avgScore =
      leaderboard.length > 0
        ? leaderboard.reduce((sum, e) => sum + e.score, 0) / leaderboard.length
        : 0;

    // Count user agents
    const agentCounts = new Map<string, number>();
    for (const s of sessions) {
      const ua = s.userAgent || "Unknown";
      agentCounts.set(ua, (agentCounts.get(ua) || 0) + 1);
    }
    let topAgent = "Unknown";
    let topAgentCount = 0;
    for (const [ua, count] of agentCounts) {
      if (count > topAgentCount) {
        topAgent = ua;
        topAgentCount = count;
      }
    }

    return {
      totalSessions,
      completedSessions,
      avgScore: Math.round(avgScore * 10) / 10,
      uniquePlayers: leaderboard.length,
      topUserAgent: topAgent,
    };
  },
});

/**
 * Per-challenge aggregate stats.
 */
export const getChallengeAggregates = internalQuery({
  args: {},
  handler: async (ctx) => {
    const submissions = await ctx.db.query("submissions").collect();
    const views = await ctx.db.query("challengeViews").collect();

    // Group by challenge
    const challengeStats = new Map<
      string,
      {
        totalAttempts: number;
        correctAttempts: number;
        sessionsAttempted: Set<string>;
        sessionsSolved: Set<string>;
        sessionsLocked: Set<string>;
        solveTimes: number[];
        wrongAnswers: Map<string, number>;
      }
    >();

    const ensure = (id: string) => {
      if (!challengeStats.has(id)) {
        challengeStats.set(id, {
          totalAttempts: 0,
          correctAttempts: 0,
          sessionsAttempted: new Set(),
          sessionsSolved: new Set(),
          sessionsLocked: new Set(),
          solveTimes: [],
          wrongAnswers: new Map(),
        });
      }
      return challengeStats.get(id)!;
    };

    // Build view time lookup
    const viewTimes = new Map<string, number>(); // "sessionId:challengeId" -> viewedAt
    for (const v of views) {
      viewTimes.set(`${v.sessionId}:${v.challengeId}`, v.viewedAt);
    }

    // Track per-session attempt counts for lock detection
    const sessionAttempts = new Map<string, number>(); // "sessionId:challengeId" -> count

    for (const sub of submissions) {
      const stats = ensure(sub.challengeId);
      stats.totalAttempts++;
      stats.sessionsAttempted.add(sub.sessionId);

      const key = `${sub.sessionId}:${sub.challengeId}`;
      const prevCount = sessionAttempts.get(key) || 0;
      sessionAttempts.set(key, prevCount + 1);

      if (sub.correct) {
        stats.correctAttempts++;
        stats.sessionsSolved.add(sub.sessionId);

        // Compute solve time
        const viewedAt = viewTimes.get(key);
        if (viewedAt) {
          stats.solveTimes.push(sub.submittedAt - viewedAt);
        }
      } else {
        // Track wrong answer
        const trimmed = sub.answer.slice(0, 50);
        stats.wrongAnswers.set(
          trimmed,
          (stats.wrongAnswers.get(trimmed) || 0) + 1
        );

        // Check if locked (3 wrong in a session without solve)
        if (
          prevCount + 1 >= 3 &&
          !stats.sessionsSolved.has(sub.sessionId)
        ) {
          stats.sessionsLocked.add(sub.sessionId);
        }
      }
    }

    // Convert to serializable array
    const result: Array<{
      challengeId: string;
      totalAttempts: number;
      successRate: number;
      avgAttempts: number;
      avgSolveTimeMs: number | null;
      lockRate: number;
      topWrongAnswers: Array<{ answer: string; count: number }>;
    }> = [];

    for (const [challengeId, stats] of challengeStats) {
      const sessionsCount = stats.sessionsAttempted.size;
      const successRate =
        sessionsCount > 0 ? stats.sessionsSolved.size / sessionsCount : 0;
      const avgAttempts =
        sessionsCount > 0 ? stats.totalAttempts / sessionsCount : 0;
      const avgSolveTimeMs =
        stats.solveTimes.length > 0
          ? stats.solveTimes.reduce((a, b) => a + b, 0) /
            stats.solveTimes.length
          : null;
      const lockRate =
        sessionsCount > 0 ? stats.sessionsLocked.size / sessionsCount : 0;

      // Top 3 wrong answers
      const topWrongAnswers = Array.from(stats.wrongAnswers.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([answer, count]) => ({ answer, count }));

      result.push({
        challengeId,
        totalAttempts: stats.totalAttempts,
        successRate: Math.round(successRate * 1000) / 10,
        avgAttempts: Math.round(avgAttempts * 10) / 10,
        avgSolveTimeMs: avgSolveTimeMs
          ? Math.round(avgSolveTimeMs)
          : null,
        lockRate: Math.round(lockRate * 1000) / 10,
        topWrongAnswers,
      });
    }

    return result.sort((a, b) => a.challengeId.localeCompare(b.challengeId));
  },
});

/**
 * Recent sessions with basic stats.
 */
export const getRecentSessions = internalQuery({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 20;
    const sessions = await ctx.db
      .query("sessions")
      .order("desc")
      .take(limit);

    const results = [];
    for (const session of sessions) {
      // Get submission stats
      const submissions = await ctx.db
        .query("submissions")
        .withIndex("by_session", (q) => q.eq("sessionId", session._id))
        .collect();

      const solvedChallenges = new Set<string>();
      let wrongAttempts = 0;
      for (const sub of submissions) {
        if (sub.correct) solvedChallenges.add(sub.challengeId);
        else wrongAttempts++;
      }

      // Prefer session-level fields; fall back to leaderboard for pre-migration sessions
      let score = session.score ?? null;
      let orchestrationScore = session.orchestrationScore ?? null;
      let orchestrationMetrics = session.orchestrationMetrics ?? null;
      if (score == null && session.status === "completed") {
        const lbEntry = await ctx.db
          .query("leaderboard")
          .withIndex("by_github", (q) => q.eq("github", session.github))
          .first();
        if (lbEntry?.sessionId === session._id) {
          score = lbEntry.score;
          orchestrationScore = lbEntry.orchestrationScore ?? null;
          orchestrationMetrics = lbEntry.orchestrationMetrics ?? null;
        }
      }

      results.push({
        _id: session._id,
        github: session.github,
        startedAt: session.startedAt,
        expiresAt: session.expiresAt,
        status: session.status,
        userAgent: session.userAgent,
        apiCalls: session.apiCalls ?? 0,
        solvedChallenges: Array.from(solvedChallenges),
        wrongAttempts,
        score,
        orchestrationScore,
        orchestrationMetrics,
      });
    }

    return results;
  },
});

/**
 * Full event timeline for a single session.
 */
export const getSessionTimeline = internalQuery({
  args: { sessionId: v.id("sessions") },
  handler: async (ctx, args) => {
    const events = await ctx.db
      .query("sessionEvents")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .collect();
    return events.sort((a, b) => a.timestamp - b.timestamp);
  },
});

// ─── Authenticated action gateways ──────────────────────────

// Return types are inferred from the internal queries; explicit `any` breaks
// the circular reference that Convex codegen creates with action return types.

export const fetchOverviewStats = action({
  args: { secret: v.string() },
  handler: async (ctx, args): Promise<any> => {
    assertSecret(args.secret);
    return await ctx.runQuery(internal.admin.getOverviewStats, {});
  },
});

export const fetchChallengeAggregates = action({
  args: { secret: v.string() },
  handler: async (ctx, args): Promise<any> => {
    assertSecret(args.secret);
    return await ctx.runQuery(internal.admin.getChallengeAggregates, {});
  },
});

export const fetchRecentSessions = action({
  args: { secret: v.string(), limit: v.optional(v.number()) },
  handler: async (ctx, args): Promise<any> => {
    assertSecret(args.secret);
    return await ctx.runQuery(internal.admin.getRecentSessions, { limit: args.limit });
  },
});

export const fetchSessionTimeline = action({
  args: { secret: v.string(), sessionId: v.id("sessions") },
  handler: async (ctx, args): Promise<any> => {
    assertSecret(args.secret);
    return await ctx.runQuery(internal.admin.getSessionTimeline, { sessionId: args.sessionId });
  },
});
