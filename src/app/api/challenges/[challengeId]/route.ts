import { NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import type { Id } from "../../../../../convex/_generated/dataModel";
import { api } from "../../../../../convex/_generated/api";
import {
  resolveGitHub,
  unauthorized,
  notFound,
  serverError,
  sessionExpired,
} from "../../../../lib/api-helpers";
import { getChallenge } from "../../../../../server/challenges/registry";
import { ChallengeDataGenerator } from "../../../../lib/seed";
import { TIER_POINTS } from "../../../../lib/config";

/**
 * GET /api/challenges/[challengeId]?sessionId=xxx
 *
 * Get the page data for a challenge (seed-parameterized).
 * Returns only the data needed to render the challenge page.
 * NEVER returns the answer.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ challengeId: string }> }
) {
  const { challengeId } = await params;

  // Auth
  const github = await resolveGitHub(request);
  if (!github) return unauthorized();

  // Get sessionId from query params
  const url = new URL(request.url);
  const sessionId = url.searchParams.get("sessionId");
  if (!sessionId) {
    return NextResponse.json(
      { error: "sessionId query parameter is required" },
      { status: 400 }
    );
  }

  // Check challenge exists
  const challenge = getChallenge(challengeId);
  if (!challenge) return notFound("Challenge not found");

  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
  const serverSecret = process.env.SERVER_SECRET;
  if (!convexUrl || !serverSecret) {
    return serverError("Server not configured");
  }

  try {
    const convex = new ConvexHttpClient(convexUrl);

    // Verify session belongs to user and is active
    const session = await convex.query(api.sessions.get, {
      sessionId: sessionId as unknown as Id<"sessions">,
    });
    if (!session) return notFound("Session not found");
    if (session.github !== github) {
      return NextResponse.json(
        { error: "Session does not belong to this user" },
        { status: 403 }
      );
    }
    if (session.status !== "active" || Date.now() > session.expiresAt) {
      return sessionExpired();
    }

    // Generate challenge data from seed
    const gen = new ChallengeDataGenerator(sessionId, serverSecret);
    const challengeData = gen.forChallenge(challengeId);
    const generated = challenge.generate(challengeData);

    // Get submission status for this challenge
    const submissions = await convex.query(
      api.submissions.getBySessionChallenge,
      { sessionId: session._id, challengeId }
    );
    const solved = submissions.some((s) => s.correct);
    const attempts = submissions.length;

    // Compute instructions
    const instructions =
      typeof challenge.instructions === "function"
        ? challenge.instructions(generated.pageData)
        : challenge.instructions;

    // Return page data (NEVER the answer)
    return NextResponse.json({
      id: challenge.id,
      title: challenge.title,
      tier: challenge.tier,
      points: TIER_POINTS[challenge.tier],
      description: challenge.description,
      instructions,
      pageData: generated.pageData,
      status: {
        solved,
        locked: attempts >= 3 && !solved,
        attempts,
      },
    });
  } catch (err) {
    console.error(`/api/challenges/${challengeId} error:`, err);
    return serverError("Failed to load challenge");
  }
}
