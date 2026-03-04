"use client";

import { useRef, useState, useEffect, useMemo } from "react";
import type { SessionEvent } from "../../lib/orchestration-metrics";
import {
  ACCENT,
  DIM,
  BORDER,
  GANTT,
  GANTT_COLORS,
  buildGanttData,
  buildWrongCounts,
  formatMs,
  formatTime,
  type GanttRow,
} from "./formatters";

interface SessionGanttChartProps {
  events: SessionEvent[];
  startedAt: number;
  durationMs: number;
  /** Override bar colors for head-to-head mode */
  accentColor?: string;
  /** Reduce padding/fonts for stacked layout */
  compact?: boolean;
  /** Override axis length for shared time axis */
  maxDurationMs?: number;
  /** Header label override */
  label?: string;
  /** Show a pulsing "now" marker for live sessions */
  live?: boolean;
}

export function SessionGanttChart({
  events,
  startedAt,
  durationMs,
  accentColor,
  compact,
  maxDurationMs,
  label,
  live,
}: SessionGanttChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);
  const [tooltip, setTooltip] = useState<{ x: number; y: number; row: GanttRow } | null>(null);
  // eslint-disable-next-line react-hooks/purity -- Date.now() is intentional for live "now" marker
  const [nowMs, setNowMs] = useState(Date.now());

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const obs = new ResizeObserver((entries) => {
      for (const entry of entries) setContainerWidth(entry.contentRect.width);
    });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    if (!live) return;
    const interval = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [live]);

  const groups = useMemo(() => buildGanttData(events, startedAt), [events, startedAt]);

  const wrongCounts = useMemo(() => buildWrongCounts(events), [events]);

  if (groups.length === 0) return null;

  const rowHeight = compact ? 22 : GANTT.ROW_HEIGHT;
  const barHeight = compact ? 11 : GANTT.BAR_HEIGHT;
  const tierHeaderHeight = compact ? 16 : GANTT.TIER_HEADER_HEIGHT;
  const axisHeight = compact ? 22 : GANTT.AXIS_HEIGHT;
  const tierGap = compact ? 4 : GANTT.TIER_GAP;

  const totalRows = groups.reduce((sum, g) => sum + g.rows.length, 0);
  const totalHeight =
    axisHeight +
    groups.length * (tierHeaderHeight + tierGap) +
    totalRows * rowHeight +
    8;
  const chartWidth = Math.max(0, containerWidth - GANTT.LABEL_WIDTH);

  const lastEventMs = events.reduce(
    (max, e) => Math.max(max, Math.max(0, e.timestamp - startedAt)),
    0
  );
  const effectiveDuration = maxDurationMs ?? durationMs;
  const axisDuration = Math.min(
    effectiveDuration,
    Math.max(30000, Math.ceil(lastEventMs / 30000) * 30000)
  );
  const timeScale = chartWidth > 0 && axisDuration > 0 ? chartWidth / axisDuration : 0;

  const tickIntervalMs = GANTT.TICK_INTERVAL_S * 1000;
  const ticks: number[] = [];
  for (let t = 0; t <= axisDuration; t += tickIntervalMs) ticks.push(t);

  let currentY = axisHeight;
  const tierPositions: Array<{
    tier: number;
    headerY: number;
    rows: Array<{ row: GanttRow; y: number }>;
  }> = [];
  for (const group of groups) {
    const headerY = currentY;
    currentY += tierHeaderHeight;
    const groupRows: Array<{ row: GanttRow; y: number }> = [];
    for (const row of group.rows) {
      groupRows.push({ row, y: currentY });
      currentY += rowHeight;
    }
    tierPositions.push({ tier: group.tier, headerY, rows: groupRows });
    currentY += tierGap;
  }

  let qNum = 1;
  const rowLabels = new Map<string, string>();
  for (const { rows: posRows } of tierPositions) {
    for (const { row } of posRows) {
      rowLabels.set(row.challengeId, `Q${qNum}`);
      qNum++;
    }
  }

  const tierAccent = accentColor || ACCENT;

  return (
    <div
      style={{
        padding: compact ? "8px 10px" : "12px 14px",
        borderTop: `1px solid ${BORDER}`,
        background: "rgba(0,0,0,0.015)",
      }}
    >
      <div
        style={{
          fontSize: compact ? 10 : 11,
          fontWeight: 500,
          color: DIM,
          marginBottom: compact ? 4 : 8,
        }}
      >
        {label || "Session Gantt"}
      </div>
      <div ref={containerRef} style={{ position: "relative" }}>
        {containerWidth > 0 && (
          <svg
            width={containerWidth}
            height={totalHeight}
            style={{
              display: "block",
              fontFamily: "var(--font-geist-mono), monospace",
            }}
          >
            {/* Gridlines */}
            {ticks.map((t) => (
              <line
                key={t}
                x1={GANTT.LABEL_WIDTH + t * timeScale}
                y1={axisHeight - 4}
                x2={GANTT.LABEL_WIDTH + t * timeScale}
                y2={totalHeight}
                stroke={BORDER}
                strokeDasharray="4 3"
              />
            ))}
            {/* Time axis labels */}
            {ticks.map((t) => (
              <text
                key={`t-${t}`}
                x={GANTT.LABEL_WIDTH + t * timeScale}
                y={axisHeight - (compact ? 6 : 10)}
                textAnchor="middle"
                fontSize={compact ? 9 : 10}
                fill={DIM}
              >
                {`${Math.floor(t / 60000)}:${String(Math.floor((t % 60000) / 1000)).padStart(2, "0")}`}
              </text>
            ))}
            {/* Tier groups */}
            {tierPositions.map(({ tier, headerY, rows: posRows }) => (
              <g key={tier}>
                <text
                  x={8}
                  y={headerY + (compact ? 12 : 14)}
                  fontSize={compact ? 10 : 11}
                  fontWeight={600}
                  fill={tierAccent}
                >
                  T{tier}
                </text>
                {posRows.map(({ row, y: rowY }) => {
                  const barX = GANTT.LABEL_WIDTH + row.startMs * timeScale;
                  const barW = Math.max(4, (row.endMs - row.startMs) * timeScale);
                  const barY = rowY + (rowHeight - barHeight) / 2;
                  const color = accentColor || GANTT_COLORS[row.result] || GANTT_COLORS.none;
                  const barOpacity = accentColor
                    ? row.result === "solved" ? 0.85 : row.result === "none" ? 0.25 : 0.6
                    : row.result === "none" ? 0.4 : 0.85;

                  return (
                    <g key={row.challengeId}>
                      <text
                        x={GANTT.LABEL_WIDTH - 8}
                        y={rowY + rowHeight / 2 + (compact ? 3 : 4)}
                        textAnchor="end"
                        fontSize={compact ? 9 : 11}
                        fill="#262626"
                      >
                        {rowLabels.get(row.challengeId)}
                      </text>
                      <rect
                        x={barX}
                        y={barY}
                        width={barW}
                        height={barHeight}
                        rx={3}
                        fill={color}
                        opacity={barOpacity}
                      />
                      {/* Interaction dots */}
                      {row.interactions.map((t, idx) => {
                        const cx = GANTT.LABEL_WIDTH + t * timeScale;
                        if (cx < barX - 1 || cx > barX + barW + 1) return null;
                        return (
                          <circle
                            key={idx}
                            cx={cx}
                            cy={barY + barHeight / 2}
                            r={GANTT.DOT_RADIUS}
                            fill="white"
                            stroke={accentColor || (row.result === "none" ? "#666" : color)}
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
                          height={barHeight + 2}
                          fill={
                            accentColor ||
                            GANTT_COLORS[row.result === "solved" ? "solved" : "wrong"]
                          }
                          opacity={0.9}
                          rx={1}
                        />
                      ))}
                      {/* Hover target */}
                      <rect
                        x={0}
                        y={rowY}
                        width={containerWidth}
                        height={rowHeight}
                        fill="transparent"
                        style={{ cursor: "pointer" }}
                        onMouseEnter={() =>
                          setTooltip({ x: barX, y: rowY + rowHeight, row })
                        }
                        onMouseLeave={() => setTooltip(null)}
                      />
                    </g>
                  );
                })}
              </g>
            ))}

            {/* "Now" marker for live sessions */}
            {live && (() => {
              const nowOffset = Math.max(0, nowMs - startedAt);
              if (nowOffset > axisDuration) return null;
              const nowX = GANTT.LABEL_WIDTH + nowOffset * timeScale;
              return (
                <g className="gantt-now-marker">
                  <line
                    x1={nowX}
                    y1={axisHeight - 4}
                    x2={nowX}
                    y2={totalHeight}
                    stroke="#fa5d19"
                    strokeWidth={1.5}
                    strokeOpacity={0.6}
                  />
                  <circle
                    cx={nowX}
                    cy={axisHeight - 4}
                    r={3}
                    fill="#fa5d19"
                  />
                </g>
              );
            })()}
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
            <div style={{ fontWeight: 600, marginBottom: 2 }}>
              {tooltip.row.label}
            </div>
            <div style={{ color: "rgba(255,255,255,0.7)" }}>
              {formatTime(startedAt + tooltip.row.startMs, startedAt)} →{" "}
              {formatTime(startedAt + tooltip.row.endMs, startedAt)} (
              {formatMs(tooltip.row.endMs - tooltip.row.startMs)})
            </div>
            <div
              style={{
                color:
                  tooltip.row.result === "none"
                    ? "rgba(255,255,255,0.5)"
                    : accentColor || GANTT_COLORS[tooltip.row.result],
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
