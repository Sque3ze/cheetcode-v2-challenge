import { NextResponse } from "next/server";
import { fetchResultsData } from "../../../../lib/results-data";

/**
 * GET /api/results/[sessionId]
 * Public JSON API for session results. No auth required (results are public).
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ sessionId: string }> }
) {
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
        "Cache-Control": "public, max-age=60, s-maxage=3600",
      },
    });
  } catch {
    return NextResponse.json({ error: "Invalid session ID" }, { status: 404 });
  }
}
