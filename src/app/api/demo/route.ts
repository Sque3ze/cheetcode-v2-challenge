import { NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../../convex/_generated/api";

export async function POST() {
  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
  const secret = process.env.CONVEX_MUTATION_SECRET;
  if (!convexUrl || !secret) {
    return NextResponse.json({ error: "Server not configured" }, { status: 500 });
  }

  const convex = new ConvexHttpClient(convexUrl);

  try {
    const result = await convex.action(api.admin.launchDemo, { secret });
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to launch demo";
    return NextResponse.json({ error: message }, { status: 409 });
  }
}
