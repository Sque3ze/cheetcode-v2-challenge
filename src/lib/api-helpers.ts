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

  // Try PAT first (API agents)
  const fromHeader = await resolveGitHubFromHeader(request);
  if (fromHeader) return fromHeader;

  // Fall back to OAuth session (browser users)
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

export function sessionExpired() {
  return NextResponse.json({ error: "session_expired" }, { status: 410 });
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
