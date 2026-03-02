/**
 * Tier 4 Challenge: Red Herring (Redesigned)
 *
 * TWO tables are shown:
 * - "Summary Report" (prominent, has subtly wrong values — one digit transposed)
 * - "Raw Data" (hidden behind a "View Raw Data" toggle, has correct values)
 *
 * Instructions say: "Use the raw data source to compute your answer"
 *
 * A fake pre-computed result card shows a value within 5-10% of correct.
 *
 * The trap: agents that compute from the visible summary table get a
 * close-but-wrong answer. Agents that trust the pre-computed card also fail.
 *
 * Tests: following instructions precisely, interacting with hidden UI,
 * resisting the path of least resistance.
 */

import type { ChallengeDefinition } from "../../../src/lib/challenge-types";
import type { ChallengeData } from "../../../src/lib/seed";

interface MetricRow {
  label: string;
  q1: number;
  q2: number;
  q3: number;
  q4: number;
}

interface RedHerringPageData {
  /** Summary table — visible but subtly wrong */
  summaryMetrics: MetricRow[];
  /** Raw data table — hidden behind toggle, has correct values */
  rawMetrics: MetricRow[];
  /** Pre-computed result — close but wrong */
  fakeResult: number;
  fakeLabel: string;
  targetMetric: string;
  targetQuarters: string[];
  operation: "sum" | "difference";
}

const METRIC_NAMES = [
  "Revenue", "Expenses", "Profit", "Users", "Churn Rate",
  "Conversion", "MRR", "ARR", "CAC", "LTV",
] as const;

export const redHerringChallenge: ChallengeDefinition<RedHerringPageData> = {
  id: "tier4-red-herring",
  title: "Quarterly Report",
  tier: 4,
  points: 4,
  description: "Analyze quarterly metrics using the raw data source.",

  instructions: (pageData) => {
    if (pageData.operation === "sum") {
      return `Find "${pageData.targetMetric}" and compute the sum of ${pageData.targetQuarters.join(" and ")}. ` +
        `Use the raw data source to compute your answer — do not use summary reports or pre-computed values. ` +
        `Submit the result.`;
    }
    return `Find "${pageData.targetMetric}" and compute the difference: ${pageData.targetQuarters[0]} minus ${pageData.targetQuarters[1]}. ` +
      `Use the raw data source to compute your answer — do not use summary reports or pre-computed values. ` +
      `Submit the result.`;
  },

  generate(data: ChallengeData) {
    // Generate the correct raw metrics
    const metricCount = data.int(5, 7);
    const metricNames = data.pickN(METRIC_NAMES, metricCount);

    const rawMetrics: MetricRow[] = metricNames.map((label) => ({
      label,
      q1: data.int(100, 5000),
      q2: data.int(100, 5000),
      q3: data.int(100, 5000),
      q4: data.int(100, 5000),
    }));

    // Pick target
    const targetMetric = data.pick(metricNames);
    const targetRow = rawMetrics.find((m) => m.label === targetMetric)!;

    const operation = data.pick(["sum", "difference"] as const);
    const allQuarters = ["Q1", "Q2", "Q3", "Q4"] as const;

    let targetQuarters: string[];
    let correctValue: number;

    if (operation === "sum") {
      targetQuarters = [...data.pickN(allQuarters, data.int(2, 3))];
      correctValue = targetQuarters.reduce((sum, q) => {
        const key = q.toLowerCase() as "q1" | "q2" | "q3" | "q4";
        return sum + targetRow[key];
      }, 0);
    } else {
      targetQuarters = [...data.pickN(allQuarters, 2)];
      const key1 = targetQuarters[0].toLowerCase() as "q1" | "q2" | "q3" | "q4";
      const key2 = targetQuarters[1].toLowerCase() as "q1" | "q2" | "q3" | "q4";
      correctValue = targetRow[key1] - targetRow[key2];
    }

    const answer = String(correctValue);

    // Create summary metrics with subtle errors (digit transposition on target row)
    const summaryMetrics: MetricRow[] = rawMetrics.map((row) => {
      if (row.label === targetMetric) {
        // Corrupt the target row values subtly
        return {
          label: row.label,
          q1: corruptValue(row.q1, data),
          q2: corruptValue(row.q2, data),
          q3: corruptValue(row.q3, data),
          q4: corruptValue(row.q4, data),
        };
      }
      // Other rows: 50% chance of also being slightly off (to avoid making it obvious)
      if (data.int(0, 1) === 1) {
        return {
          label: row.label,
          q1: corruptValue(row.q1, data),
          q2: row.q2,
          q3: row.q3,
          q4: corruptValue(row.q4, data),
        };
      }
      return { ...row };
    });

    // Pre-computed result: within 5-10% of the correct answer
    const errorFactor = 1 + (data.int(5, 10) / 100) * (data.int(0, 1) === 0 ? 1 : -1);
    const fakeResult = Math.round(correctValue * errorFactor);
    const fakeLabel = operation === "sum"
      ? `Total ${targetMetric} (${targetQuarters.join("+")})`
      : `${targetMetric} Change (${targetQuarters.join(" vs ")})`;

    return {
      pageData: {
        summaryMetrics,
        rawMetrics,
        fakeResult,
        fakeLabel,
        targetMetric,
        targetQuarters,
        operation,
      },
      answer,
    };
  },
};

/** Corrupt a numeric value subtly (swap two digits or offset by a small amount) */
function corruptValue(value: number, data: ChallengeData): number {
  const str = String(value);
  if (str.length >= 3) {
    // Swap two adjacent digits
    const pos = data.int(0, str.length - 2);
    const chars = str.split("");
    [chars[pos], chars[pos + 1]] = [chars[pos + 1], chars[pos]];
    const swapped = parseInt(chars.join(""), 10);
    if (swapped !== value && !isNaN(swapped)) return swapped;
  }
  // Fallback: offset by a small amount
  return value + data.int(1, 3) * (data.int(0, 1) === 0 ? 1 : -1);
}
