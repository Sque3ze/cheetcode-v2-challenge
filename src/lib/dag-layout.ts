/**
 * Static DAG topology for the challenge graph.
 * Client-safe — no server imports. Hardcoded from the challenge registry.
 */

export interface DAGNode {
  id: string;
  label: string;
  shortLabel: string;
  tier: number;
  wave: number;
  points: number;
  dependsOn: string[];
}

export interface DAGEdge {
  from: string;
  to: string;
}

export type NodeState =
  | "idle"
  | "viewing"
  | "working"
  | "solved"
  | "wrong"
  | "locked";

// Tier colors matching existing tier-badge-* CSS
export const TIER_COLORS = {
  1: "#1a9338", // green
  2: "#2a6dfb", // blue
  3: "#9061ff", // purple
  4: "#eb3424", // red
} as const;

// ─── Static DAG data (derived from server/challenges/registry.ts) ────

const RAW_NODES: Array<{
  id: string;
  label: string;
  shortLabel: string;
  tier: number;
  points: number;
  dependsOn: string[];
}> = [
  // Tier 1 — no dependencies
  { id: "tier1-table-sort", label: "Table Sort", shortLabel: "TblSort", tier: 1, points: 1, dependsOn: [] },
  { id: "tier1-form-fill", label: "Form Fill", shortLabel: "Form", tier: 1, points: 1, dependsOn: [] },
  { id: "tier1-dropdown-select", label: "Dropdown Select", shortLabel: "Drop", tier: 1, points: 1, dependsOn: [] },
  { id: "tier1-tab-navigation", label: "Tab Navigation", shortLabel: "Tabs", tier: 1, points: 1, dependsOn: [] },
  { id: "tier1-filter-search", label: "Filter & Count", shortLabel: "Filter", tier: 1, points: 1, dependsOn: [] },
  { id: "tier1-modal-interaction", label: "Modal Interaction", shortLabel: "Modal", tier: 1, points: 1, dependsOn: [] },

  // Tier 2
  { id: "tier2-multi-step-wizard", label: "Multi-Step Wizard", shortLabel: "Wizard", tier: 2, points: 2, dependsOn: ["tier1-dropdown-select"] },
  { id: "tier2-linked-data-lookup", label: "Linked Data Lookup", shortLabel: "Linked", tier: 2, points: 2, dependsOn: ["tier1-form-fill"] },
  { id: "tier2-sequential-calculator", label: "Sequential Calculator", shortLabel: "SeqCalc", tier: 2, points: 2, dependsOn: ["tier1-tab-navigation"] },
  { id: "tier2-resilient-collector", label: "Resilient Collector", shortLabel: "Resil", tier: 2, points: 4, dependsOn: ["tier1-tab-navigation"] },
  { id: "tier2-config-debugger", label: "Config Debugger", shortLabel: "Config", tier: 2, points: 2, dependsOn: ["tier1-filter-search"] },

  // Tier 3
  { id: "tier3-data-dashboard", label: "Data Dashboard", shortLabel: "Dash", tier: 3, points: 4, dependsOn: ["tier2-sequential-calculator"] },
  { id: "tier3-constraint-solver", label: "Constraint Solver", shortLabel: "Constr", tier: 3, points: 5, dependsOn: ["tier2-linked-data-lookup"] },
  { id: "tier3-fan-out-aggregator", label: "Fan-Out Aggregator", shortLabel: "FanOut", tier: 3, points: 4, dependsOn: ["tier2-linked-data-lookup"] },
  { id: "tier3-price-negotiator", label: "Price Negotiator", shortLabel: "Price", tier: 3, points: 5, dependsOn: ["tier2-sequential-calculator"] },
  { id: "tier3-inventory-reconciliation", label: "Inventory Reconciliation", shortLabel: "Invent", tier: 3, points: 4, dependsOn: ["tier2-linked-data-lookup"] },
  { id: "tier3-trace-analyzer", label: "Trace Analyzer", shortLabel: "Trace", tier: 3, points: 4, dependsOn: ["tier2-resilient-collector"] },
  { id: "tier3-event-sourcing", label: "Event Sourcing", shortLabel: "EvtSrc", tier: 3, points: 4, dependsOn: ["tier2-sequential-calculator"] },

  // Tier 4
  { id: "tier4-calculation-audit", label: "Calculation Audit", shortLabel: "Audit", tier: 4, points: 2, dependsOn: ["tier2-sequential-calculator"] },
  { id: "tier4-red-herring", label: "Quarterly Report", shortLabel: "Report", tier: 4, points: 2, dependsOn: ["tier2-linked-data-lookup"] },
];

// Compute wave (depth) from dependency structure
function computeWave(nodeId: string, lookup: Map<string, typeof RAW_NODES[0]>, cache: Map<string, number>): number {
  if (cache.has(nodeId)) return cache.get(nodeId)!;
  const node = lookup.get(nodeId);
  if (!node || node.dependsOn.length === 0) {
    cache.set(nodeId, 0);
    return 0;
  }
  const parentWaves = node.dependsOn.map((dep) => computeWave(dep, lookup, cache));
  const wave = Math.max(...parentWaves) + 1;
  cache.set(nodeId, wave);
  return wave;
}

const nodeLookup = new Map(RAW_NODES.map((n) => [n.id, n]));
const waveCache = new Map<string, number>();

export const DAG_NODES: DAGNode[] = RAW_NODES.map((n) => ({
  ...n,
  wave: computeWave(n.id, nodeLookup, waveCache),
}));

export const DAG_EDGES: DAGEdge[] = RAW_NODES.flatMap((n) =>
  n.dependsOn.map((dep) => ({ from: dep, to: n.id }))
);

/**
 * Derive per-challenge node state from a list of spectator events.
 */
export function deriveNodeStates(
  events: Array<{ type: string; challengeId?: string | null }>
): Map<string, NodeState> {
  const states = new Map<string, NodeState>();

  // Initialize all nodes as idle
  for (const node of DAG_NODES) {
    states.set(node.id, "idle");
  }

  // Track which challenges have been solved to determine locked status
  const solvedSet = new Set<string>();
  const wrongCounts = new Map<string, number>();

  for (const e of events) {
    if (!e.challengeId) continue;
    const id = e.challengeId;

    switch (e.type) {
      case "challenge_viewed":
        if (states.get(id) === "idle") {
          states.set(id, "viewing");
        }
        break;
      case "challenge_interacted":
        if (states.get(id) === "viewing" || states.get(id) === "idle") {
          states.set(id, "working");
        }
        break;
      case "answer_submitted":
        if (states.get(id) !== "solved" && states.get(id) !== "locked") {
          states.set(id, "working");
        }
        break;
      case "answer_correct":
        states.set(id, "solved");
        solvedSet.add(id);
        break;
      case "answer_wrong": {
        const count = (wrongCounts.get(id) || 0) + 1;
        wrongCounts.set(id, count);
        if (!solvedSet.has(id)) {
          states.set(id, "wrong");
        }
        break;
      }
      case "challenge_locked":
        if (!solvedSet.has(id)) {
          states.set(id, "locked");
        }
        break;
    }
  }

  return states;
}
