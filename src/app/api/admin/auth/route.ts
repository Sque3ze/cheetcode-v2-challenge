import { NextResponse } from "next/server";
import { resolveGitHub } from "../../../../lib/api-helpers";

/**
 * GET /api/admin/auth?key=xxx
 *
 * Server-side admin auth check. Validates:
 * 1. GitHub identity matches ADMIN_GITHUB (if set)
 * 2. Query param `key` matches ADMIN_KEY (if set)
 *
 * Returns { authorized: true } or { authorized: false, reason: string }
 */
export async function GET(request: Request) {
  const github = await resolveGitHub(request);
  const adminGithub = process.env.ADMIN_GITHUB;
  const adminKey = process.env.ADMIN_KEY;

  // Check GitHub identity
  if (!github) {
    return NextResponse.json({ authorized: false, reason: "Not signed in." });
  }

  if (adminGithub && github !== adminGithub) {
    return NextResponse.json({ authorized: false, reason: "Unauthorized." });
  }

  // Check secret key
  const url = new URL(request.url);
  const key = url.searchParams.get("key");

  if (adminKey && key !== adminKey) {
    return NextResponse.json({ authorized: false, reason: "Unauthorized." });
  }

  return NextResponse.json({ authorized: true });
}
