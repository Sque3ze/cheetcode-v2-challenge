import { NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import type { Id } from "../../../../../convex/_generated/dataModel";
import { api } from "../../../../../convex/_generated/api";
import {
  resolveGitHub,
  unauthorized,
  badRequest,
  notFound,
  serverError,
  extractSolvedSet,
  checkPrerequisites,
  validateSessionOwnership,
} from "../../../../lib/api-helpers";
import { MAX_ATTEMPTS_PER_CHALLENGE, TIER_POINTS, MIN_SOLVE_TIME_MS, IS_TEST_MODE } from "../../../../lib/config";

import type { Tier } from "../../../../lib/config";
import {
  getChallenge,
  validateAnswer,
} from "../../../../../server/challenges/registry";
import { ChallengeDataGenerator } from "../../../../lib/seed";

/**
 * POST /api/validate/[challengeId]
 *
 * Submit an answer for a challenge.
 * Server-side validation ONLY — checks answer against seed-computed correct answer.
 *
 * Request body: { sessionId: string, answer: string }
 *
 * Validation checks (in order):
 * 1. User is authenticated
 * 2. Session exists and belongs to this user
 * 3. Session is still active (server-side time check)
 * 4. Challenge exists
 * 5. Challenge is not already solved
 * 6. Challenge is not locked (< MAX_ATTEMPTS)
 * 7. Answer is correct
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ challengeId: string }> }
) {
  const { challengeId } = await params;

  // 1. Auth
  const github = await resolveGitHub(request);
  if (!github) return unauthorized();

  // Parse body
  let body: { sessionId?: string; answer?: string };
  try {
    body = await request.json();
  } catch {
    return badRequest("Invalid JSON body");
  }

  const { sessionId, answer } = body;
  if (!sessionId || typeof sessionId !== "string") {
    return badRequest("sessionId is required");
  }
  if (!answer || typeof answer !== "string") {
    return badRequest("answer is required");
  }
  if (answer.length > 10000) {
    return badRequest("answer too long");
  }

  // 4. Challenge exists
  const challenge = getChallenge(challengeId);
  if (!challenge) return notFound("Challenge not found");

  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
  const secret = process.env.CONVEX_MUTATION_SECRET;
  const serverSecret = process.env.SERVER_SECRET;

  if (!convexUrl || !secret || !serverSecret) {
    return serverError("Server not configured");
  }

  try {
    const convex = new ConvexHttpClient(convexUrl);
    const typedSessionId = sessionId as unknown as Id<"sessions">;

    // 2. Fetch session+statuses, submissions, and view in parallel
    const [{ session, statuses: allStatuses }, existingSubmissions, view] = await Promise.all([
      convex.action(api.sessions.fetchSessionWithStatuses, {
        secret,
        sessionId: typedSessionId,
      }),
      convex.action(api.submissions.fetchBySessionChallenge, {
        secret, sessionId: typedSessionId, challengeId,
      }),
      convex.action(api.challengeViews.fetchView, {
        secret, sessionId: typedSessionId, challengeId,
      }),
    ]);

    // Session exists, belongs to this user, and is active
    const sessionErr = validateSessionOwnership(session, github);
    if (sessionErr) return sessionErr;

    // Track API call (fire-and-forget)
    convex.action(api.sessions.trackApiCall, { secret, sessionId: session._id }).catch(() => {});

    // Helper to emit events without blocking
    const emitEvent = (type: string, metadata?: Record<string, unknown>) =>
      convex.action(api.sessionEvents.emitEvent, {
        secret,
        sessionId: session._id,
        type: type as "answer_submitted",
        challengeId,
        metadata,
      }).catch(() => {});

    // 3.5. Prerequisite check (skipped in test mode)
    const solvedSet = extractSolvedSet(allStatuses);
    const prereqErr = checkPrerequisites(challengeId, solvedSet);
    if (prereqErr) return prereqErr;

    // 5 & 6. Check existing submissions for this challenge
    const alreadySolved = existingSubmissions.some((s: any) => s.correct);
    if (alreadySolved) {
      return NextResponse.json(
        { error: "Challenge already solved" },
        { status: 409 }
      );
    }

    const attemptCount = existingSubmissions.length;
    if (attemptCount >= MAX_ATTEMPTS_PER_CHALLENGE) {
      return NextResponse.json(
        {
          correct: false,
          locked: true,
          attemptsRemaining: 0,
          message: "Challenge locked. No attempts remaining.",
        },
        { status: 200 }
      );
    }

    // 6.5. Timing constraint — must have viewed the challenge and spent minimum time
    if (!view) {
      return badRequest("Challenge must be loaded before submitting an answer");
    }
    const elapsed = Date.now() - view.viewedAt;
    const minTime = MIN_SOLVE_TIME_MS[challenge.tier as Tier];
    if (!IS_TEST_MODE && elapsed < minTime) {
      return NextResponse.json(
        {
          error: "too_fast",
          message: `Submission too fast. Please spend more time on the challenge.`,
          retryAfterMs: minTime - elapsed,
        },
        { status: 429 }
      );
    }

    // 7. Validate answer against seed-computed correct answer
    const gen = new ChallengeDataGenerator(sessionId, serverSecret);
    const challengeData = gen.forChallenge(challengeId);
    const generated = challenge.generate(challengeData);
    const isCorrect = validateAnswer(challengeId, answer, generated.answer);

    const newAttemptNumber = attemptCount + 1;

    // Record the submission
    await convex.action(api.submissions.recordSubmission, {
      secret,
      sessionId: session._id,
      challengeId,
      answer: answer.slice(0, 1000), // Truncate for storage
      correct: isCorrect,
      attemptNumber: newAttemptNumber,
    });

    // Emit telemetry events (fire-and-forget)
    const solveTimeMs = Date.now() - view.viewedAt;
    emitEvent("answer_submitted", { attemptNumber: newAttemptNumber, correct: isCorrect });

    if (isCorrect) {
      const points = challenge.points ?? TIER_POINTS[challenge.tier];
      emitEvent("answer_correct", { attemptNumber: newAttemptNumber, points, solveTimeMs });
      return NextResponse.json({
        correct: true,
        points,
        message: "Correct!",
      });
    }

    const attemptsRemaining = MAX_ATTEMPTS_PER_CHALLENGE - newAttemptNumber;
    if (attemptsRemaining === 0) {
      emitEvent("challenge_locked", { totalAttempts: newAttemptNumber });
    } else {
      emitEvent("answer_wrong", { attemptNumber: newAttemptNumber, attemptsRemaining });
    }
    return NextResponse.json({
      correct: false,
      attemptsRemaining,
      locked: attemptsRemaining === 0,
      message:
        attemptsRemaining > 0
          ? `Incorrect. ${attemptsRemaining} attempt${attemptsRemaining === 1 ? "" : "s"} remaining.`
          : "Incorrect. Challenge locked. No attempts remaining.",
    });
  } catch (err) {
    console.error(`/api/validate/${challengeId} error:`, err);
    return serverError("Validation failed");
  }
}
