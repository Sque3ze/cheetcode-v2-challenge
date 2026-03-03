import { NextResponse } from "next/server";
import { verifyAdminAuth } from "../../../../lib/api-helpers";

/**
 * GET /api/admin/auth?key=xxx
 *
 * Server-side admin auth check. Returns { authorized: true } or { authorized: false, reason: string }.
 */
export async function GET(request: Request) {
  const result = await verifyAdminAuth(request);
  if (result instanceof NextResponse) {
    // Map HTTP error to the { authorized, reason } shape the client expects
    const body = await result.json();
    return NextResponse.json({ authorized: false, reason: body.error ?? "Unauthorized." });
  }
  return NextResponse.json({ authorized: true });
}
