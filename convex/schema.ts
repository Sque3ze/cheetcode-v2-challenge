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
  })
    .index("by_github", ["github"])
    .index("by_github_status", ["github", "status"]),

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
    score: v.number(), // percentage (0-100)
    earnedPoints: v.number(),
    totalPoints: v.number(),
    wrongAttempts: v.number(), // total incorrect submissions (tiebreaker 1)
    lastCorrectAt: v.optional(v.number()), // timestamp of last correct answer (tiebreaker 2)
    completedAt: v.number(), // when the session ended
    sessionId: v.id("sessions"),
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
});
