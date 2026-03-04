import { query } from "./_generated/server";
import { v } from "convex/values";

/**
 * Public spectator queries — no auth required.
 * Session IDs are already public via the leaderboard query.
 * These provide real-time subscriptions for live spectator mode.
 */

/**
 * Get a session's public-safe fields for spectator display.
 * Strips userAgent and internal fields.
 */
export const getSessionPublic = query({
  args: { sessionId: v.id("sessions") },
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.sessionId);
    if (!session) return null;

    return {
      _id: session._id,
      github: session.github,
      startedAt: session.startedAt,
      expiresAt: session.expiresAt,
      status: session.status,
      score: session.score ?? null,
      completionScore: session.completionScore ?? null,
      orchestrationScore: session.orchestrationScore ?? null,
      orchestrationMetrics: session.orchestrationMetrics ?? null,
      earnedPoints: session.earnedPoints ?? null,
      totalPoints: session.totalPoints ?? null,
      wrongAttempts: session.wrongAttempts ?? null,
    };
  },
});

/**
 * Get all currently active sessions for the "Live Now" section.
 * Returns github handle, session ID, and start time.
 */
export const getActiveSessions = query({
  args: {},
  handler: async (ctx) => {
    const sessions = await ctx.db
      .query("sessions")
      .withIndex("by_status", (q) => q.eq("status", "active"))
      .take(50);

    return sessions.map((s) => ({
      _id: s._id,
      github: s.github,
      startedAt: s.startedAt,
      expiresAt: s.expiresAt,
    }));
  },
});

const ANSWER_EVENT_TYPES = new Set(["answer_submitted", "answer_correct", "answer_wrong"]);

/**
 * Get sanitized session events for spectator display.
 * Strips metadata from answer_submitted/answer_correct/answer_wrong
 * to prevent leaking submitted answers. Keeps safe metadata only.
 */
export const getSessionEventsPublic = query({
  args: { sessionId: v.id("sessions") },
  handler: async (ctx, args) => {
    const events = await ctx.db
      .query("sessionEvents")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .take(500);

    if (events.length === 0) return null;

    // Compute relative offsets from session start (not absolute timestamps)
    const session = await ctx.db.get(args.sessionId);
    const sessionStart = session?.startedAt ?? 0;

    return events
      .sort((a, b) => a.timestamp - b.timestamp)
      .map((e) => {
        let safeMetadata: Record<string, unknown> | undefined;

        if (ANSWER_EVENT_TYPES.has(e.type)) {
          // No metadata for answer events
          safeMetadata = undefined;
        } else if (e.type === "challenge_viewed" && e.metadata) {
          // Keep only tier info
          const meta = e.metadata as Record<string, unknown>;
          safeMetadata = meta.tier != null ? { tier: meta.tier } : undefined;
        } else if (e.type === "challenge_interacted" && e.metadata) {
          // Keep only action name
          const meta = e.metadata as Record<string, unknown>;
          safeMetadata = meta.action
            ? { action: meta.action }
            : undefined;
        } else {
          safeMetadata = undefined;
        }

        // Return sequencing info only — bucket into 30s windows
        // so spectators see order-of-events without precise timing
        const elapsed = e.timestamp - sessionStart;
        const bucket = Math.floor(elapsed / 30000); // 30-second buckets

        return {
          type: e.type,
          bucket,
          challengeId: e.challengeId ?? null,
          metadata: safeMetadata ?? null,
        };
      });
  },
});
