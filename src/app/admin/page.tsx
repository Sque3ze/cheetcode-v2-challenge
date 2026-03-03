"use client";

import { Suspense, useState, useEffect, useRef, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import type { Id } from "../../../convex/_generated/dataModel";
import type { SessionEvent } from "../../lib/orchestration-metrics";
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

// ─── Gantt Chart Types & Constants ──────────────────────────
interface GanttRow {
  challengeId: string;
  label: string;
  tier: number;
  startMs: number;
  endMs: number;
  result: "solved" | "wrong" | "locked" | "none";
  interactions: number[];
  submissions: number[];
}

interface GanttTierGroup {
  tier: number;
  rows: GanttRow[];
}

const GANTT = {
  LABEL_WIDTH: 180,
  ROW_HEIGHT: 26,
  BAR_HEIGHT: 14,
  TIER_GAP: 8,
  TIER_HEADER_HEIGHT: 20,
  AXIS_HEIGHT: 28,
  DOT_RADIUS: 3,
  TICK_INTERVAL_S: 30,
} as const;

const GANTT_COLORS: Record<string, string> = {
  solved: "#16a34a",
  wrong: "#dc2626",
  locked: "#dc2626",
  none: "rgba(38,38,38,0.12)",
};

function buildGanttData(events: SessionEvent[], startedAt: number): GanttTierGroup[] {
  const challengeMap = new Map<string, {
    firstView: number;
    lastEvent: number;
    lastSubmit: number | null;
    result: "solved" | "wrong" | "locked" | "none";
    interactions: number[];
    submissions: number[];
    tier: number;
  }>();

  for (const e of events) {
    if (!e.challengeId) continue;
    let entry = challengeMap.get(e.challengeId);
    if (!entry) {
      let tier = 0;
      const tierVal = e.metadata?.tier;
      if (typeof tierVal === "number") {
        tier = tierVal;
      } else {
        const m = e.challengeId.match(/^tier(\d)/);
        if (m) tier = parseInt(m[1]);
      }
      entry = {
        firstView: e.timestamp, lastEvent: e.timestamp, lastSubmit: null,
        result: "none", interactions: [], submissions: [], tier,
      };
      challengeMap.set(e.challengeId, entry);
    }

    const metaTier = e.metadata?.tier;
    if (e.type === "challenge_viewed" && typeof metaTier === "number") {
      entry.tier = metaTier;
    }
    if (e.type === "challenge_viewed" && e.timestamp < entry.firstView) {
      entry.firstView = e.timestamp;
    }
    entry.lastEvent = Math.max(entry.lastEvent, e.timestamp);
    if (e.type === "answer_submitted") {
      entry.lastSubmit = Math.max(entry.lastSubmit ?? 0, e.timestamp);
      entry.submissions.push(e.timestamp);
    }
    if (e.type === "challenge_interacted") {
      entry.interactions.push(e.timestamp);
    }
    if (e.type === "answer_correct") {
      entry.result = "solved";
    } else if (e.type === "challenge_locked" && entry.result !== "solved") {
      entry.result = "locked";
    } else if (e.type === "answer_wrong" && entry.result !== "solved" && entry.result !== "locked") {
      entry.result = "wrong";
    }
  }

  const rows: GanttRow[] = [];
  for (const [challengeId, data] of challengeMap) {
    const startMs = Math.max(0, data.firstView - startedAt);
    const endMs = Math.max(startMs, (data.lastSubmit ?? data.lastEvent) - startedAt);
    const label = challengeId
      .replace(/^tier\d-/, "")
      .split("-")
      .map(w => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ");
    rows.push({
      challengeId, label, tier: data.tier, startMs, endMs, result: data.result,
      interactions: data.interactions.map(t => Math.max(0, t - startedAt)),
      submissions: data.submissions.map(t => Math.max(0, t - startedAt)),
    });
  }

  const tierMap = new Map<number, GanttRow[]>();
  for (const row of rows) {
    const arr = tierMap.get(row.tier) || [];
    arr.push(row);
    tierMap.set(row.tier, arr);
  }

  return [...tierMap.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([tier, tierRows]) => {
      tierRows.sort((a, b) => a.startMs - b.startMs);
      return { tier, rows: tierRows };
    });
}

function SessionGantt({ events, startedAt, durationMs }: {
  events: SessionEvent[];
  startedAt: number;
  durationMs: number;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);
  const [tooltip, setTooltip] = useState<{ x: number; y: number; row: GanttRow } | null>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const obs = new ResizeObserver(entries => {
      for (const entry of entries) setContainerWidth(entry.contentRect.width);
    });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const groups = useMemo(() => buildGanttData(events, startedAt), [events, startedAt]);

  const wrongCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const e of events) {
      if (e.type === "answer_wrong" && e.challengeId) {
        counts.set(e.challengeId, (counts.get(e.challengeId) || 0) + 1);
      }
    }
    return counts;
  }, [events]);

  if (groups.length === 0) return null;

  const totalRows = groups.reduce((sum, g) => sum + g.rows.length, 0);
  const totalHeight =
    GANTT.AXIS_HEIGHT +
    groups.length * (GANTT.TIER_HEADER_HEIGHT + GANTT.TIER_GAP) +
    totalRows * GANTT.ROW_HEIGHT +
    8;
  const chartWidth = Math.max(0, containerWidth - GANTT.LABEL_WIDTH);
  const timeScale = chartWidth > 0 && durationMs > 0 ? chartWidth / durationMs : 0;

  const tickIntervalMs = GANTT.TICK_INTERVAL_S * 1000;
  const ticks: number[] = [];
  for (let t = 0; t <= durationMs; t += tickIntervalMs) ticks.push(t);

  let currentY = GANTT.AXIS_HEIGHT;
  const tierPositions: Array<{
    tier: number;
    headerY: number;
    rows: Array<{ row: GanttRow; y: number }>;
  }> = [];
  for (const group of groups) {
    const headerY = currentY;
    currentY += GANTT.TIER_HEADER_HEIGHT;
    const groupRows: Array<{ row: GanttRow; y: number }> = [];
    for (const row of group.rows) {
      groupRows.push({ row, y: currentY });
      currentY += GANTT.ROW_HEIGHT;
    }
    tierPositions.push({ tier: group.tier, headerY, rows: groupRows });
    currentY += GANTT.TIER_GAP;
  }

  return (
    <div style={{ padding: "12px 14px", borderTop: `1px solid ${BORDER}`, background: "rgba(0,0,0,0.015)" }}>
      <div style={{ fontSize: 11, fontWeight: 500, color: DIM, marginBottom: 8 }}>Session Gantt</div>
      <div ref={containerRef} style={{ position: "relative" }}>
        {containerWidth > 0 && (
          <svg
            width={containerWidth}
            height={totalHeight}
            style={{ display: "block", fontFamily: "var(--font-geist-mono), monospace" }}
          >
            {/* Gridlines */}
            {ticks.map(t => (
              <line
                key={t}
                x1={GANTT.LABEL_WIDTH + t * timeScale}
                y1={GANTT.AXIS_HEIGHT - 4}
                x2={GANTT.LABEL_WIDTH + t * timeScale}
                y2={totalHeight}
                stroke={BORDER}
                strokeDasharray="4 3"
              />
            ))}
            {/* Time axis labels */}
            {ticks.map(t => (
              <text
                key={`t-${t}`}
                x={GANTT.LABEL_WIDTH + t * timeScale}
                y={GANTT.AXIS_HEIGHT - 10}
                textAnchor="middle"
                fontSize={10}
                fill={DIM}
              >
                {`${Math.floor(t / 60000)}:${String(Math.floor((t % 60000) / 1000)).padStart(2, "0")}`}
              </text>
            ))}
            {/* Tier groups */}
            {tierPositions.map(({ tier, headerY, rows: posRows }) => (
              <g key={tier}>
                <text x={8} y={headerY + 14} fontSize={11} fontWeight={600} fill={ACCENT}>
                  Tier {tier}
                </text>
                {posRows.map(({ row, y: rowY }) => {
                  const barX = GANTT.LABEL_WIDTH + row.startMs * timeScale;
                  const barW = Math.max(4, (row.endMs - row.startMs) * timeScale);
                  const barY = rowY + (GANTT.ROW_HEIGHT - GANTT.BAR_HEIGHT) / 2;
                  const color = GANTT_COLORS[row.result] || GANTT_COLORS.none;
                  return (
                    <g key={row.challengeId}>
                      {/* Label */}
                      <text
                        x={GANTT.LABEL_WIDTH - 8}
                        y={rowY + GANTT.ROW_HEIGHT / 2 + 4}
                        textAnchor="end"
                        fontSize={11}
                        fill="#262626"
                      >
                        {row.label}
                      </text>
                      {/* Bar */}
                      <rect
                        x={barX}
                        y={barY}
                        width={barW}
                        height={GANTT.BAR_HEIGHT}
                        rx={3}
                        fill={color}
                        opacity={row.result === "none" ? 0.4 : 0.85}
                      />
                      {/* Interaction dots */}
                      {row.interactions.map((t, idx) => {
                        const cx = GANTT.LABEL_WIDTH + t * timeScale;
                        if (cx < barX - 1 || cx > barX + barW + 1) return null;
                        return (
                          <circle
                            key={idx}
                            cx={cx}
                            cy={barY + GANTT.BAR_HEIGHT / 2}
                            r={GANTT.DOT_RADIUS}
                            fill="white"
                            stroke={row.result === "none" ? "#666" : color}
                            strokeWidth={1.5}
                          />
                        );
                      })}
                      {/* Submission markers */}
                      {row.submissions.map((t, idx) => (
                        <rect
                          key={`s${idx}`}
                          x={GANTT.LABEL_WIDTH + t * timeScale - 1.5}
                          y={barY - 1}
                          width={3}
                          height={GANTT.BAR_HEIGHT + 2}
                          fill={GANTT_COLORS[row.result === "solved" ? "solved" : "wrong"]}
                          opacity={0.9}
                          rx={1}
                        />
                      ))}
                      {/* Hover target */}
                      <rect
                        x={0}
                        y={rowY}
                        width={containerWidth}
                        height={GANTT.ROW_HEIGHT}
                        fill="transparent"
                        style={{ cursor: "pointer" }}
                        onMouseEnter={() => setTooltip({ x: barX, y: rowY + GANTT.ROW_HEIGHT, row })}
                        onMouseLeave={() => setTooltip(null)}
                      />
                    </g>
                  );
                })}
              </g>
            ))}
          </svg>
        )}
        {/* Tooltip */}
        {tooltip && (
          <div
            style={{
              position: "absolute",
              left: Math.min(tooltip.x, containerWidth - 220),
              top: tooltip.y + 4,
              background: "#262626",
              color: "white",
              padding: "8px 12px",
              borderRadius: 6,
              fontSize: 11,
              fontFamily: "var(--font-geist-mono), monospace",
              lineHeight: 1.6,
              pointerEvents: "none",
              zIndex: 10,
              minWidth: 180,
              boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
            }}
          >
            <div style={{ fontWeight: 600, marginBottom: 2 }}>{tooltip.row.label}</div>
            <div style={{ color: "rgba(255,255,255,0.7)" }}>
              {formatTime(startedAt + tooltip.row.startMs, startedAt)} →{" "}
              {formatTime(startedAt + tooltip.row.endMs, startedAt)}{" "}
              ({formatMs(tooltip.row.endMs - tooltip.row.startMs)})
            </div>
            <div
              style={{
                color: tooltip.row.result === "none"
                  ? "rgba(255,255,255,0.5)"
                  : GANTT_COLORS[tooltip.row.result],
              }}
            >
              {tooltip.row.result === "solved"
                ? "Solved"
                : tooltip.row.result === "wrong"
                  ? `Wrong (${wrongCounts.get(tooltip.row.challengeId) || 0} attempts)`
                  : tooltip.row.result === "locked"
                    ? "Locked"
                    : "No submission"}
            </div>
            <div style={{ color: "rgba(255,255,255,0.5)" }}>
              {tooltip.row.interactions.length} interaction
              {tooltip.row.interactions.length !== 1 ? "s" : ""}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

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
      <SessionGantt events={events} startedAt={startedAt} durationMs={durationMs} />
      <SessionTimeline events={events} startedAt={startedAt} />
    </>
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
      failureRecoveryScore?: number;
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
