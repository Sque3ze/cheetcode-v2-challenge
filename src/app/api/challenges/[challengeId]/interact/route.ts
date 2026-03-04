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
  rateLimited,
  extractSolvedSet,
  checkPrerequisites,
  validateSessionOwnership,
} from "../../../../../lib/api-helpers";
import { getChallenge } from "../../../../../../server/challenges/registry";
import { ChallengeDataGenerator } from "../../../../../lib/seed";
import { MIN_INTERACT_INTERVAL_MS, RENDER_TOKEN_TTL_MS, IS_TEST_MODE } from "../../../../../lib/config";


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

  const github = await resolveGitHub(request);
  if (!github) return unauthorized();

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
    const typedSessionId = sessionId as unknown as Id<"sessions">;

    const [{ session, statuses: allStatuses }, view] = await Promise.all([
      convex.action(api.sessions.fetchSessionWithStatuses, {
        secret: mutationSecret,
        sessionId: typedSessionId,
      }),
      convex.action(api.challengeViews.fetchView, {
        secret: mutationSecret, sessionId: typedSessionId, challengeId,
      }),
    ]);

    const sessionErr = validateSessionOwnership(session, github);
    if (sessionErr) return sessionErr;

    // Track API call (fire-and-forget)
    convex.action(api.sessions.trackApiCall, { secret: mutationSecret, sessionId: session._id }).catch(() => {});

    // 4.5. Prerequisite check (skipped in test mode)
    const solvedSet = extractSolvedSet(allStatuses);
    const prereqErr = checkPrerequisites(challengeId, solvedSet);
    if (prereqErr) return prereqErr;

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

    // 6. Rate-limit (skipped in test mode)
    if (!IS_TEST_MODE && view.lastInteractAt && now - view.lastInteractAt < MIN_INTERACT_INTERVAL_MS) {
      return rateLimited("Too many interactions — slow down");
    }

    // 7. Regenerate challenge data from seed (deterministic)
    const gen = new ChallengeDataGenerator(sessionId, serverSecret);
    const challengeData = gen.forChallenge(challengeId);
    const generated = challenge.generate(challengeData);

    if (!generated.hiddenData) {
      return badRequest("Challenge has no hidden data");
    }

    const result = challenge.handleInteract(generated.hiddenData, action, interactParams, {
      viewedAt: view.viewedAt,
    });

    // Detect success/failure from the result
    const isError = result === null || result === undefined ||
      (typeof result === "object" && result !== null && "error" in result);

    // Emit challenge_interacted event with success tracking (fire-and-forget)
    convex.action(api.sessionEvents.emitEvent, {
      secret: mutationSecret,
      sessionId: session._id,
      type: "challenge_interacted" as const,
      challengeId,
      metadata: { action, params: interactParams, success: !isError },
    }).catch(() => {});

    await convex.action(api.challengeViews.recordInteractAction, {
      secret: mutationSecret,
      sessionId: session._id,
      challengeId,
      interactAt: now,
    });

    return NextResponse.json({ data: result });
  } catch (err) {
    console.error(`/api/challenges/${challengeId}/interact error:`, err);
    return serverError("Interaction failed");
  }
}
