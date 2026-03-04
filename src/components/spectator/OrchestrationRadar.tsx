"use client";

import type { OrchestrationMetrics } from "../../lib/orchestration-metrics";

interface OrchestrationRadarProps {
  metrics: OrchestrationMetrics;
  secondaryMetrics?: OrchestrationMetrics;
  primaryColor?: string;
  secondaryColor?: string;
  size?: number;
}

const DIMENSIONS = [
  { key: "parallelizationScore", label: "Parallel" },
  { key: "dagEfficiency", label: "DAG Eff." },
  { key: "criticalPathSpeed", label: "Crit. Path" },
  { key: "submissionConfidence", label: "Confidence" },
  { key: "failureRecoveryScore", label: "Recovery" },
] as const;

export function OrchestrationRadar({
  metrics,
  secondaryMetrics,
  primaryColor = "#fa5d19",
  secondaryColor = "#3b82f6",
  size = 200,
}: OrchestrationRadarProps) {
  const cx = size / 2;
  const cy = size / 2;
  const maxR = size / 2 - 30;
  const n = DIMENSIONS.length;
  const angleStep = (2 * Math.PI) / n;
  const startAngle = -Math.PI / 2; // Start from top

  function getPoint(dimIdx: number, value: number): { x: number; y: number } {
    const angle = startAngle + dimIdx * angleStep;
    const r = value * maxR;
    return {
      x: cx + r * Math.cos(angle),
      y: cy + r * Math.sin(angle),
    };
  }

  function getPolygonPath(m: OrchestrationMetrics): string {
    return DIMENSIONS.map((dim, i) => {
      const val = m[dim.key as keyof OrchestrationMetrics] ?? 0;
      const { x, y } = getPoint(i, val);
      return `${i === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`;
    }).join(" ") + " Z";
  }

  const rings = [0.25, 0.5, 0.75, 1.0];

  return (
    <svg width={size} height={size} style={{ display: "block" }}>
      {/* Grid rings */}
      {rings.map((r) => (
        <polygon
          key={r}
          points={Array.from({ length: n }, (_, i) => {
            const { x, y } = getPoint(i, r);
            return `${x.toFixed(1)},${y.toFixed(1)}`;
          }).join(" ")}
          fill="none"
          stroke="rgba(38,38,38,0.08)"
          strokeWidth={1}
        />
      ))}

      {/* Axis lines */}
      {DIMENSIONS.map((_, i) => {
        const { x, y } = getPoint(i, 1);
        return (
          <line
            key={i}
            x1={cx}
            y1={cy}
            x2={x}
            y2={y}
            stroke="rgba(38,38,38,0.08)"
            strokeWidth={1}
          />
        );
      })}

      {/* Secondary data (behind) */}
      {secondaryMetrics && (
        <polygon
          points={DIMENSIONS.map((dim, i) => {
            const val = secondaryMetrics[dim.key as keyof OrchestrationMetrics] ?? 0;
            const { x, y } = getPoint(i, val);
            return `${x.toFixed(1)},${y.toFixed(1)}`;
          }).join(" ")}
          fill={secondaryColor}
          fillOpacity={0.1}
          stroke={secondaryColor}
          strokeWidth={1.5}
          strokeOpacity={0.6}
        />
      )}

      {/* Primary data */}
      <polygon
        points={DIMENSIONS.map((dim, i) => {
          const val = metrics[dim.key as keyof OrchestrationMetrics] ?? 0;
          const { x, y } = getPoint(i, val);
          return `${x.toFixed(1)},${y.toFixed(1)}`;
        }).join(" ")}
        fill={primaryColor}
        fillOpacity={0.15}
        stroke={primaryColor}
        strokeWidth={2}
        strokeOpacity={0.8}
      />

      {/* Data points */}
      {DIMENSIONS.map((dim, i) => {
        const val = metrics[dim.key as keyof OrchestrationMetrics] ?? 0;
        const { x, y } = getPoint(i, val);
        return (
          <circle
            key={`p-${i}`}
            cx={x}
            cy={y}
            r={3}
            fill={primaryColor}
          />
        );
      })}

      {secondaryMetrics &&
        DIMENSIONS.map((dim, i) => {
          const val = secondaryMetrics[dim.key as keyof OrchestrationMetrics] ?? 0;
          const { x, y } = getPoint(i, val);
          return (
            <circle
              key={`s-${i}`}
              cx={x}
              cy={y}
              r={2.5}
              fill={secondaryColor}
            />
          );
        })}

      {/* Labels */}
      {DIMENSIONS.map((dim, i) => {
        const { x, y } = getPoint(i, 1.22);
        return (
          <text
            key={`l-${i}`}
            x={x}
            y={y}
            textAnchor="middle"
            dominantBaseline="middle"
            fontSize={9}
            fontFamily="var(--font-geist-mono), monospace"
            fill="rgba(38,38,38,0.5)"
          >
            {dim.label}
          </text>
        );
      })}
    </svg>
  );
}
