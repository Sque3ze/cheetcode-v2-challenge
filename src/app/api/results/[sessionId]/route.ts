import { NextResponse } from "next/server";
import { fetchResultsData } from "../../../../lib/results-data";
import { resolveGitHub, unauthorized } from "../../../../lib/api-helpers";

/**
 * GET /api/results/[sessionId]
 * JSON API for session results. Requires authentication.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const github = await resolveGitHub(request);
  if (!github) return unauthorized();

  const { sessionId } = await params;

  try {
    const data = await fetchResultsData(sessionId);
    if (!data) {
      return NextResponse.json(
        { error: "Session not found or still in progress" },
        { status: 404 }
      );
    }

    return NextResponse.json(data, {
      headers: {
        "Cache-Control": "private, max-age=60",
      },
    });
  } catch {
    return NextResponse.json({ error: "Invalid session ID" }, { status: 404 });
  }
}
