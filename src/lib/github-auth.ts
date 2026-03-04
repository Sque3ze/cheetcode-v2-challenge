/**
 * Verify a GitHub identity from an Authorization header.
 * Supports both PAT (ghp_...) and OAuth session fallback.
 *
 * For API-based agents: send `Authorization: Bearer <PAT>`
 * For browser agents: OAuth session is used automatically
 */

import { timingSafeEqual } from "crypto";

// Brief cache to avoid hammering GitHub API on rapid successive calls
const tokenCache = new Map<string, { username: string; expiresAt: number }>();
const CACHE_TTL_MS = 60_000; // 1 minute

/** Verify a GitHub PAT and return the associated username, or null if invalid */
export async function verifyGitHubToken(token: string): Promise<string | null> {
  const cached = tokenCache.get(token);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.username;
  }

  try {
    const res = await fetch("https://api.github.com/user", {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
      },
    });
    if (!res.ok) return null;

    const data = await res.json();
    const username = data.login as string | undefined;
    if (!username) return null;

    tokenCache.set(token, { username, expiresAt: Date.now() + CACHE_TTL_MS });
    return username;
  } catch {
    return null;
  }
}

/** Validate a "test:<secret>" token against TEST_AUTH_SECRET (constant-time). */
function validateTestToken(token: string): boolean {
  if (!token.startsWith("test:")) return false;
  const testSecret = process.env.TEST_AUTH_SECRET;
  if (!testSecret) return false;
  const a = Buffer.from(token.slice(5));
  const b = Buffer.from(testSecret);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

/**
 * Extract the GitHub username from a request.
 * Checks Authorization header for:
 *   1. Test auth: "Bearer test:<TEST_AUTH_SECRET>" + X-Test-User header
 *   2. GitHub PAT: "Bearer ghp_..."
 */
export async function resolveGitHubFromHeader(
  request: Request,
): Promise<string | null> {
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;
  const token = authHeader.slice(7).trim();
  if (!token) return null;

  if (validateTestToken(token)) {
    if (process.env.NODE_ENV === "production") return null;
    const testUser = request.headers.get("x-test-user")?.trim();
    return testUser || null;
  }

  return verifyGitHubToken(token);
}

/**
 * Check whether a request is authenticated via test auth.
 * Validates the secret — safe to use for granting extended sessions.
 * Call after resolveGitHub() has confirmed identity.
 */
export function isTestAuthRequest(request: Request): boolean {
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return false;
  const token = authHeader.slice(7).trim();
  return validateTestToken(token);
}
