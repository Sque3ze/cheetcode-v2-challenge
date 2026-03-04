"use client";

import { useState, useEffect } from "react";
import { DIM, BORDER, formatMs } from "./formatters";

interface ScorePanelProps {
  score: number | null;
  completionScore: number | null;
  orchestrationScore: number | null;
  earnedPoints: number | null;
  totalPoints: number | null;
  wrongAttempts: number | null;
  status: "active" | "completed" | "expired";
  startedAt: number;
  expiresAt: number;
}

export function ScorePanel({
  score,
  completionScore,
  orchestrationScore,
  earnedPoints,
  totalPoints,
  wrongAttempts,
  status,
  startedAt,
  expiresAt,
}: ScorePanelProps) {
  // eslint-disable-next-line react-hooks/purity -- Date.now() is intentional for live countdown
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    if (status !== "active") return;
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [status]);

  const isLive = status === "active";
  const elapsed = (isLive ? now : expiresAt) - startedAt;
  const remaining = Math.max(0, expiresAt - now);

  return (
    <div
      className="card-surface"
      style={{ borderRadius: 10, padding: 20 }}
    >
      {/* Status badge */}
      <div style={{ marginBottom: 16 }}>
        {isLive ? (
          <span className="spectate-live-badge" style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 600 }}>
            <span style={{
              width: 8, height: 8, borderRadius: "50%", background: "#16a34a",
              display: "inline-block",
            }} />
            LIVE
          </span>
        ) : (
          <span
            style={{
              fontSize: 11,
              padding: "2px 8px",
              borderRadius: 4,
              fontWeight: 500,
              background:
                status === "completed"
                  ? "rgba(22, 163, 74, 0.08)"
                  : "rgba(38, 38, 38, 0.06)",
              color: status === "completed" ? "#16a34a" : DIM,
            }}
          >
            {status.toUpperCase()}
          </span>
        )}
      </div>

      {/* Score */}
      <div
        style={{
          fontSize: 36,
          fontWeight: 500,
          fontFamily: "var(--font-geist-mono), monospace",
          color: "#262626",
          lineHeight: 1,
          marginBottom: 4,
        }}
      >
        {score != null ? `${score.toFixed(1)}%` : isLive ? "—" : "0%"}
      </div>
      <div style={{ fontSize: 12, color: DIM, marginBottom: 20 }}>
        Composite Score
      </div>

      {/* Timer */}
      <div style={{ borderTop: `1px solid ${BORDER}`, paddingTop: 16, marginBottom: 16 }}>
        <div style={{ fontSize: 11, color: DIM, marginBottom: 4 }}>
          {isLive ? "Time Remaining" : "Duration"}
        </div>
        <div
          style={{
            fontSize: 20,
            fontFamily: "var(--font-geist-mono), monospace",
            fontWeight: 500,
            color: isLive && remaining < 30000 ? "#dc2626" : "#262626",
          }}
          className={isLive && remaining < 30000 ? "timer-critical" : undefined}
        >
          {isLive ? formatMs(remaining) : formatMs(elapsed)}
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <div>
          <div style={{ fontSize: 11, color: DIM }}>Points</div>
          <div style={{ fontSize: 15, fontFamily: "var(--font-geist-mono), monospace", fontWeight: 500 }}>
            {earnedPoints ?? 0}/{totalPoints ?? "—"}
          </div>
        </div>
        <div>
          <div style={{ fontSize: 11, color: DIM }}>Completion</div>
          <div style={{ fontSize: 15, fontFamily: "var(--font-geist-mono), monospace", fontWeight: 500 }}>
            {completionScore != null ? `${completionScore.toFixed(0)}%` : "—"}
          </div>
        </div>
        <div>
          <div style={{ fontSize: 11, color: DIM }}>Wrong</div>
          <div style={{ fontSize: 15, fontFamily: "var(--font-geist-mono), monospace", fontWeight: 500 }}>
            {wrongAttempts ?? 0}
          </div>
        </div>
        <div>
          <div style={{ fontSize: 11, color: DIM }}>Orchestration</div>
          <div style={{ fontSize: 15, fontFamily: "var(--font-geist-mono), monospace", fontWeight: 500 }}>
            {orchestrationScore ?? "—"}
          </div>
        </div>
      </div>
    </div>
  );
}
