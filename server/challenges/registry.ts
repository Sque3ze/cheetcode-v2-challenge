/**
 * CheetCode v2 — Challenge Registry.
 *
 * Central registry of all challenge definitions.
 * Server-only — never imported by client code.
 *
 * To add a new challenge:
 * 1. Create a file in server/challenges/ that exports a ChallengeDefinition
 * 2. Import and register it in the CHALLENGES array below
 */

import "server-only";
import type { ChallengeDefinition, ChallengeMeta } from "../../src/lib/challenge-types";
import { TIER_POINTS } from "../../src/lib/config";

// ─── Challenge imports ─────────────────────────────────────────
import { tableSortChallenge } from "./tier1/table-sort";
import { formFillChallenge } from "./tier1/form-fill";
import { dropdownSelectChallenge } from "./tier1/dropdown-select";
import { tabNavigationChallenge } from "./tier1/tab-navigation";
import { filterSearchChallenge } from "./tier1/filter-search";
import { modalInteractionChallenge } from "./tier1/modal-interaction";
import { multiStepWizardChallenge } from "./tier2/multi-step-wizard";
import { linkedDataLookupChallenge } from "./tier2/linked-data-lookup";
import { sequentialCalculatorChallenge } from "./tier2/sequential-calculator";
import { resilientCollectorChallenge } from "./tier2/resilient-collector";
import { dataDashboardChallenge } from "./tier3/data-dashboard";
import { constraintSolverChallenge } from "./tier3/constraint-solver";
import { fanOutAggregatorChallenge } from "./tier3/fan-out-aggregator";
import { priceNegotiatorChallenge } from "./tier3/price-negotiator";
import { inventoryReconciliationChallenge } from "./tier3/inventory-reconciliation";
import { traceAnalyzerChallenge } from "./tier3/trace-analyzer";
import { eventSourcingChallenge } from "./tier3/event-sourcing";
import { configDebuggerChallenge } from "./tier2/config-debugger";
import { calculationAuditChallenge } from "./tier4/calculation-audit";
import { redHerringChallenge } from "./tier4/red-herring";

// ─── Registry ──────────────────────────────────────────────────

const CHALLENGES: ChallengeDefinition<unknown>[] = [
  // Tier 1 — Browser Fundamentals
  tableSortChallenge,
  formFillChallenge,
  dropdownSelectChallenge,
  tabNavigationChallenge,
  filterSearchChallenge,
  modalInteractionChallenge,

  // Tier 2 — Multi-Step Workflows
  multiStepWizardChallenge,
  linkedDataLookupChallenge,
  sequentialCalculatorChallenge,
  resilientCollectorChallenge,
  configDebuggerChallenge,

  // Tier 3 — Complex Synthesis
  dataDashboardChallenge,
  constraintSolverChallenge,
  fanOutAggregatorChallenge,
  priceNegotiatorChallenge,
  inventoryReconciliationChallenge,
  traceAnalyzerChallenge,
  eventSourcingChallenge,

  // Tier 4 — Advanced Analysis
  calculationAuditChallenge,
  redHerringChallenge,
];

// ─── Lookup helpers ────────────────────────────────────────────

const challengeMap = new Map<string, ChallengeDefinition>(
  CHALLENGES.map((c) => [c.id, c])
);

/** Get a challenge definition by ID. Returns undefined if not found. */
export function getChallenge(id: string): ChallengeDefinition | undefined {
  return challengeMap.get(id);
}

/** Get all registered challenge definitions. */
export function getAllChallenges(): ChallengeDefinition[] {
  return CHALLENGES;
}

/** Get metadata for all challenges (safe to send to client). */
export function getAllChallengeMetas(): ChallengeMeta[] {
  return CHALLENGES.map((c) => ({
    id: c.id,
    title: c.title,
    tier: c.tier,
    description: c.description,
    points: c.points ?? TIER_POINTS[c.tier],
    dependsOn: c.dependsOn ?? [],
  }));
}

/** Get the total possible points across all challenges. */
export function getTotalPoints(): number {
  return CHALLENGES.reduce((sum, c) => sum + (c.points ?? TIER_POINTS[c.tier]), 0);
}

/**
 * Validate a submitted answer against the correct answer for a challenge.
 * Uses the challenge's custom validator if defined, otherwise strict
 * string comparison after trim + lowercase.
 */
export function validateAnswer(
  challengeId: string,
  submitted: string,
  correct: string
): boolean {
  const challenge = challengeMap.get(challengeId);
  if (!challenge) return false;

  if (challenge.validateAnswer) {
    return challenge.validateAnswer(submitted, correct);
  }

  // Default: trim whitespace, lowercase, strict equality
  return submitted.trim().toLowerCase() === correct.trim().toLowerCase();
}

// ─── DAG prerequisite helpers ──────────────────────────────────

/** Get the list of prerequisite challenge IDs that are NOT yet solved. */
export function getUnmetPrerequisites(
  challengeId: string,
  solvedSet: Set<string>
): string[] {
  const challenge = challengeMap.get(challengeId);
  if (!challenge?.dependsOn) return [];
  return challenge.dependsOn.filter((dep) => !solvedSet.has(dep));
}

/** Check if all prerequisites for a challenge have been solved. */
export function arePrerequisitesMet(
  challengeId: string,
  solvedSet: Set<string>
): boolean {
  return getUnmetPrerequisites(challengeId, solvedSet).length === 0;
}

// ─── Startup DAG validation ────────────────────────────────────

(function validateDAG() {
  const ids = new Set(CHALLENGES.map((c) => c.id));
  const errors: string[] = [];

  for (const c of CHALLENGES) {
    if (!c.dependsOn) continue;
    for (const dep of c.dependsOn) {
      if (dep === c.id) {
        errors.push(`Challenge "${c.id}" depends on itself`);
      }
      if (!ids.has(dep)) {
        errors.push(
          `Challenge "${c.id}" depends on unknown challenge "${dep}"`
        );
      }
    }
  }

  // Cycle detection via DFS
  const UNVISITED = 0, IN_PROGRESS = 1, DONE = 2;
  const state = new Map<string, number>();
  for (const c of CHALLENGES) state.set(c.id, UNVISITED);

  function dfs(id: string, path: string[]): void {
    state.set(id, IN_PROGRESS);
    const deps = challengeMap.get(id)?.dependsOn ?? [];
    for (const dep of deps) {
      if (!state.has(dep)) continue; // unknown dep already reported
      if (state.get(dep) === IN_PROGRESS) {
        errors.push(
          `Cycle detected: ${[...path, id, dep].join(" → ")}`
        );
      } else if (state.get(dep) === UNVISITED) {
        dfs(dep, [...path, id]);
      }
    }
    state.set(id, DONE);
  }

  for (const c of CHALLENGES) {
    if (state.get(c.id) === UNVISITED) dfs(c.id, []);
  }

  if (errors.length > 0) {
    throw new Error(
      `Challenge DAG validation failed:\n${errors.join("\n")}`
    );
  }
})();
