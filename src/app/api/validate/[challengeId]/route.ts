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
  sessionExpired,
} from "../../../../lib/api-helpers";
import { MAX_ATTEMPTS_PER_CHALLENGE, TIER_POINTS } from "../../../../lib/config";
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

    // 2. Session exists and belongs to this user
    const session = await convex.query(api.sessions.get, {
      sessionId: sessionId as unknown as Id<"sessions">,
    });
    if (!session) return badRequest("Session not found");
    if (session.github !== github) {
      return badRequest("Session does not belong to this user");
    }

    // 3. Session is still active (SERVER-SIDE TIME CHECK)
    if (session.status !== "active" || Date.now() > session.expiresAt) {
      return sessionExpired();
    }

    // 5 & 6. Check existing submissions for this challenge
    const existingSubmissions = await convex.query(
      api.submissions.getBySessionChallenge,
      {
        sessionId: session._id,
        challengeId,
      }
    );

    const alreadySolved = existingSubmissions.some((s) => s.correct);
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

    if (isCorrect) {
      const points = TIER_POINTS[challenge.tier];
      return NextResponse.json({
        correct: true,
        points,
        message: "Correct!",
      });
    }

    const attemptsRemaining = MAX_ATTEMPTS_PER_CHALLENGE - newAttemptNumber;
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
