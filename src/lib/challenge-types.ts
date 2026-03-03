/**
 * CheetCode v2 — Challenge type definitions.
 *
 * Every challenge implements the ChallengeDefinition interface.
 * This is the contract between the challenge registry, the validation API,
 * and the challenge page components.
 */

import type { Tier } from "./config";
import type { ChallengeData } from "./seed";

/** Context passed from the interact route to handleInteract. */
export interface InteractContext {
  /** Timestamp when the challenge page was loaded (from challengeViews record). */
  viewedAt: number;
}

/**
 * A challenge definition. Each challenge module exports one of these.
 * The `generate` function produces all data needed for both rendering
 * and validation from a ChallengeData instance (seeded per-session).
 */
export interface ChallengeDefinition<TPageData = unknown> {
  /** Unique challenge ID, used in URLs and DB records */
  id: string;

  /** Display title */
  title: string;

  /** Tier (1-4) determines default point value and difficulty category */
  tier: Tier;

  /** Override point value (defaults to TIER_POINTS[tier] if not set) */
  points?: number;

  /** Challenge IDs that must be solved before this challenge is accessible */
  dependsOn?: string[];

  /** Short description shown in the challenge list */
  description: string;

  /**
   * Generate challenge data from the session seed.
   * Returns both the page data (sent to client) and the correct answer (server-only).
   *
   * CRITICAL: `answer` must NEVER be sent to the client.
   * Only `pageData` is sent to the challenge page component.
   */
  generate(data: ChallengeData): {
    /** Data sent to the client to render the challenge page */
    pageData: TPageData;
    /** Gated data — never sent to client directly, delivered via /interact */
    hiddenData?: Record<string, unknown>;
    /** The correct answer. Server-only. Never sent to client. */
    answer: string;
  };

  /** Interaction actions this challenge supports (e.g. ["tab", "page", "modal"]) */
  interactActions?: string[];

  /** Returns a slice of hiddenData in response to an interact call */
  handleInteract?: (
    hiddenData: Record<string, unknown>,
    action: string,
    params: Record<string, unknown>,
    context?: InteractContext
  ) => unknown;

  /**
   * Optional: custom answer validation.
   * By default, answers are compared with strict string equality
   * after trimming whitespace and lowercasing.
   * Override this for challenges that accept multiple formats.
   */
  validateAnswer?: (submitted: string, correct: string) => boolean;

  /**
   * Instructions shown on the challenge page.
   * Can reference dynamic data via template syntax.
   * This is a function so it can depend on pageData.
   */
  instructions: string | ((pageData: TPageData) => string);
}

/**
 * Metadata about a challenge, safe to send to the client.
 * Used in the challenge list and session status.
 */
export interface ChallengeMeta {
  id: string;
  title: string;
  tier: Tier;
  description: string;
  points: number;
  dependsOn: string[];
}

/**
 * Status of a challenge within a session.
 */
export interface ChallengeStatus {
  challengeId: string;
  solved: boolean;
  locked: boolean;
  attempts: number;
  unmetPrerequisites: string[];
}

/**
 * Full session state returned from the session API.
 */
export interface SessionState {
  sessionId: string;
  status: "active" | "completed" | "expired";
  startedAt: number;
  expiresAt: number;
  timeRemainingMs: number;
  challenges: ChallengeMeta[];
  challengeStatuses: ChallengeStatus[];
  score: {
    earned: number;
    total: number;
    percentage: number;
  };
}

/**
 * Response from the validation endpoint.
 */
export type ValidateResponse =
  | { correct: true; points: number }
  | { correct: false; attemptsRemaining: number }
  | { correct: false; locked: true; attemptsRemaining: 0 }
  | { error: string };

/**
 * Leaderboard entry.
 */
export interface LeaderboardEntry {
  rank: number;
  github: string;
  score: number;
  wrongAttempts: number;
  lastCorrectAt: number | null;
  completedAt: number;
}
