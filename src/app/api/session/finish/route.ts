import { NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import type { Id } from "../../../../../convex/_generated/dataModel";
import { api } from "../../../../../convex/_generated/api";
import {
  resolveGitHub,
  unauthorized,
  badRequest,
  serverError,
} from "../../../../lib/api-helpers";
import { getTotalPoints, getAllChallengeMetas } from "../../../../../server/challenges/registry";
import { TIER_POINTS } from "../../../../lib/config";

/**
 * POST /api/session/finish
 *
 * Finish the current session and compute the final score.
 * Can be called explicitly by the user or triggered when time expires.
 *
 * Request body: { sessionId: string }
 */
export async function POST(request: Request) {
  const github = await resolveGitHub(request);
  if (!github) return unauthorized();

  let body: { sessionId?: string };
  try {
    body = await request.json();
  } catch {
    return badRequest("Invalid JSON body");
  }

  const { sessionId } = body;
  if (!sessionId || typeof sessionId !== "string") {
    return badRequest("sessionId is required");
  }

  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
  const secret = process.env.CONVEX_MUTATION_SECRET;
  if (!convexUrl || !secret) {
    return serverError("Server not configured");
  }

  try {
    const convex = new ConvexHttpClient(convexUrl);

    // Verify session
    const session = await convex.query(api.sessions.get, {
      sessionId: sessionId as unknown as Id<"sessions">,
    });
    if (!session) return badRequest("Session not found");
    if (session.github !== github) {
      return badRequest("Session does not belong to this user");
    }
    if (session.status === "completed") {
      return NextResponse.json(
        { error: "Session already completed" },
        { status: 409 }
      );
    }

    // Get session stats
    const stats = await convex.query(api.submissions.getSessionStats, {
      sessionId: session._id,
    });

    // Compute earned points
    const challenges = getAllChallengeMetas();
    const solvedSet = new Set(stats.solvedChallenges);
    const earnedPoints = challenges.reduce(
      (sum, c) => sum + (solvedSet.has(c.id) ? TIER_POINTS[c.tier] : 0),
      0
    );
    const totalPoints = getTotalPoints();

    // Complete the session
    const result = await convex.action(api.sessions.completeSession, {
      secret,
      sessionId: session._id,
      github,
      earnedPoints,
      totalPoints,
      wrongAttempts: stats.wrongAttempts,
      lastCorrectAt: stats.lastCorrectAt,
    });

    return NextResponse.json({
      score: result.score,
      earnedPoints: result.earnedPoints,
      totalPoints: result.totalPoints,
      solvedChallenges: stats.solvedChallenges,
      wrongAttempts: stats.wrongAttempts,
    });
  } catch (err) {
    console.error("/api/session/finish error:", err);
    return serverError("Failed to finish session");
  }
}
