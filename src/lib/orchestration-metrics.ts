/**
 * Orchestration Quality Metrics — computed at session completion.
 *
 * These metrics measure how well an agent orchestrated its challenge-solving
 * strategy: parallelization, DAG awareness, critical path optimization, accuracy.
 *
 * All functions are pure (no Convex/API coupling) for testability.
 */

export interface SessionEvent {
  type: string;
  timestamp: number;
  challengeId?: string;
  metadata?: Record<string, unknown>;
}

export interface OrchestrationMetrics {
  parallelizationScore: number;  // 0-1
  dagEfficiency: number;         // 0-1
  criticalPathSpeed: number;     // 0-1
  submissionConfidence: number;  // 0-1
  tiersReached: number;          // 1-4
}

interface ChallengeInfo {
  id: string;
  tier: number;
  dependsOn: string[];
}

// The two critical path chains in the DAG
const CRITICAL_PATH_ROOTS = ["tier1-form-fill", "tier1-tab-navigation"];
const CRITICAL_CHAINS: string[][] = [
  ["tier1-form-fill", "tier2-linked-data-lookup", "tier3-constraint-solver"],
  ["tier1-form-fill", "tier2-linked-data-lookup", "tier3-fan-out-aggregator"],
  ["tier1-form-fill", "tier2-linked-data-lookup", "tier4-red-herring"],
  ["tier1-tab-navigation", "tier2-sequential-calculator", "tier3-data-dashboard"],
  ["tier1-tab-navigation", "tier2-sequential-calculator", "tier3-price-negotiator"],
  ["tier1-tab-navigation", "tier2-sequential-calculator", "tier4-calculation-audit"],
  ["tier1-tab-navigation", "tier2-resilient-collector"],
];

/**
 * Compute parallelization score: how many challenges had overlapping
 * work windows (viewed → first submission).
 *
 * 0 = purely serial (only one challenge at a time)
 * 1 = maximum parallelization
 */
export function computeParallelizationScore(events: SessionEvent[]): number {
  // Build work windows: [viewedAt, firstSubmitAt] per challenge
  const windows: Array<{ start: number; end: number }> = [];
  const viewTimes = new Map<string, number>();
  const submitTimes = new Map<string, number>();

  for (const e of events) {
    if (!e.challengeId) continue;
    if (e.type === "challenge_viewed" && !viewTimes.has(e.challengeId)) {
      viewTimes.set(e.challengeId, e.timestamp);
    }
    if (e.type === "answer_submitted" && !submitTimes.has(e.challengeId)) {
      submitTimes.set(e.challengeId, e.timestamp);
    }
  }

  for (const [id, start] of viewTimes) {
    const end = submitTimes.get(id) ?? start; // if never submitted, point window
    if (end > start) {
      windows.push({ start, end });
    }
  }

  if (windows.length <= 1) return 0;

  // Count maximum overlapping windows at any point
  const timePoints: Array<{ time: number; delta: number }> = [];
  for (const w of windows) {
    timePoints.push({ time: w.start, delta: 1 });
    timePoints.push({ time: w.end, delta: -1 });
  }
  timePoints.sort((a, b) => a.time - b.time || a.delta - b.delta);

  let current = 0;
  let maxOverlap = 0;
  for (const p of timePoints) {
    current += p.delta;
    maxOverlap = Math.max(maxOverlap, current);
  }

  // Normalize: 1 overlap = 0, N overlaps maps to [0, 1]
  return Math.min(1, (maxOverlap - 1) / (windows.length - 1));
}

/**
 * Compute DAG efficiency: did the agent prioritize critical-path roots?
 *
 * Scores two factors:
 * 1. Were critical path roots among the first challenges viewed?
 * 2. How tight was the pipelining (time between T1 solve → T2 view)?
 */
