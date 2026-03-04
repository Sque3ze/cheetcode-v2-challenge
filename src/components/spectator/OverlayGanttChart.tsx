"use client";

import { useRef, useState, useEffect, useMemo } from "react";
import type { SessionEvent } from "../../lib/orchestration-metrics";
import {
  DIM,
  BORDER,
  GANTT,
  buildGanttData,
  buildWrongCounts,
  formatMs,
  formatTime,
  type GanttRow,
  type GanttTierGroup,
} from "./formatters";

interface OverlayGanttChartProps {
  eventsA: SessionEvent[];
  eventsB: SessionEvent[];
  startedAtA: number;
  startedAtB: number;
  durationMsA: number;
  durationMsB: number;
  labelA: string;
  labelB: string;
  colorA?: string;
  colorB?: string;
}

const DEFAULT_BLUE = "#3b82f6";
const DEFAULT_ORANGE = "#f59e0b";

/** Merge two sets of tier groups into a unified row layout.
 *  For each challenge that appears in either (or both), we get one row. */
function mergeGroups(
  groupsA: GanttTierGroup[],
  groupsB: GanttTierGroup[],
): Array<{
  tier: number;
  rows: Array<{
    challengeId: string;
    label: string;
    rowA: GanttRow | null;
    rowB: GanttRow | null;
  }>;
}> {
  // Collect all challenges by tier
  const tierChallenges = new Map<number, Map<string, { label: string; rowA: GanttRow | null; rowB: GanttRow | null; firstStart: number }>>();

  const ensure = (tier: number) => {
    if (!tierChallenges.has(tier)) tierChallenges.set(tier, new Map());
    return tierChallenges.get(tier)!;
  };

  for (const g of groupsA) {
    const m = ensure(g.tier);
    for (const row of g.rows) {
      const existing = m.get(row.challengeId);
      if (existing) {
        existing.rowA = row;
        existing.firstStart = Math.min(existing.firstStart, row.startMs);
      } else {
        m.set(row.challengeId, { label: row.label, rowA: row, rowB: null, firstStart: row.startMs });
      }
    }
  }

  for (const g of groupsB) {
    const m = ensure(g.tier);
    for (const row of g.rows) {
      const existing = m.get(row.challengeId);
      if (existing) {
        existing.rowB = row;
        existing.firstStart = Math.min(existing.firstStart, row.startMs);
      } else {
        m.set(row.challengeId, { label: row.label, rowA: null, rowB: row, firstStart: row.startMs });
      }
    }
  }

  return [...tierChallenges.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([tier, challengeMap]) => {
      const rows = [...challengeMap.entries()]
        .sort((a, b) => a[1].firstStart - b[1].firstStart)
        .map(([challengeId, data]) => ({
          challengeId,
          label: data.label,
          rowA: data.rowA,
          rowB: data.rowB,
        }));
      return { tier, rows };
    });
}

const ROW_HEIGHT = 28;
const BAR_HEIGHT = 8;
const BAR_GAP = 2; // gap between A and B bars in same row
const TIER_HEADER_HEIGHT = 20;
const TIER_GAP = 8;
const AXIS_HEIGHT = 28;

