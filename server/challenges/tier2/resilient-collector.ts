/**
 * Tier 2 Challenge: Resilient Data Collector
 *
 * Agent must collect numeric values from N data sources via interact calls.
 * Some sources are "flaky" — they return unavailable responses until enough
 * real time has elapsed since page load. Tests retry resilience.
 */

import type { ChallengeDefinition, InteractContext } from "../../../src/lib/challenge-types";
import type { ChallengeData } from "../../../src/lib/seed";

interface SourceInfo {
  id: string;
  name: string;
  description: string;
  isStable: boolean;
}

interface ResilientCollectorPageData {
  sources: SourceInfo[];
  aggregationMethod: "sum" | "average";
  variantIndex: number;
}

interface SourceHidden {
  value: number;
  label: string;
  isFlaky: boolean;
  availableAfterMs: number;
}

const SOURCE_NAMES = [
  "Sensor-Alpha", "Relay-Beta", "Monitor-Gamma", "Probe-Delta",
  "Beacon-Epsilon", "Scanner-Zeta", "Tracker-Eta", "Logger-Theta",
] as const;

const SOURCE_DESCRIPTIONS = [
  "Primary data feed from north cluster",
  "Backup relay for east sector",
  "Environmental monitoring station",
  "Deep-scan probe for anomaly detection",
  "Signal beacon for perimeter network",
  "High-frequency scanner array",
  "Asset tracking subsystem",
  "Central event logging service",
] as const;

const SOURCE_LABELS = [
  "Throughput (req/s)", "Latency (ms)", "Error Rate (%)", "Uptime Score",
  "Bandwidth (Mbps)", "Queue Depth", "CPU Load (%)", "Memory Usage (MB)",
] as const;

export const resilientCollectorChallenge: ChallengeDefinition<ResilientCollectorPageData> = {
  id: "tier2-resilient-collector",
  title: "Resilient Data Collector",
  tier: 2,
  points: 4,
  dependsOn: ["tier1-tab-navigation"],
  description: "Collect data from multiple sources — some are temporarily unavailable and require retrying.",

  instructions: (pageData) => {
    const { aggregationMethod, sources } = pageData;
    const stableCount = sources.filter((s) => s.isStable).length;
    const flakyCount = sources.length - stableCount;
    const agg = aggregationMethod === "sum" ? "sum all values" : "compute the average of all values (to 2 decimal places)";

    const variants = [
      `This dashboard monitors ${sources.length} data sources. Fetch data from each source. ${flakyCount} sources may be temporarily unavailable — retry those until they respond. Once you have all values, ${agg}. Submit the result.`,
      `Collect readings from all ${sources.length} sources below. Some sources are intermittent and will return errors initially — keep retrying until successful. Then ${agg} and submit.`,
      `Query each of the ${sources.length} data sources. ${stableCount} are stable, but ${flakyCount} may fail on first attempt — retry those after a brief wait. ${aggregationMethod === "sum" ? "Sum all collected values" : "Average all collected values (2 decimal places)"}. Submit your answer.`,
      `Fetch data from every source on the panel. Intermittent sources will indicate when to retry. Once all data is collected, ${agg}. Submit the result.`,
    ];
    return variants[pageData.variantIndex];
  },

  generate(data: ChallengeData) {
    const variantIndex = data.int(0, 3);
    const sourceCount = data.int(6, 8);
    const flakyCount = data.int(2, 3);
    const aggregationMethod = data.pick(["sum", "average"] as const);

    const names = data.pickN(SOURCE_NAMES, sourceCount);
    const labels = data.pickN(SOURCE_LABELS, sourceCount);

    const flakyIndices = new Set<number>();
    while (flakyIndices.size < flakyCount) {
      flakyIndices.add(data.int(0, sourceCount - 1));
    }

    const sources: SourceInfo[] = [];
    const hiddenSources: Record<string, SourceHidden> = {};

    for (let i = 0; i < sourceCount; i++) {
      const id = `src-${i + 1}`;
      const isFlaky = flakyIndices.has(i);
      const value = data.int(100, 9999);
      const availableAfterMs = isFlaky ? data.int(3000, 8000) : 0;

      sources.push({
        id,
        name: names[i],
        description: SOURCE_DESCRIPTIONS[i % SOURCE_DESCRIPTIONS.length],
        isStable: !isFlaky,
      });

      hiddenSources[id] = {
        value,
        label: labels[i],
        isFlaky,
        availableAfterMs,
      };
    }

    const allValues = Object.values(hiddenSources).map((s) => s.value);
    const total = allValues.reduce((sum, v) => sum + v, 0);
    const answer = aggregationMethod === "sum"
      ? String(total)
      : (total / allValues.length).toFixed(2);

    return {
      pageData: { sources, aggregationMethod, variantIndex },
      hiddenData: { sources: hiddenSources },
      answer,
    };
  },

  interactActions: ["fetch"],

  handleInteract(hiddenData, action, params, context?: InteractContext) {
    if (action === "fetch") {
      const sourceId = params.sourceId as string;
      const sources = hiddenData.sources as Record<string, SourceHidden>;
      if (!sourceId) {
        return { error: "Missing required parameter: sourceId. Use { \"sourceId\": \"src-N\" }." };
      }
      const source = sources[sourceId];
      if (!source) {
        return { error: `Unknown sourceId "${sourceId}". Valid IDs: ${Object.keys(sources).join(", ")}` };
      }

      // Stable source — always available
      if (!source.isFlaky || source.availableAfterMs === 0) {
        return { status: "ok", value: source.value, label: source.label };
      }

      // Flaky source — check time elapsed since page load
      const viewedAt = context?.viewedAt ?? 0;
      const elapsed = Date.now() - viewedAt;
      if (elapsed >= source.availableAfterMs) {
        return { status: "ok", value: source.value, label: source.label };
      }

      const retryAfterMs = source.availableAfterMs - elapsed;
      return {
        status: "unavailable",
        retryAfterMs,
        message: "Source temporarily unavailable. Try again shortly.",
      };
    }
    return null;
  },

  validateAnswer(submitted: string, correct: string): boolean {
    const s = parseFloat(submitted.trim());
    const c = parseFloat(correct);
    if (isNaN(s)) return false;
    return Math.abs(s - c) < 0.011;
  },
};
