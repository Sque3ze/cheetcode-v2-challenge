import { internalQuery, internalMutation, action } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import { assertSecret } from "./authHelpers";

// ─── Demo simulation event timeline ─────────────────────────
// ~55 events over 185 seconds following the DAG dependency order.
// Simulates a moderately skilled agent: 15/20 solved, 4 wrong answers, 1 lockout.

interface DemoEvent {
  delayMs: number;
  type:
    | "challenge_viewed"
    | "challenge_interacted"
    | "answer_submitted"
    | "answer_correct"
    | "answer_wrong"
    | "challenge_locked";
  challengeId: string;
  metadata?: Record<string, unknown>;
}

const DEMO_EVENT_TIMELINE: DemoEvent[] = [
  // ── Wave 0: Tier 1 (0-42s) — agent opens 3 in parallel, then remaining 3 ──
  { delayMs: 2_000, type: "challenge_viewed", challengeId: "tier1-table-sort", metadata: { tier: 1 } },
  { delayMs: 3_000, type: "challenge_viewed", challengeId: "tier1-form-fill", metadata: { tier: 1 } },
  { delayMs: 4_000, type: "challenge_viewed", challengeId: "tier1-dropdown-select", metadata: { tier: 1 } },

  { delayMs: 8_000, type: "challenge_interacted", challengeId: "tier1-table-sort", metadata: { action: "sort" } },
  { delayMs: 12_000, type: "answer_submitted", challengeId: "tier1-table-sort" },
  { delayMs: 12_100, type: "answer_correct", challengeId: "tier1-table-sort" },

  { delayMs: 14_000, type: "challenge_interacted", challengeId: "tier1-form-fill", metadata: { action: "fill" } },
  { delayMs: 18_000, type: "answer_submitted", challengeId: "tier1-form-fill" },
  { delayMs: 18_100, type: "answer_correct", challengeId: "tier1-form-fill" },

  { delayMs: 16_000, type: "challenge_interacted", challengeId: "tier1-dropdown-select", metadata: { action: "select" } },
  { delayMs: 21_000, type: "answer_submitted", challengeId: "tier1-dropdown-select" },
  { delayMs: 21_100, type: "answer_correct", challengeId: "tier1-dropdown-select" },

  { delayMs: 22_000, type: "challenge_viewed", challengeId: "tier1-tab-navigation", metadata: { tier: 1 } },
  { delayMs: 23_000, type: "challenge_viewed", challengeId: "tier1-filter-search", metadata: { tier: 1 } },
  { delayMs: 24_000, type: "challenge_viewed", challengeId: "tier1-modal-interaction", metadata: { tier: 1 } },

  { delayMs: 28_000, type: "challenge_interacted", challengeId: "tier1-tab-navigation", metadata: { action: "tab" } },
  { delayMs: 32_000, type: "answer_submitted", challengeId: "tier1-tab-navigation" },
  { delayMs: 32_100, type: "answer_correct", challengeId: "tier1-tab-navigation" },

  // filter-search: wrong answer, then correct
  { delayMs: 30_000, type: "challenge_interacted", challengeId: "tier1-filter-search", metadata: { action: "filter" } },
  { delayMs: 35_000, type: "answer_submitted", challengeId: "tier1-filter-search" },
  { delayMs: 35_100, type: "answer_wrong", challengeId: "tier1-filter-search" },
  { delayMs: 40_000, type: "answer_submitted", challengeId: "tier1-filter-search" },
  { delayMs: 40_100, type: "answer_correct", challengeId: "tier1-filter-search" },

  { delayMs: 36_000, type: "challenge_interacted", challengeId: "tier1-modal-interaction", metadata: { action: "modal" } },
  { delayMs: 42_000, type: "answer_submitted", challengeId: "tier1-modal-interaction" },
  { delayMs: 42_100, type: "answer_correct", challengeId: "tier1-modal-interaction" },

  // ── Wave 1: Tier 2 (45-80s) — prerequisites met ──
  { delayMs: 45_000, type: "challenge_viewed", challengeId: "tier2-multi-step-wizard", metadata: { tier: 2 } },
  { delayMs: 46_000, type: "challenge_viewed", challengeId: "tier2-linked-data-lookup", metadata: { tier: 2 } },
  { delayMs: 47_000, type: "challenge_viewed", challengeId: "tier2-sequential-calculator", metadata: { tier: 2 } },
  { delayMs: 48_000, type: "challenge_viewed", challengeId: "tier2-resilient-collector", metadata: { tier: 2 } },
  { delayMs: 49_000, type: "challenge_viewed", challengeId: "tier2-config-debugger", metadata: { tier: 2 } },

  { delayMs: 52_000, type: "challenge_interacted", challengeId: "tier2-multi-step-wizard", metadata: { action: "step" } },
  { delayMs: 60_000, type: "answer_submitted", challengeId: "tier2-multi-step-wizard" },
  { delayMs: 60_100, type: "answer_correct", challengeId: "tier2-multi-step-wizard" },

  { delayMs: 55_000, type: "challenge_interacted", challengeId: "tier2-linked-data-lookup", metadata: { action: "lookup" } },
  { delayMs: 65_000, type: "answer_submitted", challengeId: "tier2-linked-data-lookup" },
  { delayMs: 65_100, type: "answer_correct", challengeId: "tier2-linked-data-lookup" },

  // sequential-calculator: wrong then correct
  { delayMs: 58_000, type: "challenge_interacted", challengeId: "tier2-sequential-calculator", metadata: { action: "calculate" } },
  { delayMs: 68_000, type: "answer_submitted", challengeId: "tier2-sequential-calculator" },
  { delayMs: 68_100, type: "answer_wrong", challengeId: "tier2-sequential-calculator" },
  { delayMs: 75_000, type: "answer_submitted", challengeId: "tier2-sequential-calculator" },
  { delayMs: 75_100, type: "answer_correct", challengeId: "tier2-sequential-calculator" },

  { delayMs: 62_000, type: "challenge_interacted", challengeId: "tier2-resilient-collector", metadata: { action: "collect" } },
  { delayMs: 78_000, type: "answer_submitted", challengeId: "tier2-resilient-collector" },
  { delayMs: 78_100, type: "answer_correct", challengeId: "tier2-resilient-collector" },

  // config-debugger: 2 wrong answers → locked
  { delayMs: 64_000, type: "challenge_interacted", challengeId: "tier2-config-debugger", metadata: { action: "debug" } },
  { delayMs: 72_000, type: "answer_submitted", challengeId: "tier2-config-debugger" },
  { delayMs: 72_100, type: "answer_wrong", challengeId: "tier2-config-debugger" },
  { delayMs: 80_000, type: "answer_submitted", challengeId: "tier2-config-debugger" },
  { delayMs: 80_100, type: "answer_wrong", challengeId: "tier2-config-debugger" },
  { delayMs: 80_200, type: "challenge_locked", challengeId: "tier2-config-debugger" },

  // ── Wave 2: Tier 3 (100-148s) ──
  { delayMs: 100_000, type: "challenge_viewed", challengeId: "tier3-data-dashboard", metadata: { tier: 3 } },
  { delayMs: 101_000, type: "challenge_viewed", challengeId: "tier3-constraint-solver", metadata: { tier: 3 } },
  { delayMs: 102_000, type: "challenge_viewed", challengeId: "tier3-fan-out-aggregator", metadata: { tier: 3 } },
  { delayMs: 103_000, type: "challenge_viewed", challengeId: "tier3-price-negotiator", metadata: { tier: 3 } },
  { delayMs: 104_000, type: "challenge_viewed", challengeId: "tier3-trace-analyzer", metadata: { tier: 3 } },

  { delayMs: 110_000, type: "challenge_interacted", challengeId: "tier3-data-dashboard", metadata: { action: "tab" } },
  { delayMs: 120_000, type: "answer_submitted", challengeId: "tier3-data-dashboard" },
  { delayMs: 120_100, type: "answer_correct", challengeId: "tier3-data-dashboard" },

  { delayMs: 115_000, type: "challenge_interacted", challengeId: "tier3-constraint-solver", metadata: { action: "solve" } },
  { delayMs: 130_000, type: "answer_submitted", challengeId: "tier3-constraint-solver" },
  { delayMs: 130_100, type: "answer_correct", challengeId: "tier3-constraint-solver" },

  { delayMs: 118_000, type: "challenge_interacted", challengeId: "tier3-fan-out-aggregator", metadata: { action: "aggregate" } },
  { delayMs: 135_000, type: "answer_submitted", challengeId: "tier3-fan-out-aggregator" },
  { delayMs: 135_100, type: "answer_correct", challengeId: "tier3-fan-out-aggregator" },

  // price-negotiator: wrong, no retry (time pressure)
  { delayMs: 125_000, type: "challenge_interacted", challengeId: "tier3-price-negotiator", metadata: { action: "negotiate" } },
  { delayMs: 140_000, type: "answer_submitted", challengeId: "tier3-price-negotiator" },
  { delayMs: 140_100, type: "answer_wrong", challengeId: "tier3-price-negotiator" },

  { delayMs: 132_000, type: "challenge_interacted", challengeId: "tier3-trace-analyzer", metadata: { action: "trace" } },
  { delayMs: 148_000, type: "answer_submitted", challengeId: "tier3-trace-analyzer" },
  { delayMs: 148_100, type: "answer_correct", challengeId: "tier3-trace-analyzer" },

  // ── Wave 3: Tier 4 (160-180s) — only red-herring (calculation-audit blocked) ──
  { delayMs: 160_000, type: "challenge_viewed", challengeId: "tier4-red-herring", metadata: { tier: 4 } },
  { delayMs: 168_000, type: "challenge_interacted", challengeId: "tier4-red-herring", metadata: { action: "analyze" } },
  { delayMs: 180_000, type: "answer_submitted", challengeId: "tier4-red-herring" },
  { delayMs: 180_100, type: "answer_correct", challengeId: "tier4-red-herring" },
];

