/**
 * Shared data fetcher for the Agent Report Card.
 * Used by both the page render and generateMetadata (deduped via React.cache).
 */

import "server-only";
import { cache } from "react";
import { ConvexHttpClient } from "convex/browser";
import type { Id } from "../../convex/_generated/dataModel";
import { api } from "../../convex/_generated/api";
import { getAllChallengeMetas } from "../../server/challenges/registry";
import { letterGrade } from "./letter-grades";
import type { OrchestrationMetrics } from "./orchestration-metrics";

// ─── Types ─────────────────────────────────────────────────────

export interface ResultsChallenge {
  id: string;
  title: string;
  tier: number;
  points: number;
  status: "solved" | "wrong" | "locked" | "unattempted";
  attempts: number;
  solveTimeMs: number | null;
  pointsEarned: number;
}

export interface ResultsData {
  session: {
    github: string;
    startedAt: number;
    expiresAt: number;
    score: number;
    completionScore: number;
    orchestrationScore: number;
    orchestrationMetrics: OrchestrationMetrics | null;
    earnedPoints: number;
    totalPoints: number;
    wrongAttempts: number;
    apiCalls: number;
  };
  rank: number;
  totalPlayers: number;
  challenges: ResultsChallenge[];
  timeline: {
    totalDurationMs: number;
    firstViewAt: number | null;
    lastSubmitAt: number | null;
    idleTimeMs: number;
    challengesViewed: number;
    challengesSolved: number;
  };
  grades: {
    overall: string;
    parallelization: string;
    dagEfficiency: string;
    criticalPathSpeed: string;
    submissionConfidence: string;
    failureRecovery: string;
    tiersReached: string;
  };
}

// ─── Fetcher ───────────────────────────────────────────────────

