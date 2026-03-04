"use client";

import { useRef, useState, useEffect, useMemo } from "react";
import {
  DAG_NODES,
  DAG_EDGES,
  TIER_COLORS,
  deriveNodeStates,
  type NodeState,
} from "../../lib/dag-layout";

interface ChallengeDAGProps {
  events: Array<{ type: string; challengeId?: string | null }>;
}

const STATE_FILLS: Record<NodeState, { fill: string; opacity: number; border: string }> = {
  idle: { fill: "#f3f3f3", opacity: 1, border: "rgba(38,38,38,0.15)" },
  viewing: { fill: "currentTier", opacity: 0.15, border: "currentTier" },
  working: { fill: "currentTier", opacity: 0.3, border: "currentTier" },
  solved: { fill: "#16a34a", opacity: 0.9, border: "#16a34a" },
  wrong: { fill: "#f59e0b", opacity: 0.8, border: "#f59e0b" },
  locked: { fill: "#dc2626", opacity: 0.4, border: "#dc2626" },
};

const NODE_W = 88;
const NODE_H = 40;
const WAVE_GAP = 140;
const ROW_GAP = 52;
const PAD_X = 40;
const PAD_Y = 30;

export function ChallengeDAG({ events }: ChallengeDAGProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const obs = new ResizeObserver((entries) => {
      for (const entry of entries) setContainerWidth(entry.contentRect.width);
    });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const nodeStates = useMemo(() => deriveNodeStates(events), [events]);

  // Group nodes by wave
  const waves = useMemo(() => {
    const waveMap = new Map<number, typeof DAG_NODES>();
    for (const node of DAG_NODES) {
      const wave = waveMap.get(node.wave) || [];
      wave.push(node);
      waveMap.set(node.wave, wave);
    }
    return [...waveMap.entries()].sort((a, b) => a[0] - b[0]);
  }, []);

  const maxRows = Math.max(...waves.map(([, nodes]) => nodes.length));
  const svgWidth = Math.max(containerWidth, PAD_X * 2 + waves.length * (NODE_W + WAVE_GAP) - WAVE_GAP);
  const svgHeight = PAD_Y * 2 + maxRows * (NODE_H + ROW_GAP) - ROW_GAP;

  // Compute node positions
  const nodePositions = useMemo(() => {
    const positions = new Map<string, { x: number; y: number }>();
    for (const [waveIdx, [, nodes]] of waves.entries()) {
      const totalH = nodes.length * (NODE_H + ROW_GAP) - ROW_GAP;
      const startY = (svgHeight - totalH) / 2;
      for (const [rowIdx, node] of nodes.entries()) {
        positions.set(node.id, {
          x: PAD_X + waveIdx * (NODE_W + WAVE_GAP),
          y: startY + rowIdx * (NODE_H + ROW_GAP),
        });
      }
    }
    return positions;
  }, [waves, svgHeight]);

  return (
    <div ref={containerRef} style={{ width: "100%", overflow: "hidden" }}>
      {containerWidth > 0 && (
        <svg
          width={svgWidth}
          height={svgHeight}
          style={{
            display: "block",
            fontFamily: "var(--font-geist-mono), monospace",
          }}
        >
          {/* Edges */}
          {DAG_EDGES.map((edge) => {
            const from = nodePositions.get(edge.from);
            const to = nodePositions.get(edge.to);
            if (!from || !to) return null;

            const x1 = from.x + NODE_W;
            const y1 = from.y + NODE_H / 2;
            const x2 = to.x;
            const y2 = to.y + NODE_H / 2;
            const cx = (x1 + x2) / 2;

            const fromState = nodeStates.get(edge.from) || "idle";
            const toState = nodeStates.get(edge.to) || "idle";
            const active =
              fromState === "solved" ||
              toState !== "idle";

            const toNode = DAG_NODES.find((n) => n.id === edge.to);
            const tierColor = toNode
              ? TIER_COLORS[toNode.tier as keyof typeof TIER_COLORS] || "#999"
              : "#999";

            return (
              <path
                key={`${edge.from}-${edge.to}`}
                d={`M ${x1} ${y1} C ${cx} ${y1}, ${cx} ${y2}, ${x2} ${y2}`}
                fill="none"
                stroke={active ? tierColor : "rgba(38,38,38,0.12)"}
                strokeWidth={active ? 2 : 1.5}
                opacity={active ? 0.7 : 0.3}
                style={{ transition: "all 0.3s ease" }}
              />
            );
          })}

          {/* Nodes */}
          {DAG_NODES.map((node) => {
            const pos = nodePositions.get(node.id);
            if (!pos) return null;

            const state = nodeStates.get(node.id) || "idle";
            const tierColor =
              TIER_COLORS[node.tier as keyof typeof TIER_COLORS] || "#999";
            const styleDef = STATE_FILLS[state];
            const fill =
              styleDef.fill === "currentTier" ? tierColor : styleDef.fill;
            const borderColor =
              styleDef.border === "currentTier" ? tierColor : styleDef.border;

            const animClass =
              state === "viewing"
                ? "dag-pulse"
                : state === "working"
                  ? "dag-work-pulse"
                  : "";

            return (
              <g
                key={node.id}
                style={{ transition: "opacity 0.3s ease" }}
                className={animClass}
              >
                {/* Node rect */}
                <rect
                  x={pos.x}
                  y={pos.y}
                  width={NODE_W}
                  height={NODE_H}
                  rx={8}
                  fill={fill}
                  opacity={styleDef.opacity}
                  stroke={borderColor}
                  strokeWidth={state === "idle" ? 1 : 2}
                  style={{ transition: "all 0.3s ease" }}
                />
                {/* Label */}
                <text
                  x={pos.x + NODE_W / 2}
                  y={pos.y + NODE_H / 2 - 2}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fontSize={10}
                  fontWeight={500}
                  fill={
                    state === "solved" || state === "locked"
                      ? "white"
                      : state === "working"
                        ? "#262626"
                        : "#262626"
                  }
                  style={{ transition: "fill 0.3s ease" }}
                >
                  {node.shortLabel}
                </text>
                {/* Points badge */}
                <text
                  x={pos.x + NODE_W / 2}
                  y={pos.y + NODE_H / 2 + 12}
                  textAnchor="middle"
                  fontSize={8}
                  fill={
                    state === "solved" || state === "locked"
                      ? "rgba(255,255,255,0.7)"
                      : "rgba(38,38,38,0.4)"
                  }
                  style={{ transition: "fill 0.3s ease" }}
                >
                  {node.points}pt
                </text>
              </g>
            );
          })}
        </svg>
      )}
    </div>
  );
}
