"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import { ChallengeDAG } from "../../../components/spectator/ChallengeDAG";
import { SessionGanttChart } from "../../../components/spectator/SessionGanttChart";
import { EventFeed } from "../../../components/spectator/EventFeed";
import { ScorePanel } from "../../../components/spectator/ScorePanel";
import { OrchestrationRadar } from "../../../components/spectator/OrchestrationRadar";
import { DIM } from "../../../components/spectator/formatters";

export default function SpectatePage() {
  const params = useParams();
  const sessionId = params.sessionId as string;

  const session = useQuery(api.spectator.getSessionPublic, {
    sessionId: sessionId as Id<"sessions">,
  });
  const events = useQuery(api.spectator.getSessionEventsPublic, {
    sessionId: sessionId as Id<"sessions">,
  });

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

  // Convert events for components that expect SessionEvent format
  const ganttEvents = events.map((e) => ({
    type: e.type,
    timestamp: e.timestamp,
    challengeId: e.challengeId ?? undefined,
    metadata: e.metadata ?? undefined,
  }));

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

      {/* Main layout: DAG + Score Panel */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 280px",
          gap: 20,
          marginBottom: 20,
        }}
      >
        {/* Challenge DAG */}
        <div
          className="card-surface"
          style={{ borderRadius: 10, padding: 16, overflow: "hidden" }}
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

        {/* Right sidebar */}
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <ScorePanel
            score={session.score}
            completionScore={session.completionScore}
            orchestrationScore={session.orchestrationScore}
            earnedPoints={session.earnedPoints}
            totalPoints={session.totalPoints}
            wrongAttempts={session.wrongAttempts}
            status={session.status}
            startedAt={session.startedAt}
            expiresAt={session.expiresAt}
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

      {/* Gantt Chart */}
      <div
        className="card-surface"
        style={{ borderRadius: 10, overflow: "hidden", marginBottom: 20 }}
      >
        <SessionGanttChart
          events={ganttEvents}
          startedAt={session.startedAt}
          durationMs={durationMs}
        />
      </div>

      {/* Event Feed */}
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
        <EventFeed events={events} startedAt={session.startedAt} live={isLive} />
      </div>
    </div>
  );
}
