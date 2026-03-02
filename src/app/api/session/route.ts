import { NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../../convex/_generated/api";
import {
  resolveGitHub,
  unauthorized,
  serverError,
  rateLimited,
} from "../../../lib/api-helpers";
import { SESSION_DURATION_MS } from "../../../lib/config";
import { getAllChallengeMetas } from "../../../../server/challenges/registry";

/**
 * POST /api/session
 * Create a new timed session.
 * Auth: GitHub PAT or OAuth session.
 */
export async function POST(request: Request) {
  const github = await resolveGitHub(request);
  if (!github) return unauthorized();

  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
  const secret = process.env.CONVEX_MUTATION_SECRET;
  if (!convexUrl || !secret) {
    return serverError("Server not configured");
  }

  try {
    const convex = new ConvexHttpClient(convexUrl);
    const result = await convex.action(api.sessions.createSession, {
      secret,
      github,
      durationMs: SESSION_DURATION_MS,
    });

    return NextResponse.json({
      sessionId: result.sessionId,
      startedAt: result.startedAt,
      expiresAt: result.expiresAt,
      challenges: getAllChallengeMetas(),
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to create session";
    if (message.includes("rate limited")) return rateLimited(message);
    if (message.includes("active session already exists")) {
      return NextResponse.json(
        { error: "You already have an active session" },
        { status: 409 }
      );
    }
    console.error("/api/session POST error:", err);
    return serverError(message);
  }
}

/**
 * GET /api/session
 * Get current session status including challenge progress.
 * Auth: GitHub PAT or OAuth session.
 */
export async function GET(request: Request) {
  const github = await resolveGitHub(request);
  if (!github) return unauthorized();

  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!convexUrl) return serverError("Server not configured");

  try {
    const convex = new ConvexHttpClient(convexUrl);

    // Get active session
    const session = await convex.query(api.sessions.getActive, { github });
    if (!session) {
      return NextResponse.json({ session: null });
    }

    // Get challenge statuses
    const statuses = await convex.query(
      api.submissions.getSessionChallengeStatuses,
      { sessionId: session._id }
    );

    const challenges = getAllChallengeMetas();
    const maxAttempts = 3;

    // Build challenge status list
    const challengeStatuses = challenges.map((c) => {
      const status = statuses[c.id];
      return {
        challengeId: c.id,
        solved: status?.solved ?? false,
        locked: (status?.attempts ?? 0) >= maxAttempts && !status?.solved,
        attempts: status?.attempts ?? 0,
      };
    });

    // Compute current score
    const earned = challenges.reduce((sum, c) => {
      const status = statuses[c.id];
      return sum + (status?.solved ? c.points : 0);
    }, 0);
    const total = challenges.reduce((sum, c) => sum + c.points, 0);

    const now = Date.now();
    const timeRemainingMs = Math.max(0, session.expiresAt - now);

    return NextResponse.json({
      session: {
        sessionId: session._id,
        status: timeRemainingMs > 0 ? "active" : "expired",
        startedAt: session.startedAt,
        expiresAt: session.expiresAt,
        timeRemainingMs,
        challenges,
        challengeStatuses,
        score: {
          earned,
          total,
          percentage:
            total > 0 ? Math.round((earned / total) * 10000) / 100 : 0,
        },
      },
    });
  } catch (err) {
    console.error("/api/session GET error:", err);
    return serverError("Failed to get session");
  }
}
