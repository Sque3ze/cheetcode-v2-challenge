import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // ─── Sessions ────────────────────────────────────────────
  // One per timed challenge attempt. Server is the time authority.
  sessions: defineTable({
    github: v.string(),
    startedAt: v.number(),
    expiresAt: v.number(),
    status: v.union(
      v.literal("active"),
      v.literal("completed"),
      v.literal("expired")
    ),
    apiCalls: v.optional(v.number()),
    userAgent: v.optional(v.string()),
    isTestSession: v.optional(v.boolean()),
    earnedPoints: v.optional(v.number()),
    totalPoints: v.optional(v.number()),
    wrongAttempts: v.optional(v.number()),
    score: v.optional(v.number()), // composite score (completion × 0.6 + orchestration × 0.4)
    completionScore: v.optional(v.number()), // raw completion percentage (0-100)
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
  })
    .index("by_github", ["github"])
    .index("by_github_status", ["github", "status"])
    .index("by_status", ["status"]),

  // ─── Submissions ─────────────────────────────────────────
  // One per attempt at a challenge (including wrong attempts).
  submissions: defineTable({
    sessionId: v.id("sessions"),
    challengeId: v.string(),
    answer: v.string(),
    correct: v.boolean(),
    attemptNumber: v.number(), // 1, 2, or 3
    submittedAt: v.number(),
  })
    .index("by_session", ["sessionId"])
    .index("by_session_challenge", ["sessionId", "challengeId"]),

  // ─── Leaderboard ─────────────────────────────────────────
  // Best score per user. Updated when a session completes with a better score.
  leaderboard: defineTable({
    github: v.string(),
    score: v.number(), // composite score: completion × 0.6 + orchestration × 0.4
    completionScore: v.optional(v.number()), // raw completion percentage (0-100)
    earnedPoints: v.number(),
    totalPoints: v.number(),
    wrongAttempts: v.number(), // total incorrect submissions (tiebreaker 1)
    lastCorrectAt: v.optional(v.number()), // timestamp of last correct answer (tiebreaker 2)
    apiCalls: v.optional(v.number()), // total API calls made (tiebreaker 3)
    completedAt: v.number(), // when the session ended
    sessionId: v.id("sessions"),
    isTestSession: v.optional(v.boolean()),
    orchestrationScore: v.optional(v.number()), // combined 0-100 score shown on public leaderboard
    orchestrationMetrics: v.optional(
      v.object({
        parallelizationScore: v.number(), // 0-1: degree of concurrent challenge work
        dagEfficiency: v.number(), // 0-1: how close to optimal topological ordering
        criticalPathSpeed: v.number(), // 0-1: ratio of theoretical min vs actual critical path time
        submissionConfidence: v.number(), // 0-1: correct / total submissions
        failureRecoveryScore: v.optional(v.number()), // 0-1: adaptive behavior after wrong answers
        tiersReached: v.number(), // highest tier solved (1-4)
      })
    ),
  })
    .index("by_score", ["score"])
    .index("by_github", ["github"]),

  // ─── Challenge Views ───────────────────────────────────────
  // Tracks when a challenge was loaded (for timing constraints + render tokens).
  challengeViews: defineTable({
    sessionId: v.id("sessions"),
    challengeId: v.string(),
    viewedAt: v.number(),
    renderToken: v.string(),
    lastInteractAt: v.optional(v.number()),
  }).index("by_session_challenge", ["sessionId", "challengeId"]),

  // ─── Session Events ───────────────────────────────────────
  // Timestamped event log for observability and session replay.
  sessionEvents: defineTable({
    sessionId: v.id("sessions"),
    type: v.union(
      v.literal("session_started"),
      v.literal("challenge_viewed"),
      v.literal("challenge_interacted"),
      v.literal("answer_submitted"),
      v.literal("answer_correct"),
      v.literal("answer_wrong"),
      v.literal("challenge_locked"),
      v.literal("session_completed")
    ),
    timestamp: v.number(),
    challengeId: v.optional(v.string()),
    metadata: v.optional(v.any()),
  })
    .index("by_session", ["sessionId"])
    .index("by_session_type", ["sessionId", "type"])
    .index("by_challenge", ["challengeId"])
    .index("by_type_timestamp", ["type", "timestamp"]),
});
