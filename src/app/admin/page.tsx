"use client";

import { Suspense, useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import type { Id } from "../../../convex/_generated/dataModel";
import { classifyAgent } from "../../lib/agent-detection";

// ─── Authenticated fetch hook (proxies through /api/admin/data) ──
type AdminQueryType = "overview" | "challenges" | "sessions" | "timeline";

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

// ─── Color helpers ───────────────────────────────────────────
const ACCENT = "#fa5d19";
const DIM = "rgba(38, 38, 38, 0.4)";
const BORDER = "#f0f0f0";

function rateColor(rate: number): string {
  if (rate >= 70) return "#16a34a";
  if (rate >= 40) return "#ca8a04";
  return "#dc2626";
}

function formatMs(ms: number): string {
  const secs = ms / 1000;
  if (secs < 60) return `${secs.toFixed(1)}s`;
  return `${Math.floor(secs / 60)}m ${Math.round(secs % 60)}s`;
}

function formatTime(ts: number, baseTs?: number): string {
  const offset = baseTs ? (ts - baseTs) / 1000 : ts / 1000;
  const mins = Math.floor(offset / 60);
  const secs = Math.floor(offset % 60);
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

const EVENT_COLORS: Record<string, string> = {
  session_started: "#6366f1",
  challenge_viewed: "#3b82f6",
  challenge_interacted: "#8b5cf6",
  answer_submitted: "#f59e0b",
  answer_correct: "#16a34a",
  answer_wrong: "#dc2626",
  challenge_locked: "#991b1b",
  session_completed: "#6366f1",
};

// ─── Overview Cards ──────────────────────────────────────────
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

  const agentLabel = stats.topUserAgent
    ? classifyAgent(stats.topUserAgent).tool
    : "Unknown";

  const cards = [
    { label: "Total Sessions", value: stats.totalSessions },
    { label: "Completed", value: stats.completedSessions },
    { label: "Unique Players", value: stats.uniquePlayers },
    { label: "Avg Score", value: `${stats.avgScore}%` },
    { label: "Top Tool", value: agentLabel },
  ];

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 12 }}>
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

// ─── Challenge Analytics Table ───────────────────────────────
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

// ─── Session Timeline ────────────────────────────────────────
function SessionTimeline({ sessionId, startedAt }: { sessionId: Id<"sessions">; startedAt: number }) {
  const events = useAdminQuery<Array<{
    type: string;
    challengeId?: string;
    timestamp: number;
    metadata?: Record<string, unknown>;
  }>>("timeline", { sessionId });

  if (!events) return <p style={{ color: DIM, fontSize: 12, padding: "8px 14px" }}>Loading timeline...</p>;
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

// ─── Recent Sessions ─────────────────────────────────────────
function RecentSessions() {
  const sessions = useAdminQuery<Array<{
    _id: Id<"sessions">;
    github: string;
    startedAt: number;
    expiresAt: number;
    status: string;
    userAgent?: string;
    apiCalls: number;
    solvedChallenges: string[];
    wrongAttempts: number;
    score: number | null;
    orchestrationScore: number | null;
    orchestrationMetrics: {
      parallelizationScore: number;
      dagEfficiency: number;
      criticalPathSpeed: number;
      submissionConfidence: number;
      tiersReached: number;
    } | null;
  }>>("sessions", { limit: "20" });
  const [expanded, setExpanded] = useState<string | null>(null);

  if (!sessions) return <p style={{ color: DIM, fontSize: 14 }}>Loading sessions...</p>;
  if (sessions.length === 0) return <p style={{ color: DIM, fontSize: 14 }}>No sessions yet.</p>;

  return (
    <div className="card-surface" style={{ borderRadius: 10, overflow: "hidden" }}>
      <table style={{ width: "100%", fontSize: 13, lineHeight: "20px", borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ borderBottom: `1px solid ${BORDER}` }}>
            {["Player", "Status", "Score", "Orch.", "Solved", "Wrong", "API", "Tool", "Duration"].map((h) => (
              <th
                key={h}
                style={{
                  padding: "10px 14px",
                  fontWeight: 450,
                  color: DIM,
                  textAlign: h === "Player" || h === "Tool" ? "left" : "right",
                  whiteSpace: "nowrap",
                }}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
          {sessions.map((s, i) => {
            const isExpanded = expanded === s._id;
            // eslint-disable-next-line react-hooks/purity -- Date.now() is intentional for active session duration
            const duration = (s.status === "active" ? Date.now() : s.expiresAt) - s.startedAt;
            const agentTool = s.userAgent ? classifyAgent(s.userAgent).tool : "—";

            return (
              <tbody key={s._id}>
                <tr
                  style={{
                    borderTop: i > 0 ? `1px solid ${BORDER}` : undefined,
                    cursor: "pointer",
                    background: isExpanded ? "rgba(250, 93, 25, 0.03)" : undefined,
                  }}
                  onClick={() => setExpanded(isExpanded ? null : s._id)}
                >
                  <td style={{ padding: "10px 14px", fontWeight: 450 }}>{s.github}</td>
                  <td style={{ padding: "10px 14px", textAlign: "right" }}>
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
                  <td style={{ padding: "10px 14px", color: DIM, fontSize: 12 }}>{agentTool}</td>
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
                      {/* Orchestration metrics breakdown */}
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
                            Tiers Reached:{" "}
                            <strong style={{ color: "#262626" }}>
                              {s.orchestrationMetrics.tiersReached}
                            </strong>
                          </span>
                        </div>
                      )}
                      <SessionTimeline sessionId={s._id} startedAt={s.startedAt} />
                    </td>
                  </tr>
                )}
              </tbody>
            );
          })}
      </table>
    </div>
  );
}

// ─── Auth Gate (server-side check) ───────────────────────────
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

function AdminContent() {
  const { authorized, loading, reason } = useAdminAuth();

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
      {/* Header */}
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
      </div>

      {/* Overview */}
      <section style={{ marginBottom: 40 }}>
        <h2 style={{ fontSize: 16, fontWeight: 450, color: "#262626", marginBottom: 16 }}>Overview</h2>
        <OverviewCards />
      </section>

      {/* Challenge Analytics */}
      <section style={{ marginBottom: 40 }}>
        <h2 style={{ fontSize: 16, fontWeight: 450, color: "#262626", marginBottom: 16 }}>
          Challenge Analytics
        </h2>
        <ChallengeAnalytics />
      </section>

      {/* Recent Sessions */}
      <section>
        <h2 style={{ fontSize: 16, fontWeight: 450, color: "#262626", marginBottom: 16 }}>
          Recent Sessions
          <span style={{ fontSize: 12, color: DIM, fontWeight: 400, marginLeft: 8 }}>
            click to expand timeline
          </span>
        </h2>
        <RecentSessions />
      </section>
    </div>
  );
}
