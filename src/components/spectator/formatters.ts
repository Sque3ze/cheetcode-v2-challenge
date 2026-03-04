/**
 * Shared formatting utilities for Gantt charts and spectator views.
 * Extracted from admin page for reuse across spectator and comparison modes.
 */

import type { SessionEvent } from "../../lib/orchestration-metrics";

// ─── Color helpers ───────────────────────────────────────────

export const ACCENT = "#fa5d19";
export const DIM = "rgba(38, 38, 38, 0.4)";
export const BORDER = "#f0f0f0";

export function rateColor(rate: number): string {
  if (rate >= 70) return "#16a34a";
  if (rate >= 40) return "#ca8a04";
  return "#dc2626";
}

export function formatMs(ms: number): string {
  const secs = ms / 1000;
  if (secs < 60) return `${secs.toFixed(1)}s`;
  return `${Math.floor(secs / 60)}m ${Math.round(secs % 60)}s`;
}

export function formatTime(ts: number, baseTs?: number): string {
  const offset = baseTs ? (ts - baseTs) / 1000 : ts / 1000;
  const mins = Math.floor(offset / 60);
  const secs = Math.floor(offset % 60);
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

export const EVENT_COLORS: Record<string, string> = {
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

export interface GanttRow {
  challengeId: string;
  label: string;
  tier: number;
  startMs: number;
  endMs: number;
  result: "solved" | "wrong" | "locked" | "none";
  interactions: number[];
  submissions: number[];
}

export interface GanttTierGroup {
  tier: number;
  rows: GanttRow[];
}

export const GANTT = {
  LABEL_WIDTH: 48,
  ROW_HEIGHT: 26,
  BAR_HEIGHT: 14,
  TIER_GAP: 8,
  TIER_HEADER_HEIGHT: 20,
  AXIS_HEIGHT: 28,
  DOT_RADIUS: 3,
  TICK_INTERVAL_S: 30,
} as const;

export const GANTT_COLORS: Record<string, string> = {
  solved: "#16a34a",
  wrong: "#dc2626",
  locked: "#dc2626",
  none: "rgba(38,38,38,0.12)",
};

/** Convert a challenge ID like "tier1-table-sort" to "Table Sort". */
export function challengeLabel(id: string): string {
  return id
    .replace(/^tier\d-/, "")
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

/** Count wrong attempts per challenge from an event stream. */
export function buildWrongCounts(events: SessionEvent[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const e of events) {
    if (e.type === "answer_wrong" && e.challengeId) {
      counts.set(e.challengeId, (counts.get(e.challengeId) || 0) + 1);
    }
  }
  return counts;
}

export function buildGanttData(events: SessionEvent[], startedAt: number): GanttTierGroup[] {
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
    const label = challengeLabel(challengeId);
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
