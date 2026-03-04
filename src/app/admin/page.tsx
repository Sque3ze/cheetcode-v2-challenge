"use client";

import { Suspense, useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import type { Id } from "../../../convex/_generated/dataModel";
import type { SessionEvent, OrchestrationMetrics } from "../../lib/orchestration-metrics";
import { SessionGanttChart } from "../../components/spectator/SessionGanttChart";
import { OverlayGanttChart } from "../../components/spectator/OverlayGanttChart";
import { OrchestrationRadar } from "../../components/spectator/OrchestrationRadar";
import {
  ACCENT,
  DIM,
  BORDER,
  EVENT_COLORS,
  rateColor,
  formatMs,
  formatTime,
} from "../../components/spectator/formatters";

// ─── Authenticated fetch hook (proxies through /api/admin/data) ──
type AdminQueryType = "overview" | "challenges" | "sessions" | "timeline" | "leaderboard";

function useAdminKey(): string {
  const searchParams = useSearchParams();
  const [key] = useState(() => searchParams.get("key") || "");
  return key;
}

function useAdminQuery<T>(type: AdminQueryType, params?: Record<string, string>): T | undefined {
  const key = useAdminKey();
  const [data, setData] = useState<T | undefined>(undefined);

  // Stable serialization of params for the dependency array
  const paramsKey = params ? JSON.stringify(params) : "";

  useEffect(() => {
    const extra = paramsKey ? JSON.parse(paramsKey) as Record<string, string> : {};
    const qs = new URLSearchParams({ type, ...extra });
    fetch(`/api/admin/data?${qs}`, {
      headers: { "x-admin-key": key },
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (d) setData(d); })
      .catch(() => {});
  }, [type, key, paramsKey]);

  return data;
}

function OverviewCards() {
  const stats = useAdminQuery<{
    totalSessions: number;
    completedSessions: number;
    avgScore: number;
    uniquePlayers: number;
    topUserAgent: string;
  }>("overview");

  if (!stats)
    return (
      <p style={{ color: DIM, fontSize: 14 }}>Loading overview...</p>
    );

  const cards = [
    { label: "Total Sessions", value: stats.totalSessions },
    { label: "Completed", value: stats.completedSessions },
    { label: "Unique Players", value: stats.uniquePlayers },
    { label: "Avg Score", value: `${stats.avgScore}%` },
  ];

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
      {cards.map((c) => (
        <div
          key={c.label}
          className="card-surface"
          style={{ padding: "20px 16px", borderRadius: 10 }}
        >
          <div style={{ fontSize: 12, color: DIM, marginBottom: 6 }}>
            {c.label}
          </div>
          <div
            style={{
              fontSize: 22,
              fontWeight: 500,
              color: "#262626",
              fontFamily: "var(--font-geist-mono), monospace",
            }}
          >
            {c.value}
          </div>
        </div>
      ))}
    </div>
  );
}

