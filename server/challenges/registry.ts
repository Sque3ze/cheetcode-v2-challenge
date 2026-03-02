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
import { dataDashboardChallenge } from "./tier3/data-dashboard";
import { constraintSolverChallenge } from "./tier3/constraint-solver";
import { calculationAuditChallenge } from "./tier4/calculation-audit";
import { redHerringChallenge } from "./tier4/red-herring";

// ─── Registry ──────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const CHALLENGES: ChallengeDefinition<any>[] = [
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

  // Tier 3 — Complex Synthesis
  dataDashboardChallenge,
  constraintSolverChallenge,

  // Tier 4 — Adversarial & Judgment
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
