/**
 * CheetCode v2 — Shared API route helpers.
 *
 * Common patterns for auth resolution, Convex client creation,
 * and error responses used across all API routes.
 */

import { NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { resolveGitHubFromHeader } from "./github-auth";
import { auth } from "../../auth";
import { IS_TEST_MODE } from "./config";
import { arePrerequisitesMet, getUnmetPrerequisites } from "../../server/challenges/registry";

/**
 * Resolve the GitHub username from the request.
 * Tries PAT header first (for API agents), then OAuth session (for browser users).
 * In dev mode (DEV_USER env var set), bypasses auth entirely.
 */
export async function resolveGitHub(
  request: Request
): Promise<string | null> {
  // Dev mode bypass — no auth required (disabled in production)
  if (process.env.DEV_USER && process.env.NODE_ENV !== "production") {
    return process.env.DEV_USER;
  }

  const fromHeader = await resolveGitHubFromHeader(request);
  if (fromHeader) return fromHeader;

  const session = await auth();
  return (
    (session?.user as { githubUsername?: string })?.githubUsername ?? null
  );
}

/**
 * Create a Convex HTTP client. Returns null + error response if not configured.
 */
export function getConvexClient(): ConvexHttpClient | null {
  const url = process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!url) return null;
  return new ConvexHttpClient(url);
}

/**
 * Standard error responses.
 */
export function unauthorized(hint?: string) {
  return NextResponse.json(
    {
      error: "GitHub authentication required",
      hint:
        hint ??
        "Send a GitHub PAT via Authorization: Bearer <token>, or sign in with OAuth",
    },
    { status: 401 }
  );
}

export function badRequest(message: string) {
  return NextResponse.json({ error: message }, { status: 400 });
}

export function notFound(message: string) {
  return NextResponse.json({ error: message }, { status: 404 });
}

export function serverError(message: string) {
  return NextResponse.json({ error: message }, { status: 500 });
}

export function rateLimited(message?: string) {
  return NextResponse.json(
    { error: message ?? "rate limited — try again shortly" },
    { status: 429 }
  );
}

export function forbidden(message: string) {
  return NextResponse.json({ error: message }, { status: 403 });
}

export function sessionExpired() {
  return NextResponse.json({ error: "session_expired" }, { status: 410 });
}

/**
 * Extract the set of solved challenge IDs from a ChallengeStatusMap.
 */
export function extractSolvedSet(
  statuses: Record<string, { solved?: boolean } | undefined>
): Set<string> {
  const solvedSet = new Set<string>();
  for (const [id, status] of Object.entries(statuses)) {
    if (status?.solved) solvedSet.add(id);
  }
  return solvedSet;
}

/**
 * Check prerequisites for a challenge. Returns a 403 response if unmet, null if OK.
 * Skipped in test mode (IS_TEST_MODE).
 */
export function checkPrerequisites(
  challengeId: string,
  solvedSet: Set<string>,
): NextResponse | null {
  if (IS_TEST_MODE || arePrerequisitesMet(challengeId, solvedSet)) return null;
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

/**
 * Validate that a session exists, belongs to the user, and is still active.
 * Returns a NextResponse error if invalid, null if OK.
 */
export function validateSessionOwnership(
  session: { github: string; status: string; expiresAt: number } | null,
  github: string
): NextResponse | null {
  if (!session) return notFound("Session not found");
  if (session.github !== github) return forbidden("Session does not belong to this user");
  if (session.status !== "active" || Date.now() > session.expiresAt) return sessionExpired();
  return null;
}

/**
 * Verify admin auth: resolves GitHub identity, checks ADMIN_GITHUB and ADMIN_KEY.
 * Returns the github username on success, or a NextResponse error on failure.
 */
export async function verifyAdminAuth(
  request: Request
): Promise<{ github: string } | NextResponse> {
  const github = await resolveGitHub(request);
  if (!github) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }
  const adminGithub = process.env.ADMIN_GITHUB;
  if (!adminGithub || github !== adminGithub) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }
  const adminKey = process.env.ADMIN_KEY;
  const key = request.headers.get("x-admin-key");
  if (!adminKey || key !== adminKey) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }
  return { github };
}
