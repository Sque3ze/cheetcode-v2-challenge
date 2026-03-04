"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import { useMemo } from "react";
import { ChallengeDAG } from "../../../components/spectator/ChallengeDAG";
import { SessionGanttChart } from "../../../components/spectator/SessionGanttChart";
import { EventFeed } from "../../../components/spectator/EventFeed";
import { ScorePanel } from "../../../components/spectator/ScorePanel";
import { OrchestrationRadar } from "../../../components/spectator/OrchestrationRadar";
import { DIM } from "../../../components/spectator/formatters";
import { DAG_NODES } from "../../../lib/dag-layout";

const POINTS_LOOKUP = new Map(DAG_NODES.map((n) => [n.id, n.points]));
const TOTAL_POINTS = DAG_NODES.reduce((sum, n) => sum + n.points, 0);

export default function SpectatePage() {
  const params = useParams();
  const sessionId = params.sessionId as string;

  const session = useQuery(api.spectator.getSessionPublic, {
    sessionId: sessionId as Id<"sessions">,
  });
  const events = useQuery(api.spectator.getSessionEventsPublic, {
    sessionId: sessionId as Id<"sessions">,
  });

  // Derive stats from events when the session record has nulls
  // (happens for expired sessions where /api/session/finish was never called)
  // Must be called before early returns to satisfy hook rules.
  const derivedStats = useMemo(() => {
    if (!events || events.length === 0) {
      return { lastBucket: null, solvedChallenges: new Set<string>(), wrongCount: 0, earnedPoints: 0, totalPoints: TOTAL_POINTS, completionPct: 0, currentChallenge: null as string | null };
    }

    const lastBucket = Math.max(...events.map((e) => e.bucket));

    const solvedChallenges = new Set<string>();
    let wrongCount = 0;
    let currentChallenge: string | null = null;
    for (const e of events) {
      if (e.type === "answer_correct" && e.challengeId) {
        solvedChallenges.add(e.challengeId);
      } else if (e.type === "answer_wrong") {
        wrongCount++;
      }
      if (e.challengeId && e.type !== "session_started" && e.type !== "session_completed") {
        currentChallenge = e.challengeId;
      }
    }

    let earnedPoints = 0;
    for (const id of solvedChallenges) {
      earnedPoints += POINTS_LOOKUP.get(id) ?? 0;
    }
    const completionPct = TOTAL_POINTS > 0
      ? Math.round((earnedPoints / TOTAL_POINTS) * 10000) / 100
      : 0;

    return { lastBucket, solvedChallenges, wrongCount, earnedPoints, totalPoints: TOTAL_POINTS, completionPct, currentChallenge };
  }, [events]);

  // Convert bucket-based events to approximate timestamps for Gantt/EventFeed.
  // Buckets are 30s windows — use midpoint for rough positioning (hides exact timing).
  const ganttEvents = useMemo(() => {
    const startedAt = session?.startedAt ?? 0;
    return (events ?? []).map((e, i) => ({
      type: e.type,
      timestamp: startedAt + e.bucket * 30000 + i * 50, // spread within bucket for ordering
      challengeId: e.challengeId ?? undefined,
      metadata: e.metadata ?? undefined,
    }));
  }, [events, session?.startedAt]);

  if (session === undefined || events === undefined) {
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          minHeight: "60vh",
        }}
      >
        <p style={{ color: DIM, fontSize: 14 }}>Loading session...</p>
      </div>
    );
  }

  if (session === null || events === null) {
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          minHeight: "60vh",
          flexDirection: "column",
          gap: 16,
        }}
      >
        <p style={{ color: DIM, fontSize: 14 }}>Session not found.</p>
        <Link
          href="/"
          style={{ color: "#fa5d19", fontSize: 13, textDecoration: "none" }}
        >
          Back to home
        </Link>
      </div>
    );
  }

  const isLive = session.status === "active";
  const durationMs = session.expiresAt - session.startedAt;

  // Use session record values if available, fall back to event-derived values
  const displayScore = session.score;
  const displayCompletion = session.completionScore ?? (derivedStats.solvedChallenges.size > 0 ? derivedStats.completionPct : null);
  const displayEarned = session.earnedPoints ?? derivedStats.earnedPoints;
  const displayTotal = session.totalPoints ?? derivedStats.totalPoints;
  const displayWrong = session.wrongAttempts ?? derivedStats.wrongCount;

  const currentChallenge = isLive ? derivedStats.currentChallenge : null;

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: "32px 24px 120px" }}>
      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
          <Link
            href="/"
            style={{ fontSize: 13, color: DIM, textDecoration: "none" }}
          >
            &larr; Leaderboard
          </Link>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <h1
            style={{
              fontSize: 24,
              fontWeight: 500,
              letterSpacing: "-0.24px",
              color: "#262626",
              margin: 0,
            }}
          >
            <a
              href={`https://github.com/${session.github}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: "#262626", textDecoration: "none" }}
            >
              {session.github}
            </a>
            <span style={{ color: DIM, fontWeight: 400 }}>
              &apos;s Session
            </span>
          </h1>
          {isLive && (
            <span
              className="spectate-live-badge"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                fontSize: 12,
                fontWeight: 600,
                padding: "2px 10px",
                borderRadius: 999,
                background: "rgba(22, 163, 74, 0.08)",
                color: "#16a34a",
              }}
            >
              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  background: "#16a34a",
                  display: "inline-block",
                }}
              />
              LIVE
            </span>
          )}
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 280px",
          gap: 20,
          marginBottom: 20,
        }}
      >
        <div
          className="card-surface"
          style={{ borderRadius: 10, padding: 16, overflowX: "auto" }}
        >
          <div
            style={{
              fontSize: 12,
              fontWeight: 500,
              color: DIM,
              marginBottom: 12,
            }}
          >
            Challenge Graph
          </div>
          <ChallengeDAG events={events} />
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <ScorePanel
            score={displayScore}
            completionScore={displayCompletion}
            orchestrationScore={session.orchestrationScore}
            earnedPoints={displayEarned}
            totalPoints={displayTotal}
            wrongAttempts={displayWrong}
            status={session.status}
            startedAt={session.startedAt}
            expiresAt={session.expiresAt}
            lastEventAt={derivedStats.lastBucket != null ? session.startedAt + derivedStats.lastBucket * 30000 : undefined}
            currentChallenge={currentChallenge}
          />

          {/* Orchestration Radar (only for completed sessions) */}
          {session.orchestrationMetrics && (
            <div
              className="card-surface"
              style={{
                borderRadius: 10,
                padding: 16,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
              }}
            >
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 500,
                  color: DIM,
                  marginBottom: 8,
                  alignSelf: "flex-start",
                }}
              >
                Orchestration
              </div>
              <OrchestrationRadar
                metrics={session.orchestrationMetrics}
                size={220}
              />
            </div>
          )}
        </div>
      </div>

      {!(isLive && session.github === "demo-agent") && (
        <div
          className="card-surface"
          style={{ borderRadius: 10, overflow: "hidden", marginBottom: 20 }}
        >
          <SessionGanttChart
            events={ganttEvents}
            startedAt={session.startedAt}
            durationMs={durationMs}
            live={isLive}
          />
        </div>
      )}

      <div
        className="card-surface"
        style={{ borderRadius: 10, overflow: "hidden" }}
      >
        <div
          style={{
            fontSize: 12,
            fontWeight: 500,
            color: DIM,
            padding: "12px 16px",
          }}
        >
          Event Feed
          {isLive && (
            <span style={{ color: "#16a34a", marginLeft: 8 }}>
              (auto-updating)
            </span>
          )}
        </div>
        <EventFeed events={ganttEvents} startedAt={session.startedAt} live={isLive} />
      </div>
    </div>
  );
}