export const fetchResultsData = cache(async (sessionId: string): Promise<ResultsData | null> => {
  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
  const secret = process.env.CONVEX_MUTATION_SECRET;
  if (!convexUrl || !secret) return null;

  const convex = new ConvexHttpClient(convexUrl);

  // Parallel fetch all data
  const [session, submissions, events, leaderboard] = await Promise.all([
    convex.action(api.sessions.fetchSession, {
      secret,
      sessionId: sessionId as Id<"sessions">,
    }),
    convex.action(api.submissions.fetchBySession, {
      secret,
      sessionId: sessionId as Id<"sessions">,
    }),
    convex.action(api.sessionEvents.fetchBySession, {
      secret,
      sessionId: sessionId as Id<"sessions">,
    }),
    convex.query(api.leaderboard.getAll, {}),
  ]);

  if (!session) return null;

  // Only show results for completed/expired sessions
  if (session.status === "active") return null;

  const metas = getAllChallengeMetas();

  // ── Rank ──
  const rank = leaderboard.findIndex(
    (e: { sessionId: string }) => e.sessionId === sessionId
  ) + 1; // 0 if not found (findIndex returns -1)
  const totalPlayers = leaderboard.length;

  // ── Per-challenge breakdown ──
  const submissionsByChallengeId = new Map<string, Array<{ correct: boolean; attemptNumber: number }>>();
  for (const sub of submissions as Array<{ challengeId: string; correct: boolean; attemptNumber: number }>) {
    const arr = submissionsByChallengeId.get(sub.challengeId) ?? [];
    arr.push(sub);
    submissionsByChallengeId.set(sub.challengeId, arr);
  }

  // Build event maps for timing
  const viewEvents = new Map<string, number>(); // challengeId → first view timestamp
  const correctEvents = new Map<string, number>(); // challengeId → correct timestamp
  for (const evt of events as Array<{ type: string; challengeId?: string; timestamp: number }>) {
    if (evt.type === "challenge_viewed" && evt.challengeId) {
      if (!viewEvents.has(evt.challengeId)) {
        viewEvents.set(evt.challengeId, evt.timestamp);
      }
    }
    if (evt.type === "answer_correct" && evt.challengeId) {
      correctEvents.set(evt.challengeId, evt.timestamp);
    }
  }

  const challenges: ResultsChallenge[] = metas.map((meta) => {
    const subs = submissionsByChallengeId.get(meta.id) ?? [];
    const solved = subs.some((s) => s.correct);
    const maxAttempt = subs.reduce((max, s) => Math.max(max, s.attemptNumber), 0);
    const locked = !solved && maxAttempt >= 3;

    let status: ResultsChallenge["status"] = "unattempted";
    if (solved) status = "solved";
    else if (locked) status = "locked";
    else if (subs.length > 0) status = "wrong";

    const viewTs = viewEvents.get(meta.id);
    const correctTs = correctEvents.get(meta.id);
    const solveTimeMs = viewTs && correctTs ? correctTs - viewTs : null;

    return {
      id: meta.id,
      title: meta.title,
      tier: meta.tier,
      points: meta.points,
      status,
      attempts: maxAttempt,
      solveTimeMs,
      pointsEarned: solved ? meta.points : 0,
    };
  });

  // ── Timeline ──
  const typedEvents = events as Array<{ type: string; timestamp: number; challengeId?: string }>;
  const viewTimestamps = typedEvents
    .filter((e) => e.type === "challenge_viewed")
    .map((e) => e.timestamp);
  const submitTimestamps = typedEvents
    .filter((e) => e.type === "answer_submitted" || e.type === "answer_correct" || e.type === "answer_wrong")
    .map((e) => e.timestamp);

  const firstViewAt = viewTimestamps.length > 0 ? Math.min(...viewTimestamps) : null;
  const lastSubmitAt = submitTimestamps.length > 0 ? Math.max(...submitTimestamps) : null;

  const endTime = session.status === "completed"
    ? (lastSubmitAt ?? session.expiresAt)
    : session.expiresAt;
  const totalDurationMs = endTime - session.startedAt;

  // Idle time: total duration minus time actively working (first view to last submit)
  const activeWindow = firstViewAt && lastSubmitAt ? lastSubmitAt - firstViewAt : 0;
  const idleTimeMs = Math.max(0, totalDurationMs - activeWindow);

  const uniqueViewed = new Set(
    typedEvents.filter((e) => e.type === "challenge_viewed").map((e) => e.challengeId)
  );
  const challengesSolved = challenges.filter((c) => c.status === "solved").length;

  // ── Grades ──
  const metrics = session.orchestrationMetrics as ResultsData["session"]["orchestrationMetrics"];
  const score = session.score ?? 0;

  const grades: ResultsData["grades"] = {
    overall: letterGrade(score),
    parallelization: metrics ? letterGrade(metrics.parallelizationScore * 100) : "N/A",
    dagEfficiency: metrics ? letterGrade(metrics.dagEfficiency * 100) : "N/A",
    criticalPathSpeed: metrics ? letterGrade(metrics.criticalPathSpeed * 100) : "N/A",
    submissionConfidence: metrics ? letterGrade(metrics.submissionConfidence * 100) : "N/A",
    failureRecovery: metrics?.failureRecoveryScore != null ? letterGrade(metrics.failureRecoveryScore * 100) : "N/A",
    tiersReached: metrics ? `Tier ${metrics.tiersReached} of 4` : "N/A",
  };

  return {
    session: {
      github: session.github,
      startedAt: session.startedAt,
      expiresAt: session.expiresAt,
      score,
      completionScore: session.completionScore ?? 0,
      orchestrationScore: session.orchestrationScore ?? 0,
      orchestrationMetrics: metrics ?? null,
      earnedPoints: session.earnedPoints ?? 0,
      totalPoints: session.totalPoints ?? 0,
      wrongAttempts: session.wrongAttempts ?? 0,
      apiCalls: session.apiCalls ?? 0,
    },
    rank,
    totalPlayers,
    challenges,
    timeline: {
      totalDurationMs,
      firstViewAt,
      lastSubmitAt,
      idleTimeMs,
      challengesViewed: uniqueViewed.size,
      challengesSolved,
    },
    grades,
  };
});