/**
 * Overview stats for the admin dashboard.
 */
export const getOverviewStats = internalQuery({
  args: {},
  handler: async (ctx) => {
    const sessions = await ctx.db.query("sessions").collect();

    const totalSessions = sessions.length;
    const completedSessions = sessions.filter(
      (s) => s.status === "completed"
    ).length;

    // Average score across all completed sessions (not just leaderboard)
    const completedWithScores = sessions.filter(
      (s) => s.status === "completed" && s.score != null
    );
    const avgScore =
      completedWithScores.length > 0
        ? completedWithScores.reduce((sum, s) => sum + (s.score ?? 0), 0) /
          completedWithScores.length
        : 0;

    const uniqueGithubs = new Set(sessions.map((s) => s.github));

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
      uniquePlayers: uniqueGithubs.size,
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

    const viewTimes = new Map<string, number>();
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

        const viewedAt = viewTimes.get(key);
        if (viewedAt) {
          stats.solveTimes.push(sub.submittedAt - viewedAt);
        }
      } else {
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

export const forceExpireSession = action({
  args: { secret: v.string(), sessionId: v.id("sessions") },
  handler: async (ctx, args): Promise<any> => {
    assertSecret(args.secret);
    await ctx.runMutation(internal.sessions.expire, { sessionId: args.sessionId });
    return { ok: true };
  },
});

export const fetchAllAdmin = action({
  args: { secret: v.string() },
  handler: async (ctx, args): Promise<any> => {
    assertSecret(args.secret);
    return await ctx.runQuery(internal.leaderboard.getAllAdmin, {});
  },
});

export const updateVisibility = action({
  args: { secret: v.string(), entryId: v.id("leaderboard"), visible: v.boolean() },
  handler: async (ctx, args): Promise<any> => {
    assertSecret(args.secret);
    await ctx.runMutation(internal.leaderboard.setPublicVisibility, {
      entryId: args.entryId,
      visible: args.visible,
    });
    return { ok: true };
  },
});

// ─── Demo simulation ────────────────────────────────────────

const DEMO_DURATION_MS = 210_000; // 3.5 minutes

export const startDemoSession = internalMutation({
  args: {},
  handler: async (ctx) => {
    // Prevent stacking demo sessions
    const existing = await ctx.db
      .query("sessions")
      .withIndex("by_github_status", (q) =>
        q.eq("github", "demo-agent").eq("status", "active")
      )
      .first();
    if (existing) {
      throw new Error("A demo session is already running");
    }

    const now = Date.now();

    const sessionId = await ctx.db.insert("sessions", {
      github: "demo-agent",
      startedAt: now,
      expiresAt: now + DEMO_DURATION_MS,
      status: "active",
      userAgent: "CheetCode Demo Simulation",
      isTestSession: true,
    });

    // Emit session_started immediately
    await ctx.db.insert("sessionEvents", {
      sessionId,
      type: "session_started",
      timestamp: now,
    });

    // Schedule all demo events
    for (const event of DEMO_EVENT_TIMELINE) {
      await ctx.scheduler.runAfter(event.delayMs, internal.sessionEvents.emit, {
        sessionId,
        type: event.type,
        challengeId: event.challengeId,
        metadata: event.metadata,
      });
    }

    // Schedule session completion at 185s
    await ctx.scheduler.runAfter(185_000, internal.admin.completeDemoSession, {
      sessionId,
    });

    // Auto-expire fallback at 210s
    await ctx.scheduler.runAfter(DEMO_DURATION_MS, internal.sessions.expire, {
      sessionId,
    });

    return { sessionId };
  },
});

export const completeDemoSession = internalMutation({
  args: { sessionId: v.id("sessions") },
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.sessionId);
    if (!session || session.status !== "active") return;

    await ctx.db.insert("sessionEvents", {
      sessionId: args.sessionId,
      type: "session_completed",
      timestamp: Date.now(),
    });

    await ctx.db.patch(args.sessionId, {
      status: "completed",
      earnedPoints: 34,
      totalPoints: 50,
      wrongAttempts: 4,
      score: 55.2,
      completionScore: 68.0,
      orchestrationScore: 35.8,
      orchestrationMetrics: {
        parallelizationScore: 0.72,
        dagEfficiency: 0.65,
        criticalPathSpeed: 0.58,
        submissionConfidence: 0.88,
        failureRecoveryScore: 0.45,
        tiersReached: 3,
      },
    });
  },
});

export const launchDemo = action({
  args: { secret: v.string() },
  handler: async (ctx, args): Promise<any> => {
    assertSecret(args.secret);
    return await ctx.runMutation(internal.admin.startDemoSession, {});
  },
});