export function computeDagEfficiency(
  events: SessionEvent[],
  challenges: ChallengeInfo[]
): number {
  // Order of first views
  const viewOrder: string[] = [];
  const seen = new Set<string>();
  for (const e of events) {
    if (e.type === "challenge_viewed" && e.challengeId && !seen.has(e.challengeId)) {
      viewOrder.push(e.challengeId);
      seen.add(e.challengeId);
    }
  }

  if (viewOrder.length === 0) return 0;

  // Factor 1: Were critical path roots viewed early?
  // Best case: both roots are in the first 3 views
  let rootScore = 0;
  const totalRoots = CRITICAL_PATH_ROOTS.length;
  for (const root of CRITICAL_PATH_ROOTS) {
    const idx = viewOrder.indexOf(root);
    if (idx === -1) continue;
    // Score based on position: in top 3 = full credit, position 4-6 = partial
    if (idx < 3) rootScore += 1;
    else if (idx < 6) rootScore += 0.5;
  }
  const rootFactor = rootScore / totalRoots;

  // Factor 2: Pipelining tightness — time between prerequisite solve and dependent view
  const solveTimes = new Map<string, number>();
  const viewTimes = new Map<string, number>();
  for (const e of events) {
    if (!e.challengeId) continue;
    if (e.type === "answer_correct") solveTimes.set(e.challengeId, e.timestamp);
    if (e.type === "challenge_viewed" && !viewTimes.has(e.challengeId)) {
      viewTimes.set(e.challengeId, e.timestamp);
    }
  }

  const deps = challenges.filter((c) => c.dependsOn.length > 0);
  let pipelineScore = 0;
  let pipelineCount = 0;
  for (const c of deps) {
    const prereq = c.dependsOn[0];
    const prereqSolve = solveTimes.get(prereq);
    const depView = viewTimes.get(c.id);
    if (prereqSolve && depView) {
      const gap = depView - prereqSolve;
      // < 5s gap = perfect pipeline, < 30s = decent, > 60s = poor
      if (gap < 5000) pipelineScore += 1;
      else if (gap < 30000) pipelineScore += 0.5;
      else pipelineScore += 0.1;
      pipelineCount++;
    }
  }
  const pipelineFactor = pipelineCount > 0 ? pipelineScore / pipelineCount : 0.5;

  // Weighted combination: root priority (40%) + pipeline tightness (60%)
  return Math.min(1, rootFactor * 0.4 + pipelineFactor * 0.6);
}

/**
 * Compute critical path speed: ratio of theoretical minimum critical path
 * time vs actual time to complete the longest chain.
 *
 * Theoretical minimum = sum of MIN_SOLVE_TIME_MS for each challenge in the chain.
 */
export function computeCriticalPathSpeed(
  events: SessionEvent[],
  sessionStartedAt: number,
  minSolveTimes: Record<number, number>
): number {
  const solveTimes = new Map<string, number>();
  for (const e of events) {
    if (e.type === "answer_correct" && e.challengeId) {
      solveTimes.set(e.challengeId, e.timestamp);
    }
  }

  let bestRatio = 0;

  for (const chain of CRITICAL_CHAINS) {
    // Check if the terminal challenge was solved
    const terminal = chain[chain.length - 1];
    const terminalSolve = solveTimes.get(terminal);
    if (!terminalSolve) continue;

    // Compute theoretical minimum: sum of min solve times for all challenges in chain
    let theoreticalMin = 0;
    for (const cid of chain) {
      const tier = parseInt(cid.split("-")[0].replace("tier", ""));
      theoreticalMin += minSolveTimes[tier] || 3000;
    }

    // Actual time from session start to terminal solve
    const actualTime = terminalSolve - sessionStartedAt;
    if (actualTime <= 0) continue;

    const ratio = theoreticalMin / actualTime;
    bestRatio = Math.max(bestRatio, ratio);
  }

  return Math.min(1, bestRatio);
}

/**
 * Compute submission confidence: ratio of correct to total answer submissions.
 */
export function computeSubmissionConfidence(events: SessionEvent[]): number {
  let total = 0;
  let correct = 0;
  for (const e of events) {
    if (e.type === "answer_submitted") {
      total++;
      if (e.metadata && (e.metadata as { correct?: boolean }).correct) {
        correct++;
      }
    }
  }
  return total > 0 ? correct / total : 0;
}

/**
 * Determine the highest tier solved.
 */
export function computeTiersReached(
  events: SessionEvent[],
  challenges: ChallengeInfo[]
): number {
  const tierMap = new Map(challenges.map((c) => [c.id, c.tier]));
  let maxTier = 0;
  for (const e of events) {
    if (e.type === "answer_correct" && e.challengeId) {
      const tier = tierMap.get(e.challengeId);
      if (tier && tier > maxTier) maxTier = tier;
    }
  }
  return maxTier;
}

/**
 * Compute all orchestration metrics for a completed session.
 */
export function computeOrchestrationMetrics(
  events: SessionEvent[],
  challenges: ChallengeInfo[],
  sessionStartedAt: number,
  minSolveTimes: Record<number, number>
): OrchestrationMetrics {
  return {
    parallelizationScore: computeParallelizationScore(events),
    dagEfficiency: computeDagEfficiency(events, challenges),
    criticalPathSpeed: computeCriticalPathSpeed(events, sessionStartedAt, minSolveTimes),
    submissionConfidence: computeSubmissionConfidence(events),
    tiersReached: computeTiersReached(events, challenges),
  };
}

/**
 * Compute a single combined orchestration score (0-100) from the sub-metrics.
 * Weighted average with heavier emphasis on parallelization and DAG efficiency.
 */
export function computeCombinedScore(metrics: OrchestrationMetrics): number {
  const weighted =
    metrics.parallelizationScore * 0.30 +
    metrics.dagEfficiency * 0.30 +
    metrics.criticalPathSpeed * 0.20 +
    metrics.submissionConfidence * 0.20;
  return Math.round(weighted * 100);
}
