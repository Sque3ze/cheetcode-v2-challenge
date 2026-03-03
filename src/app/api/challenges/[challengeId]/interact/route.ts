import { NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import type { Id } from "../../../../../../convex/_generated/dataModel";
import { api } from "../../../../../../convex/_generated/api";
import {
  resolveGitHub,
  unauthorized,
  badRequest,
  notFound,
  serverError,
  sessionExpired,
  rateLimited,
} from "../../../../../lib/api-helpers";
import { getChallenge, arePrerequisitesMet, getUnmetPrerequisites } from "../../../../../../server/challenges/registry";
import { ChallengeDataGenerator } from "../../../../../lib/seed";
import { MIN_INTERACT_INTERVAL_MS, RENDER_TOKEN_TTL_MS } from "../../../../../lib/config";

/**
 * POST /api/challenges/[challengeId]/interact
 *
 * Phased data delivery endpoint. Returns slices of hiddenData
 * in response to user interactions (tab clicks, modal opens, etc.).
 *
 * Request body: { sessionId, action, params?, renderToken }
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ challengeId: string }> }
) {
  const { challengeId } = await params;

  // 1. Auth
  const github = await resolveGitHub(request);
  if (!github) return unauthorized();

  // 2. Parse body
  let body: {
    sessionId?: string;
    action?: string;
    params?: Record<string, unknown>;
    renderToken?: string;
  };
  try {
    body = await request.json();
  } catch {
    return badRequest("Invalid JSON body");
  }

  const { sessionId, action, renderToken } = body;
  const interactParams = body.params ?? {};

  if (!sessionId || typeof sessionId !== "string") {
    return badRequest("sessionId is required");
  }
  if (!action || typeof action !== "string") {
    return badRequest("action is required");
  }
  if (!renderToken || typeof renderToken !== "string") {
    return badRequest("renderToken is required");
  }

  // 3. Validate challenge exists and supports the action
  const challenge = getChallenge(challengeId);
  if (!challenge) return notFound("Challenge not found");

  if (!challenge.interactActions?.includes(action)) {
    return badRequest(`Challenge does not support action: ${action}`);
  }
  if (!challenge.handleInteract) {
    return badRequest("Challenge does not support interactions");
  }

  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
  const serverSecret = process.env.SERVER_SECRET;
  const mutationSecret = process.env.CONVEX_MUTATION_SECRET;
  if (!convexUrl || !serverSecret || !mutationSecret) {
    return serverError("Server not configured");
  }

  try {
    const convex = new ConvexHttpClient(convexUrl);

    // 4. Validate session ownership + active status
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

    // Track API call (fire-and-forget)
    convex.action(api.sessions.trackApiCall, { secret: mutationSecret, sessionId: session._id }).catch(() => {});

    // 4.5. Prerequisite check
    const allStatuses = await convex.query(
      api.submissions.getSessionChallengeStatuses,
      { sessionId: session._id }
    );
    const solvedSet = new Set<string>();
    for (const [id, status] of Object.entries(allStatuses)) {
      if (status?.solved) solvedSet.add(id);
    }
    if (!arePrerequisitesMet(challengeId, solvedSet)) {
      const unmet = getUnmetPrerequisites(challengeId, solvedSet);
      return NextResponse.json(
        {
          error: "prerequisites_not_met",
          message: `Solve these challenges first: ${unmet.join(", ")}`,
          unmetPrerequisites: unmet,
        },
        { status: 403 }
      );
    }

    // 5. Validate render token
    const view = await convex.query(api.challengeViews.get, {
      sessionId: session._id,
      challengeId,
    });
    if (!view) {
      return badRequest("Challenge must be loaded before interacting");
    }
    if (view.renderToken !== renderToken) {
      return badRequest("Invalid render token");
    }
    // TTL check
    const now = Date.now();
    if (now - view.viewedAt > RENDER_TOKEN_TTL_MS) {
      return badRequest("Render token expired — reload the challenge page");
    }

    // 6. Rate-limit
    if (view.lastInteractAt && now - view.lastInteractAt < MIN_INTERACT_INTERVAL_MS) {
      return rateLimited("Too many interactions — slow down");
    }

    // 7. Regenerate challenge data from seed (deterministic)
    const gen = new ChallengeDataGenerator(sessionId, serverSecret);
    const challengeData = gen.forChallenge(challengeId);
    const generated = challenge.generate(challengeData);

    if (!generated.hiddenData) {
      return badRequest("Challenge has no hidden data");
    }

    // 8. Call handleInteract
    const result = challenge.handleInteract(generated.hiddenData, action, interactParams);

    // 9. Update lastInteractAt
    await convex.action(api.challengeViews.recordInteractAction, {
      secret: mutationSecret,
      sessionId: session._id,
      challengeId,
      interactAt: now,
    });

    // 10. Return result
    return NextResponse.json({ data: result });
  } catch (err) {
    console.error(`/api/challenges/${challengeId}/interact error:`, err);
    return serverError("Interaction failed");
  }
}
