// CheetCode v2 — Central configuration
// All tunable values in one place for easy calibration.

/** Session duration in milliseconds. */
export const SESSION_DURATION_MS = 5 * 60 * 1000;

/** Maximum wrong attempts per challenge before it locks. */
export const MAX_ATTEMPTS_PER_CHALLENGE = 3;

/** Minimum time between sessions for the same user (prevents spam). */
export const SESSION_COOLDOWN_MS = 10 * 1000;

/** Challenge tier point values */
export const TIER_POINTS = {
  1: 1,
  2: 2,
  3: 4,
  4: 2,
} as const;

export type Tier = keyof typeof TIER_POINTS;

/** Minimum time (ms) between loading a challenge and submitting a valid answer, per tier. */
export const MIN_SOLVE_TIME_MS: Record<Tier, number> = { 1: 3_000, 2: 5_000, 3: 8_000, 4: 10_000 };

/** Minimum interval (ms) between consecutive /interact calls. */
export const MIN_INTERACT_INTERVAL_MS = 500;

/** How long a render token remains valid (ms). */
export const RENDER_TOKEN_TTL_MS = 60_000;