export function OverlayGanttChart({
  eventsA,
  eventsB,
  startedAtA,
  startedAtB,
  durationMsA,
  durationMsB,
  labelA,
  labelB,
  colorA = DEFAULT_BLUE,
  colorB = DEFAULT_ORANGE,
}: OverlayGanttChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);
  const [hoveredAgent, setHoveredAgent] = useState<"a" | "b" | null>(null);
  const [tooltip, setTooltip] = useState<{
    x: number;
    y: number;
    row: GanttRow;
    agent: "a" | "b";
  } | null>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const obs = new ResizeObserver((entries) => {
      for (const entry of entries) setContainerWidth(entry.contentRect.width);
    });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const groupsA = useMemo(() => buildGanttData(eventsA, startedAtA), [eventsA, startedAtA]);
  const groupsB = useMemo(() => buildGanttData(eventsB, startedAtB), [eventsB, startedAtB]);
  const merged = useMemo(() => mergeGroups(groupsA, groupsB), [groupsA, groupsB]);

  const wrongCountsA = useMemo(() => buildWrongCounts(eventsA), [eventsA]);
  const wrongCountsB = useMemo(() => buildWrongCounts(eventsB), [eventsB]);

  if (merged.length === 0) return null;

  const totalRows = merged.reduce((sum, g) => sum + g.rows.length, 0);
  const totalHeight =
    AXIS_HEIGHT +
    merged.length * (TIER_HEADER_HEIGHT + TIER_GAP) +
    totalRows * ROW_HEIGHT +
    8;
  const chartWidth = Math.max(0, containerWidth - GANTT.LABEL_WIDTH);

  // Shared time axis
  const maxDuration = Math.max(durationMsA, durationMsB);
  const lastEventMsA = eventsA.reduce((max, e) => Math.max(max, Math.max(0, e.timestamp - startedAtA)), 0);
  const lastEventMsB = eventsB.reduce((max, e) => Math.max(max, Math.max(0, e.timestamp - startedAtB)), 0);
  const lastEventMs = Math.max(lastEventMsA, lastEventMsB);
  const axisDuration = Math.min(maxDuration, Math.max(30000, Math.ceil(lastEventMs / 30000) * 30000));
  const timeScale = chartWidth > 0 && axisDuration > 0 ? chartWidth / axisDuration : 0;

  const tickIntervalMs = GANTT.TICK_INTERVAL_S * 1000;
  const ticks: number[] = [];
  for (let t = 0; t <= axisDuration; t += tickIntervalMs) ticks.push(t);

  // Layout
  let currentY = AXIS_HEIGHT;
  const tierPositions: Array<{
    tier: number;
    headerY: number;
    rows: Array<{
      challengeId: string;
      label: string;
      rowA: GanttRow | null;
      rowB: GanttRow | null;
      y: number;
    }>;
  }> = [];

  for (const group of merged) {
    const headerY = currentY;
    currentY += TIER_HEADER_HEIGHT;
    const posRows: typeof tierPositions[0]["rows"] = [];
    for (const row of group.rows) {
      posRows.push({ ...row, y: currentY });
      currentY += ROW_HEIGHT;
    }
    tierPositions.push({ tier: group.tier, headerY, rows: posRows });
    currentY += TIER_GAP;
  }

  let qNum = 1;
  const rowLabels = new Map<string, string>();
  for (const { rows: posRows } of tierPositions) {
    for (const { challengeId } of posRows) {
      rowLabels.set(challengeId, `Q${qNum}`);
      qNum++;
    }
  }

  function getOpacity(agent: "a" | "b", result: string): number {
    const base = result === "solved" ? 0.8 : result === "none" ? 0.25 : 0.55;
    if (hoveredAgent === null) return base;
    return hoveredAgent === agent ? Math.min(1, base + 0.25) : base * 0.3;
  }

  function renderBar(
    row: GanttRow,
    barY: number,
    agent: "a" | "b",
    color: string,
    wrongCounts: Map<string, number>,
  ) {
    const barX = GANTT.LABEL_WIDTH + row.startMs * timeScale;
    const barW = Math.max(4, (row.endMs - row.startMs) * timeScale);
    const opacity = getOpacity(agent, row.result);

    return (
      <g
        key={`${agent}-${row.challengeId}`}
        style={{ transition: "opacity 0.15s ease" }}
        opacity={opacity}
        onMouseEnter={() => {
          setHoveredAgent(agent);
          setTooltip({ x: barX, y: barY + BAR_HEIGHT + 4, row, agent });
        }}
        onMouseLeave={() => {
          setHoveredAgent(null);
          setTooltip(null);
        }}
      >
        <rect
          x={barX}
          y={barY}
          width={barW}
          height={BAR_HEIGHT}
          rx={2}
          fill={color}
          style={{ cursor: "pointer" }}
        />
        {/* Submission markers */}
        {row.submissions.map((t, idx) => (
          <rect
            key={`s${idx}`}
            x={GANTT.LABEL_WIDTH + t * timeScale - 1}
            y={barY - 1}
            width={2}
            height={BAR_HEIGHT + 2}
            fill={color}
            rx={1}
          />
        ))}
      </g>
    );
  }

  const startedAtForTooltip = tooltip?.agent === "a" ? startedAtA : startedAtB;
  const wrongCountsForTooltip = tooltip?.agent === "a" ? wrongCountsA : wrongCountsB;
  const tooltipColor = tooltip?.agent === "a" ? colorA : colorB;
  const tooltipLabel = tooltip?.agent === "a" ? labelA : labelB;

  return (
    <div style={{ padding: "12px 14px", background: "rgba(0,0,0,0.015)" }}>
      {/* Legend */}
      <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 8 }}>
        <div style={{ fontSize: 11, fontWeight: 500, color: DIM }}>Overlay Gantt</div>
        <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11 }}>
          <span style={{ width: 12, height: 4, borderRadius: 2, background: colorA, display: "inline-block" }} />
          <span style={{ color: colorA, fontWeight: 500 }}>{labelA}</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11 }}>
          <span style={{ width: 12, height: 4, borderRadius: 2, background: colorB, display: "inline-block" }} />
          <span style={{ color: colorB, fontWeight: 500 }}>{labelB}</span>
        </div>
      </div>

      <div ref={containerRef} style={{ position: "relative" }}>
        {containerWidth > 0 && (
          <svg
            width={containerWidth}
            height={totalHeight}
            style={{ display: "block", fontFamily: "var(--font-geist-mono), monospace" }}
          >
            {/* Gridlines */}
            {ticks.map((t) => (
              <line
                key={t}
                x1={GANTT.LABEL_WIDTH + t * timeScale}
                y1={AXIS_HEIGHT - 4}
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
                y={AXIS_HEIGHT - 10}
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
                <text x={8} y={headerY + 14} fontSize={11} fontWeight={600} fill="#fa5d19">
                  T{tier}
                </text>
                {posRows.map(({ challengeId, rowA, rowB, y: rowY }) => {
                  // Two bars per row: A on top, B below, with a small gap
                  const barYA = rowY + (ROW_HEIGHT - BAR_HEIGHT * 2 - BAR_GAP) / 2;
                  const barYB = barYA + BAR_HEIGHT + BAR_GAP;

                  return (
                    <g key={challengeId}>
                      {/* Row label */}
                      <text
                        x={GANTT.LABEL_WIDTH - 8}
                        y={rowY + ROW_HEIGHT / 2 + 4}
                        textAnchor="end"
                        fontSize={11}
                        fill="#262626"
                      >
                        {rowLabels.get(challengeId)}
                      </text>

                      {/* Agent A bar */}
                      {rowA && renderBar(rowA, barYA, "a", colorA, wrongCountsA)}

                      {/* Agent B bar */}
                      {rowB && renderBar(rowB, barYB, "b", colorB, wrongCountsB)}

                      {/* Row separator line */}
                      <line
                        x1={GANTT.LABEL_WIDTH}
                        y1={rowY + ROW_HEIGHT}
                        x2={containerWidth}
                        y2={rowY + ROW_HEIGHT}
                        stroke={BORDER}
                        strokeOpacity={0.5}
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
            <div style={{ fontWeight: 600, marginBottom: 2, color: tooltipColor }}>
              {tooltipLabel}
            </div>
            <div style={{ fontWeight: 500 }}>{tooltip.row.label}</div>
            <div style={{ color: "rgba(255,255,255,0.7)" }}>
              {formatTime(startedAtForTooltip + tooltip.row.startMs, startedAtForTooltip)} →{" "}
              {formatTime(startedAtForTooltip + tooltip.row.endMs, startedAtForTooltip)} (
              {formatMs(tooltip.row.endMs - tooltip.row.startMs)})
            </div>
            <div
              style={{
                color: tooltip.row.result === "none"
                  ? "rgba(255,255,255,0.5)"
                  : tooltipColor,
              }}
            >
              {tooltip.row.result === "solved"
                ? "Solved"
                : tooltip.row.result === "wrong"
                  ? `Wrong (${wrongCountsForTooltip.get(tooltip.row.challengeId) || 0} attempts)`
                  : tooltip.row.result === "locked"
                    ? "Locked"
                    : "No submission"}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
