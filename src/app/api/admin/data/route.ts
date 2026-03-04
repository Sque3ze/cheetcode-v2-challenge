import { NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import type { Id } from "../../../../../convex/_generated/dataModel";
import { api } from "../../../../../convex/_generated/api";
import { verifyAdminAuth } from "../../../../lib/api-helpers";

/**
 * GET /api/admin/data?type=overview|challenges|sessions|timeline|leaderboard
 *
 * Authenticated proxy to admin Convex queries.
 * Reads admin key from X-Admin-Key header.
 * Verifies admin identity before fetching any data.
 */
export async function GET(request: Request) {
  const authResult = await verifyAdminAuth(request);
  if (authResult instanceof NextResponse) return authResult;

  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
  const secret = process.env.CONVEX_MUTATION_SECRET;
  if (!convexUrl || !secret) {
    return NextResponse.json({ error: "Server not configured" }, { status: 500 });
  }

  const url = new URL(request.url);
  const type = url.searchParams.get("type");
  const convex = new ConvexHttpClient(convexUrl);

  try {
    switch (type) {
      case "overview":
        return NextResponse.json(await convex.action(api.admin.fetchOverviewStats, { secret }));

      case "challenges":
        return NextResponse.json(await convex.action(api.admin.fetchChallengeAggregates, { secret }));

      case "sessions": {
        const rawLimit = Number(url.searchParams.get("limit"));
        const limit = Number.isInteger(rawLimit) && rawLimit > 0 ? rawLimit : 20;
        return NextResponse.json(await convex.action(api.admin.fetchRecentSessions, { secret, limit }));
      }

      case "timeline": {
        const sessionId = url.searchParams.get("sessionId");
        if (!sessionId || sessionId.length < 10) {
          return NextResponse.json({ error: "Valid sessionId required" }, { status: 400 });
        }
        return NextResponse.json(
          await convex.action(api.admin.fetchSessionTimeline, {
            secret,
            sessionId: sessionId as unknown as Id<"sessions">,
          })
        );
      }

      case "leaderboard":
        return NextResponse.json(await convex.action(api.admin.fetchAllAdmin, { secret }));

      default:
        return NextResponse.json({ error: "Invalid type parameter" }, { status: 400 });
    }
  } catch (err) {
    console.error("/api/admin/data error:", err);
    return NextResponse.json({ error: "Failed to fetch data" }, { status: 500 });
  }
}

/**
 * POST /api/admin/data
 * Body: { type: "leaderboard-visibility", entryId: string, visible: boolean }
 */
export async function POST(request: Request) {
  const authResult = await verifyAdminAuth(request);
  if (authResult instanceof NextResponse) return authResult;

  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
  const secret = process.env.CONVEX_MUTATION_SECRET;
  if (!convexUrl || !secret) {
    return NextResponse.json({ error: "Server not configured" }, { status: 500 });
  }

  const convex = new ConvexHttpClient(convexUrl);

  try {
    const body = await request.json();
    const { type, entryId, visible } = body;

    switch (type) {
      case "leaderboard-visibility": {
        if (!entryId || typeof visible !== "boolean") {
          return NextResponse.json({ error: "entryId and visible (boolean) required" }, { status: 400 });
        }
        return NextResponse.json(
          await convex.action(api.admin.updateVisibility, {
            secret,
            entryId: entryId as unknown as Id<"leaderboard">,
            visible,
          })
        );
      }

      case "start-demo": {
        return NextResponse.json(
          await convex.action(api.admin.launchDemo, { secret })
        );
      }

      case "force-expire": {
        const { sessionId } = body;
        if (!sessionId) {
          return NextResponse.json({ error: "sessionId required" }, { status: 400 });
        }
        return NextResponse.json(
          await convex.action(api.admin.forceExpireSession, {
            secret,
            sessionId: sessionId as unknown as Id<"sessions">,
          })
        );
      }

      default:
        return NextResponse.json({ error: "Invalid type parameter" }, { status: 400 });
    }
  } catch (err) {
    console.error("/api/admin/data POST error:", err);
    return NextResponse.json({ error: "Failed to process request" }, { status: 500 });
  }
}