function ChallengeAnalytics() {
  const aggregates = useAdminQuery<Array<{
    challengeId: string;
    totalAttempts: number;
    successRate: number;
    avgAttempts: number;
    avgSolveTimeMs: number | null;
    lockRate: number;
    topWrongAnswers: Array<{ answer: string; count: number }>;
  }>>("challenges");

  if (!aggregates)
    return (
      <p style={{ color: DIM, fontSize: 14 }}>Loading challenge stats...</p>
    );

  if (aggregates.length === 0)
    return (
      <p style={{ color: DIM, fontSize: 14 }}>No submission data yet.</p>
    );

  return (
    <div className="card-surface" style={{ borderRadius: 10, overflow: "hidden" }}>
      <table
        style={{ width: "100%", fontSize: 13, lineHeight: "20px", borderCollapse: "collapse" }}
      >
        <thead>
          <tr style={{ borderBottom: `1px solid ${BORDER}` }}>
            {["Challenge", "Attempts", "Success", "Avg Tries", "Avg Solve", "Lock %", "Top Wrong Answers"].map(
              (h) => (
                <th
                  key={h}
                  style={{
                    padding: "10px 14px",
                    fontWeight: 450,
                    color: DIM,
                    textAlign: h === "Challenge" || h === "Top Wrong Answers" ? "left" : "right",
                    whiteSpace: "nowrap",
                  }}
                >
                  {h}
                </th>
              )
            )}
          </tr>
        </thead>
        <tbody>
          {aggregates.map((row, i) => (
            <tr key={row.challengeId} style={{ borderTop: i > 0 ? `1px solid ${BORDER}` : undefined }}>
              <td style={{ padding: "10px 14px", fontWeight: 450 }}>
                <span
                  style={{
                    display: "inline-block",
                    fontSize: 10,
                    padding: "1px 6px",
                    borderRadius: 4,
                    background: "rgba(250, 93, 25, 0.08)",
                    color: ACCENT,
                    marginRight: 6,
                    fontWeight: 500,
                  }}
                >
                  T{row.challengeId.match(/tier(\d)/)?.[1] || "?"}
                </span>
                {row.challengeId.replace(/^tier\d-/, "")}
              </td>
              <td style={{ padding: "10px 14px", textAlign: "right", fontFamily: "var(--font-geist-mono), monospace" }}>
                {row.totalAttempts}
              </td>
              <td
                style={{
                  padding: "10px 14px",
                  textAlign: "right",
                  fontFamily: "var(--font-geist-mono), monospace",
                  color: rateColor(row.successRate),
                  fontWeight: 500,
                }}
              >
                {row.successRate}%
              </td>
              <td style={{ padding: "10px 14px", textAlign: "right", fontFamily: "var(--font-geist-mono), monospace" }}>
                {row.avgAttempts}
              </td>
              <td
                style={{
                  padding: "10px 14px",
                  textAlign: "right",
                  fontFamily: "var(--font-geist-mono), monospace",
                  color: DIM,
                }}
              >
                {row.avgSolveTimeMs ? formatMs(row.avgSolveTimeMs) : "—"}
              </td>
              <td
                style={{
                  padding: "10px 14px",
                  textAlign: "right",
                  fontFamily: "var(--font-geist-mono), monospace",
                  color: row.lockRate > 20 ? "#dc2626" : DIM,
                }}
              >
                {row.lockRate}%
              </td>
              <td style={{ padding: "10px 14px", color: DIM, fontSize: 12, maxWidth: 200 }}>
                {row.topWrongAnswers.length > 0
                  ? row.topWrongAnswers
                      .map((w) => `"${w.answer}" (${w.count})`)
                      .join(", ")
                  : "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

type LeaderboardEntry = {
  _id: string;
  github: string;
  score: number;
  orchestrationScore?: number;
  earnedPoints: number;
  totalPoints: number;
  wrongAttempts: number;
  completedAt: number;
  isTestSession?: boolean;
};

function LeaderboardManagement() {
  const key = useAdminKey();
  const entries = useAdminQuery<LeaderboardEntry[]>("leaderboard");
  const [updating, setUpdating] = useState<Set<string>>(new Set());

  const toggleVisibility = async (entryId: string, visible: boolean) => {
    setUpdating((prev) => new Set(prev).add(entryId));
    try {
      const res = await fetch("/api/admin/data", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-admin-key": key },
        body: JSON.stringify({ type: "leaderboard-visibility", entryId, visible }),
      });
      if (res.ok) {
        // Optimistically update local state — flip the flag
        if (entries) {
          const entry = entries.find((e) => e._id === entryId);
          if (entry) entry.isTestSession = !visible;
        }
      }
    } catch {
      // silent
    } finally {
      setUpdating((prev) => {
        const next = new Set(prev);
        next.delete(entryId);
        return next;
      });
    }
  };

  if (!entries) return <p style={{ color: DIM, fontSize: 14 }}>Loading leaderboard...</p>;
  if (entries.length === 0) return <p style={{ color: DIM, fontSize: 14 }}>No leaderboard entries yet.</p>;

  return (
    <div className="card-surface" style={{ borderRadius: 10, overflow: "hidden" }}>
      <table style={{ width: "100%", fontSize: 13, lineHeight: "20px", borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ borderBottom: `1px solid ${BORDER}` }}>
            {["#", "Player", "Score", "Orch.", "Solved", "Wrong", "Type", "Visible"].map((h) => (
              <th
                key={h}
                style={{
                  padding: "10px 14px",
                  fontWeight: 450,
                  color: DIM,
                  textAlign: h === "Player" || h === "Type" || h === "Visible" ? "left" : "right",
                  whiteSpace: "nowrap",
                  width: h === "#" ? 40 : h === "Visible" ? 80 : undefined,
                }}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {entries.map((entry, i) => {
            const isTest = !!entry.isTestSession;
            const isVisible = !isTest;
            const isLoading = updating.has(entry._id);

            return (
              <tr key={entry._id} style={{ borderTop: i > 0 ? `1px solid ${BORDER}` : undefined }}>
                <td
                  style={{
                    padding: "10px 14px",
                    textAlign: "right",
                    fontFamily: "var(--font-geist-mono), monospace",
                    color: DIM,
                  }}
                >
                  {i + 1}
                </td>
                <td style={{ padding: "10px 14px", fontWeight: 450 }}>{entry.github}</td>
                <td
                  style={{
                    padding: "10px 14px",
                    textAlign: "right",
                    fontFamily: "var(--font-geist-mono), monospace",
                    fontWeight: 500,
                  }}
                >
                  {entry.score.toFixed(1)}%
                </td>
                <td
                  style={{
                    padding: "10px 14px",
                    textAlign: "right",
                    fontFamily: "var(--font-geist-mono), monospace",
                    color: entry.orchestrationScore != null ? rateColor(entry.orchestrationScore) : DIM,
                  }}
                >
                  {entry.orchestrationScore != null ? entry.orchestrationScore : "—"}
                </td>
                <td
                  style={{
                    padding: "10px 14px",
                    textAlign: "right",
                    fontFamily: "var(--font-geist-mono), monospace",
                  }}
                >
                  {entry.earnedPoints}/{entry.totalPoints}
                </td>
                <td
                  style={{
                    padding: "10px 14px",
                    textAlign: "right",
                    fontFamily: "var(--font-geist-mono), monospace",
                    color: DIM,
                  }}
                >
                  {entry.wrongAttempts}
                </td>
                <td style={{ padding: "10px 14px" }}>
                  {isTest && (
                    <span
                      style={{
                        fontSize: 10,
                        padding: "2px 7px",
                        borderRadius: 4,
                        fontWeight: 600,
                        background: "rgba(139, 92, 246, 0.10)",
                        color: "#7c3aed",
                        letterSpacing: "0.3px",
                      }}
                    >
                      TEST
                    </span>
                  )}
                </td>
                <td style={{ padding: "10px 14px" }}>
                  <button
                    onClick={() => toggleVisibility(entry._id, !isVisible)}
                    disabled={isLoading}
                    style={{
                      fontSize: 11,
                      padding: "3px 10px",
                      borderRadius: 6,
                      border: `1px solid ${BORDER}`,
                      background: isVisible ? "rgba(22, 163, 74, 0.08)" : "rgba(38, 38, 38, 0.04)",
                      color: isVisible ? "#16a34a" : DIM,
                      cursor: isLoading ? "wait" : "pointer",
                      fontWeight: 500,
                      opacity: isLoading ? 0.5 : 1,
                    }}
                  >
                    {isVisible ? "Public" : "Hidden"}
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function SessionTimeline({ events, startedAt }: { events: SessionEvent[]; startedAt: number }) {
  if (events.length === 0) return <p style={{ color: DIM, fontSize: 12, padding: "8px 14px" }}>No events recorded.</p>;

  return (
    <div
      style={{
        padding: "12px 14px",
        background: "rgba(0,0,0,0.015)",
        borderTop: `1px solid ${BORDER}`,
        maxHeight: 320,
        overflowY: "auto",
      }}
    >
      {events.map((event, i) => {
        const meta = event.metadata as Record<string, unknown> | undefined;
        return (
          <div
            key={i}
            style={{
              display: "flex",
              alignItems: "baseline",
              gap: 10,
              padding: "3px 0",
              fontSize: 12,
              fontFamily: "var(--font-geist-mono), monospace",
            }}
          >
            <span style={{ color: DIM, width: 40, flexShrink: 0 }}>
              {formatTime(event.timestamp, startedAt)}
            </span>
            <span
              style={{
                color: EVENT_COLORS[event.type] || "#262626",
                fontWeight: 500,
                width: 160,
                flexShrink: 0,
              }}
            >
              {event.type}
            </span>
            <span style={{ color: "#262626", width: 180, flexShrink: 0 }}>
              {event.challengeId || ""}
            </span>
            <span style={{ color: DIM, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {meta
                ? Object.entries(meta)
                    .map(([k, v]) => `${k}=${JSON.stringify(v)}`)
                    .join(" ")
                : ""}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function SessionExpandedContent({ sessionId, startedAt, durationMs }: {
  sessionId: Id<"sessions">;
  startedAt: number;
  durationMs: number;
}) {
  const events = useAdminQuery<SessionEvent[]>("timeline", { sessionId });

  if (!events) return <p style={{ color: DIM, fontSize: 12, padding: "8px 14px" }}>Loading timeline...</p>;

  return (
    <>
      <SessionGanttChart events={events} startedAt={startedAt} durationMs={durationMs} />
      <SessionTimeline events={events} startedAt={startedAt} />
    </>
  );
}

type AdminSession = {
  _id: Id<"sessions">;
  github: string;
  startedAt: number;
  expiresAt: number;
  status: "active" | "completed" | "expired";
  userAgent?: string;
  apiCalls: number;
  solvedChallenges: string[];
  wrongAttempts: number;
  score: number | null;
  orchestrationScore: number | null;
  orchestrationMetrics: OrchestrationMetrics | null;
};

function RecentSessions({ onCompare }: { onCompare: (a: AdminSession, b: AdminSession) => void }) {
  const key = useAdminKey();
  const sessions = useAdminQuery<AdminSession[]>("sessions", { limit: "20" });
  const [expanded, setExpanded] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [expiring, setExpiring] = useState<Set<string>>(new Set());

  const forceExpire = async (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Force-expire this session?")) return;
    setExpiring((prev) => new Set(prev).add(sessionId));
    try {
      const res = await fetch("/api/admin/data", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-admin-key": key },
        body: JSON.stringify({ type: "force-expire", sessionId }),
      });
      if (res.ok && sessions) {
        const s = sessions.find((s) => s._id === sessionId);
        if (s) s.status = "expired";
      }
    } catch {
      // silent
    } finally {
      setExpiring((prev) => {
        const next = new Set(prev);
        next.delete(sessionId);
        return next;
      });
    }
  };

  if (!sessions) return <p style={{ color: DIM, fontSize: 14 }}>Loading sessions...</p>;
  if (sessions.length === 0) return <p style={{ color: DIM, fontSize: 14 }}>No sessions yet.</p>;

  const toggleSelect = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else if (next.size < 2) {
        next.add(id);
      }
      return next;
    });
  };

  const selectedArr = Array.from(selected);

  return (
    <>
      {selectedArr.length === 2 && (
        <div style={{ marginBottom: 12, display: "flex", alignItems: "center", gap: 12 }}>
          <button
            className="btn-heat"
            style={{ padding: "6px 16px", borderRadius: 8, fontSize: 13 }}
            onClick={() => {
              const a = sessions.find((s) => s._id === selectedArr[0]);
              const b = sessions.find((s) => s._id === selectedArr[1]);
              if (a && b) onCompare(a, b);
            }}
          >
            Compare Selected
          </button>
          <button
            className="btn-ghost"
            style={{ padding: "6px 12px", borderRadius: 8, fontSize: 13 }}
            onClick={() => setSelected(new Set())}
          >
            Clear
          </button>
        </div>
      )}
      <div className="card-surface" style={{ borderRadius: 10, overflow: "hidden" }}>
        <table style={{ width: "100%", fontSize: 13, lineHeight: "20px", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: `1px solid ${BORDER}` }}>
              {["", "Player", "Status", "Score", "Orch.", "Solved", "Wrong", "API", "Time Limit"].map((h) => (
                <th
                  key={h || "check"}
                  style={{
                    padding: h === "" ? "10px 6px 10px 14px" : "10px 14px",
                    fontWeight: 450,
                    color: DIM,
                    textAlign: h === "Player" || h === "" ? "left" : "right",
                    whiteSpace: "nowrap",
                    width: h === "" ? 28 : undefined,
                  }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
            {sessions.map((s, i) => {
              const isExpanded = expanded === s._id;
              const isSelected = selected.has(s._id);
              const duration = s.expiresAt - s.startedAt;

              return (
                <tbody key={s._id}>
                  <tr
                    style={{
                      borderTop: i > 0 ? `1px solid ${BORDER}` : undefined,
                      cursor: "pointer",
                      background: isSelected
                        ? "rgba(59, 130, 246, 0.04)"
                        : isExpanded
                          ? "rgba(250, 93, 25, 0.03)"
                          : undefined,
                    }}
                    onClick={() => setExpanded(isExpanded ? null : s._id)}
                  >
                    <td style={{ padding: "10px 6px 10px 14px", width: 28 }}>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => {}}
                        onClick={(e) => toggleSelect(s._id, e)}
                        style={{ cursor: "pointer", accentColor: ACCENT }}
                        disabled={!isSelected && selected.size >= 2}
                      />
                    </td>
                    <td style={{ padding: "10px 14px", fontWeight: 450 }}>{s.github}</td>
                    <td style={{ padding: "10px 14px", textAlign: "right", whiteSpace: "nowrap" }}>
                      <span
                        style={{
                          fontSize: 11,
                          padding: "2px 8px",
                          borderRadius: 4,
                          fontWeight: 500,
                          background:
                            s.status === "completed"
                              ? "rgba(22, 163, 74, 0.08)"
                              : s.status === "active"
                                ? "rgba(59, 130, 246, 0.08)"
                                : "rgba(38, 38, 38, 0.06)",
                          color:
                            s.status === "completed"
                              ? "#16a34a"
                              : s.status === "active"
                                ? "#3b82f6"
                                : DIM,
                        }}
                      >
                        {s.status}
                      </span>
                      {s.status === "active" && (
                        <button
                          onClick={(e) => forceExpire(s._id, e)}
                          disabled={expiring.has(s._id)}
                          style={{
                            marginLeft: 6,
                            fontSize: 10,
                            padding: "2px 7px",
                            borderRadius: 4,
                            border: "1px solid rgba(220, 38, 38, 0.2)",
                            background: "rgba(220, 38, 38, 0.06)",
                            color: "#dc2626",
                            cursor: expiring.has(s._id) ? "wait" : "pointer",
                            fontWeight: 600,
                            opacity: expiring.has(s._id) ? 0.5 : 1,
                          }}
                        >
                          End
                        </button>
                      )}
                    </td>
                    <td
                      style={{
                        padding: "10px 14px",
                        textAlign: "right",
                        fontFamily: "var(--font-geist-mono), monospace",
                        fontWeight: 500,
                      }}
                    >
                      {s.score != null ? `${s.score.toFixed(1)}%` : "—"}
                    </td>
                    <td
                      style={{
                        padding: "10px 14px",
                        textAlign: "right",
                        fontFamily: "var(--font-geist-mono), monospace",
                        color: s.orchestrationScore != null ? rateColor(s.orchestrationScore) : DIM,
                      }}
                    >
                      {s.orchestrationScore != null ? s.orchestrationScore : "—"}
                    </td>
                    <td
                      style={{
                        padding: "10px 14px",
                        textAlign: "right",
                        fontFamily: "var(--font-geist-mono), monospace",
                      }}
                    >
                      {s.solvedChallenges.length}
                    </td>
                    <td
                      style={{
                        padding: "10px 14px",
                        textAlign: "right",
                        fontFamily: "var(--font-geist-mono), monospace",
                        color: DIM,
                      }}
                    >
                      {s.wrongAttempts}
                    </td>
                    <td
                      style={{
                        padding: "10px 14px",
                        textAlign: "right",
                        fontFamily: "var(--font-geist-mono), monospace",
                        color: DIM,
                      }}
                    >
                      {s.apiCalls}
                    </td>
                    <td
                      style={{
                        padding: "10px 14px",
                        textAlign: "right",
                        fontFamily: "var(--font-geist-mono), monospace",
                        color: DIM,
                      }}
                    >
                      {formatMs(duration)}
                    </td>
                  </tr>
                  {isExpanded && (
                    <tr>
                      <td colSpan={9} style={{ padding: 0 }}>
                        {s.orchestrationMetrics && (
                          <div
                            style={{
                              padding: "12px 14px",
                              borderTop: `1px solid ${BORDER}`,
                              display: "flex",
                              gap: 24,
                              fontSize: 12,
                            }}
                          >
                            <span style={{ color: DIM }}>
                              Parallelization:{" "}
                              <strong style={{ color: "#262626" }}>
                                {(s.orchestrationMetrics.parallelizationScore * 100).toFixed(0)}%
                              </strong>
                            </span>
                            <span style={{ color: DIM }}>
                              DAG Efficiency:{" "}
                              <strong style={{ color: "#262626" }}>
                                {(s.orchestrationMetrics.dagEfficiency * 100).toFixed(0)}%
                              </strong>
                            </span>
                            <span style={{ color: DIM }}>
                              Critical Path:{" "}
                              <strong style={{ color: "#262626" }}>
                                {(s.orchestrationMetrics.criticalPathSpeed * 100).toFixed(0)}%
                              </strong>
                            </span>
                            <span style={{ color: DIM }}>
                              Confidence:{" "}
                              <strong style={{ color: "#262626" }}>
                                {(s.orchestrationMetrics.submissionConfidence * 100).toFixed(0)}%
                              </strong>
                            </span>
                            <span style={{ color: DIM }}>
                              Recovery:{" "}
                              <strong style={{ color: "#262626" }}>
                                {s.orchestrationMetrics.failureRecoveryScore != null
                                  ? `${(s.orchestrationMetrics.failureRecoveryScore * 100).toFixed(0)}%`
                                  : "—"}
                              </strong>
                            </span>
                            <span style={{ color: DIM }}>
                              Tiers Reached:{" "}
                              <strong style={{ color: "#262626" }}>
                                {s.orchestrationMetrics.tiersReached}
                              </strong>
                            </span>
                          </div>
                        )}
                        <SessionExpandedContent sessionId={s._id} startedAt={s.startedAt} durationMs={duration} />
                      </td>
                    </tr>
                  )}
                </tbody>
              );
            })}
        </table>
      </div>
    </>
  );
}

const COMPARE_BLUE = "#3b82f6";
const COMPARE_ORANGE = "#f59e0b";

function CompareMetricRow({ label, a, b, lowerIsBetter }: {
  label: string;
  a: string | number;
  b: string | number;
  lowerIsBetter?: boolean;
}) {
  const numA = typeof a === "number" ? a : parseFloat(a);
  const numB = typeof b === "number" ? b : parseFloat(b);
  const aWins = lowerIsBetter ? numA < numB : numA > numB;
  const bWins = lowerIsBetter ? numB < numA : numB > numA;

  return (
    <div style={{ display: "flex", alignItems: "center", padding: "6px 0", fontSize: 13 }}>
      <span
        style={{
          width: 80,
          textAlign: "right",
          fontFamily: "var(--font-geist-mono), monospace",
          fontWeight: aWins ? 600 : 400,
          color: aWins ? COMPARE_BLUE : DIM,
        }}
      >
        {typeof a === "number" ? a.toFixed(1) : a}
      </span>
      <span style={{ flex: 1, textAlign: "center", color: DIM, fontSize: 11 }}>{label}</span>
      <span
        style={{
          width: 80,
          textAlign: "left",
          fontFamily: "var(--font-geist-mono), monospace",
          fontWeight: bWins ? 600 : 400,
          color: bWins ? COMPARE_ORANGE : DIM,
        }}
      >
        {typeof b === "number" ? b.toFixed(1) : b}
      </span>
    </div>
  );
}

function CompareView({ sessionA, sessionB, onBack }: {
  sessionA: AdminSession;
  sessionB: AdminSession;
  onBack: () => void;
}) {
  const eventsA = useAdminQuery<SessionEvent[]>("timeline", { sessionId: sessionA._id });
  const eventsB = useAdminQuery<SessionEvent[]>("timeline", { sessionId: sessionB._id });

  if (!eventsA || !eventsB) {
    return <p style={{ color: DIM, fontSize: 14 }}>Loading comparison...</p>;
  }

  const durationA = sessionA.expiresAt - sessionA.startedAt;
  const durationB = sessionB.expiresAt - sessionB.startedAt;
  const maxDuration = Math.max(durationA, durationB);

  const metricsA = sessionA.orchestrationMetrics;
  const metricsB = sessionB.orchestrationMetrics;

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
        <h2 style={{ fontSize: 18, fontWeight: 500, color: "#262626", margin: 0 }}>
          <span style={{ color: COMPARE_BLUE }}>{sessionA.github}</span>
          {" vs "}
          <span style={{ color: COMPARE_ORANGE }}>{sessionB.github}</span>
        </h2>
        <button
          className="btn-ghost"
          style={{ padding: "6px 14px", borderRadius: 8, fontSize: 13 }}
          onClick={onBack}
        >
          Back to list
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 280px", gap: 20 }}>
        {/* Overlaid Gantt chart */}
        <div className="card-surface" style={{ borderRadius: 10, overflow: "hidden" }}>
          <OverlayGanttChart
            eventsA={eventsA}
            eventsB={eventsB}
            startedAtA={sessionA.startedAt}
            startedAtB={sessionB.startedAt}
            durationMsA={durationA}
            durationMsB={durationB}
            labelA={sessionA.github}
            labelB={sessionB.github}
            colorA={COMPARE_BLUE}
            colorB={COMPARE_ORANGE}
          />
        </div>

        <div className="card-surface" style={{ borderRadius: 10, padding: 20 }}>
          <div style={{ fontSize: 12, fontWeight: 500, color: DIM, marginBottom: 12 }}>
            Comparison
          </div>
          <CompareMetricRow label="Score" a={sessionA.score ?? 0} b={sessionB.score ?? 0} />
          <CompareMetricRow label="Completion" a={`${sessionA.solvedChallenges.length}`} b={`${sessionB.solvedChallenges.length}`} />
          <CompareMetricRow label="Wrong" a={sessionA.wrongAttempts} b={sessionB.wrongAttempts} lowerIsBetter />
          <CompareMetricRow label="API Calls" a={sessionA.apiCalls} b={sessionB.apiCalls} lowerIsBetter />
          <CompareMetricRow
            label="Orch."
            a={sessionA.orchestrationScore ?? 0}
            b={sessionB.orchestrationScore ?? 0}
          />

          {metricsA && metricsB && (
            <>
              <div style={{ borderTop: `1px solid ${BORDER}`, margin: "12px 0", fontSize: 11, color: DIM, paddingTop: 8 }}>
                Orchestration Breakdown
              </div>
              <CompareMetricRow
                label="Parallel"
                a={(metricsA.parallelizationScore * 100)}
                b={(metricsB.parallelizationScore * 100)}
              />
              <CompareMetricRow
                label="DAG Eff."
                a={(metricsA.dagEfficiency * 100)}
                b={(metricsB.dagEfficiency * 100)}
              />
              <CompareMetricRow
                label="Crit. Path"
                a={(metricsA.criticalPathSpeed * 100)}
                b={(metricsB.criticalPathSpeed * 100)}
              />
              <CompareMetricRow
                label="Confidence"
                a={(metricsA.submissionConfidence * 100)}
                b={(metricsB.submissionConfidence * 100)}
              />

              <div style={{ marginTop: 16, display: "flex", justifyContent: "center" }}>
                <OrchestrationRadar
                  metrics={metricsA}
                  secondaryMetrics={metricsB}
                  primaryColor={COMPARE_BLUE}
                  secondaryColor={COMPARE_ORANGE}
                  size={200}
                />
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function useAdminAuth(): { authorized: boolean; loading: boolean; reason?: string } {
  const key = useAdminKey();
  const [state, setState] = useState<{ authorized: boolean; loading: boolean; reason?: string }>({
    authorized: false,
    loading: true,
  });

  useEffect(() => {
    fetch("/api/admin/auth", {
      headers: { "x-admin-key": key },
    })
      .then((r) => r.json())
      .then((data) => {
        setState({
          authorized: data.authorized,
          loading: false,
          reason: data.reason,
        });
      })
      .catch(() => {
        setState({ authorized: false, loading: false, reason: "Auth check failed." });
      });
  }, [key]);

  return state;
}

// ─── Page (Suspense wrapper for useSearchParams) ─────────────
export default function AdminPage() {
  return (
    <Suspense
      fallback={
        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "60vh" }}>
          <p style={{ color: DIM, fontSize: 14 }}>Loading...</p>
        </div>
      }
    >
      <AdminContent />
    </Suspense>
  );
}

function DemoLauncher() {
  const key = useAdminKey();
  const [launching, setLaunching] = useState(false);
  const [result, setResult] = useState<{ sessionId: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const launch = async () => {
    setLaunching(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/admin/data", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-admin-key": key },
        body: JSON.stringify({ type: "start-demo" }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || "Failed to launch demo");
      }
      const data = await res.json();
      setResult(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to launch demo");
    } finally {
      setLaunching(false);
    }
  };

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 12 }}>
      <button
        onClick={launch}
        disabled={launching}
        className="btn-heat btn-sm"
        style={{ fontSize: 13 }}
      >
        {launching ? "Launching..." : "Start Demo Session"}
      </button>
      {result && (
        <Link
          href={`/spectate/${result.sessionId}`}
          target="_blank"
          style={{ fontSize: 12, color: ACCENT, textDecoration: "none", fontWeight: 500 }}
        >
          Watch demo &rarr;
        </Link>
      )}
      {error && <span style={{ fontSize: 12, color: "#dc2626" }}>{error}</span>}
    </div>
  );
}

function AdminContent() {
  const { authorized, loading, reason } = useAdminAuth();
  const searchParams = useSearchParams();
  const [compareSessions, setCompareSessions] = useState<{ a: AdminSession; b: AdminSession } | null>(null);

  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "60vh" }}>
        <p style={{ color: DIM, fontSize: 14 }}>Loading...</p>
      </div>
    );
  }

  if (!authorized) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "60vh" }}>
        <p style={{ color: DIM, fontSize: 14 }}>{reason}</p>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: "48px 24px 120px" }}>
      <div style={{ marginBottom: 40 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
          <Link
            href="/"
            style={{
              fontSize: 13,
              color: DIM,
              textDecoration: "none",
            }}
          >
            &larr; Back
          </Link>
        </div>
        <h1
          style={{
            fontSize: 28,
            fontWeight: 500,
            letterSpacing: "-0.28px",
            color: "#262626",
          }}
        >
          <span style={{ color: ACCENT }}>Admin</span> Dashboard
        </h1>
        <p style={{ fontSize: 14, color: DIM, marginTop: 4 }}>
          Session analytics, challenge difficulty, and orchestration telemetry.
        </p>
        <DemoLauncher />
      </div>

      {compareSessions ? (
        <CompareView
          sessionA={compareSessions.a}
          sessionB={compareSessions.b}
          onBack={() => setCompareSessions(null)}
        />
      ) : (
        <>
          <section style={{ marginBottom: 40 }}>
            <h2 style={{ fontSize: 16, fontWeight: 450, color: "#262626", marginBottom: 16 }}>Overview</h2>
            <OverviewCards />
          </section>

          <section style={{ marginBottom: 40 }}>
            <h2 style={{ fontSize: 16, fontWeight: 450, color: "#262626", marginBottom: 16 }}>
              Challenge Analytics
            </h2>
            <ChallengeAnalytics />
          </section>

          <section style={{ marginBottom: 40 }}>
            <h2 style={{ fontSize: 16, fontWeight: 450, color: "#262626", marginBottom: 16 }}>
              Leaderboard
              <span style={{ fontSize: 12, color: DIM, fontWeight: 400, marginLeft: 8 }}>
                toggle visibility on the public board
              </span>
            </h2>
            <LeaderboardManagement />
          </section>

          <section>
            <h2 style={{ fontSize: 16, fontWeight: 450, color: "#262626", marginBottom: 16 }}>
              Recent Sessions
              <span style={{ fontSize: 12, color: DIM, fontWeight: 400, marginLeft: 8 }}>
                click to expand · check 2 to compare
              </span>
            </h2>
            <RecentSessions onCompare={(a, b) => setCompareSessions({ a, b })} />
          </section>
        </>
      )}
    </div>
  );
}
