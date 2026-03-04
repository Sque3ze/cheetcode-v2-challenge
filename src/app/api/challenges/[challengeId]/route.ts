import { NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import type { Id } from "../../../../../convex/_generated/dataModel";
import { api } from "../../../../../convex/_generated/api";
import {
  resolveGitHub,
  unauthorized,
  notFound,
  serverError,
  extractSolvedSet,
  checkPrerequisites,
  validateSessionOwnership,
} from "../../../../lib/api-helpers";
import { getChallenge } from "../../../../../server/challenges/registry";
import { ChallengeDataGenerator } from "../../../../lib/seed";
import { TIER_POINTS } from "../../../../lib/config";

import { generateRenderToken } from "../../../../lib/render-token";

/**
 * GET /api/challenges/[challengeId]?sessionId=xxx
 *
 * Get the page data for a challenge (seed-parameterized).
 * Returns only the data needed to render the challenge page.
 * NEVER returns the answer or hiddenData.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ challengeId: string }> }
) {
  const { challengeId } = await params;

  const github = await resolveGitHub(request);
  if (!github) return unauthorized();

  const url = new URL(request.url);
  const sessionId = url.searchParams.get("sessionId");
  if (!sessionId) {
    return NextResponse.json(
      { error: "sessionId query parameter is required" },
      { status: 400 }
    );
  }

  const challenge = getChallenge(challengeId);
  if (!challenge) return notFound("Challenge not found");

  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
  const serverSecret = process.env.SERVER_SECRET;
  const mutationSecret = process.env.CONVEX_MUTATION_SECRET;
  if (!convexUrl || !serverSecret || !mutationSecret) {
    return serverError("Server not configured");
  }

  try {
    const convex = new ConvexHttpClient(convexUrl);
    const typedSessionId = sessionId as unknown as Id<"sessions">;

    const [{ session, statuses }, submissions] = await Promise.all([
      convex.action(api.sessions.fetchSessionWithStatuses, {
        secret: mutationSecret,
        sessionId: typedSessionId,
      }),
      convex.action(api.submissions.fetchBySessionChallenge, {
        secret: mutationSecret, sessionId: typedSessionId, challengeId,
      }),
    ]);

    const sessionErr = validateSessionOwnership(session, github);
    if (sessionErr) return sessionErr;

    // Track API call (fire-and-forget)
    convex.action(api.sessions.trackApiCall, { secret: mutationSecret, sessionId: session._id }).catch(() => {});

    // Prerequisite check (before emitting telemetry so locked views aren't recorded)
    const solvedSet = extractSolvedSet(statuses);
    const prereqErr = checkPrerequisites(challengeId, solvedSet);
    if (prereqErr) return prereqErr;

    // Emit challenge_viewed event (fire-and-forget, after prereq check passes)
    convex.action(api.sessionEvents.emitEvent, {
      secret: mutationSecret,
      sessionId: session._id,
      type: "challenge_viewed" as const,
      challengeId,
      metadata: { tier: challenge.tier },
    }).catch(() => {});

    const gen = new ChallengeDataGenerator(sessionId, serverSecret);
    const challengeData = gen.forChallenge(challengeId);
    const generated = challenge.generate(challengeData);
    const solved = submissions.some((s) => s.correct);
    const attempts = submissions.length;

    // Compute instructions (before stripping variantIndex)
    const instructions =
      typeof challenge.instructions === "function"
        ? challenge.instructions(generated.pageData)
        : challenge.instructions;

    // Strip variantIndex from pageData (used for instruction variants, not needed by client)
    const pageData = { ...(generated.pageData as Record<string, unknown>) };
    delete pageData.variantIndex;

    const viewedAt = Date.now();
    const renderToken = generateRenderToken(sessionId, challengeId, viewedAt, serverSecret);

    await convex.action(api.challengeViews.recordView, {
      secret: mutationSecret,
      sessionId: session._id,
      challengeId,
      viewedAt,
      renderToken,
    });

    // Return page data (NEVER the answer or hiddenData)
    return NextResponse.json({
      id: challenge.id,
      title: challenge.title,
      tier: challenge.tier,
      points: challenge.points ?? TIER_POINTS[challenge.tier],
      description: challenge.description,
      instructions,
      pageData,
      renderToken,
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
