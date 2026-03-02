/**
 * Tier 4 Challenge: Red Herring (Redesigned)
 *
 * TWO tables: "Summary Report" (prominent, subtly wrong) and "Raw Data" (hidden, correct).
 * A fake pre-computed result card shows a value within 5-10% of correct.
 */

import type { ChallengeDefinition } from "../../../src/lib/challenge-types";
import type { ChallengeData } from "../../../src/lib/seed";

interface MetricRow { label: string; q1: number; q2: number; q3: number; q4: number; }

interface RedHerringPageData {
  summaryMetrics: MetricRow[];
  rawMetrics: MetricRow[];
  fakeResult: number;
  fakeLabel: string;
  targetMetric: string;
  targetQuarters: string[];
  operation: "sum" | "difference";
  variantIndex: number;
}

const METRIC_NAMES = ["Revenue", "Expenses", "Profit", "Users", "Churn Rate", "Conversion", "MRR", "ARR", "CAC", "LTV"] as const;

export const redHerringChallenge: ChallengeDefinition<RedHerringPageData> = {
  id: "tier4-red-herring",
  title: "Quarterly Report",
  tier: 4,
  points: 4,
  description: "Analyze quarterly metrics using the raw data source.",

  instructions: (pageData) => {
    const { targetMetric, targetQuarters, operation } = pageData;
    if (operation === "sum") {
      const qs = targetQuarters.join(" and ");
      const variants = [
        `Find "${targetMetric}" and compute the sum of ${qs}. Use the raw data source to compute your answer — do not use summary reports or pre-computed values. Submit the result.`,
        `Locate "${targetMetric}" in the raw data. Add the values for ${qs} together and submit the total. Ignore the summary table and pre-computed card.`,
        `What is the combined ${qs} value for "${targetMetric}"? Use raw data only — summary reports may be inaccurate. Submit the sum.`,
        `From the raw data source, find "${targetMetric}". Sum its ${qs} values. Do not rely on the summary or pre-computed figures.`,
      ];
      return variants[pageData.variantIndex];
    }
    const variants = [
      `Find "${targetMetric}" and compute the difference: ${targetQuarters[0]} minus ${targetQuarters[1]}. Use the raw data source to compute your answer — do not use summary reports or pre-computed values. Submit the result.`,
      `In the raw data, look up "${targetMetric}". Subtract ${targetQuarters[1]} from ${targetQuarters[0]} and submit. Ignore the summary report.`,
      `Compute ${targetQuarters[0]} - ${targetQuarters[1]} for "${targetMetric}" using raw data only. Do not trust summary or pre-computed values.`,
      `From the raw data, find "${targetMetric}" and calculate the difference between ${targetQuarters[0]} and ${targetQuarters[1]}. Submit that number.`,
    ];
    return variants[pageData.variantIndex];
  },

  generate(data: ChallengeData) {
    const variantIndex = data.int(0, 3);
    const metricCount = data.int(5, 7);
    const metricNames = data.pickN(METRIC_NAMES, metricCount);

    const rawMetrics: MetricRow[] = metricNames.map((label) => ({
      label, q1: data.int(100, 5000), q2: data.int(100, 5000), q3: data.int(100, 5000), q4: data.int(100, 5000),
    }));

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

    const summaryMetrics: MetricRow[] = rawMetrics.map((row) => {
      if (row.label === targetMetric) {
        return {
          label: row.label,
          q1: corruptValue(row.q1, data), q2: corruptValue(row.q2, data),
          q3: corruptValue(row.q3, data), q4: corruptValue(row.q4, data),
        };
      }
      if (data.int(0, 1) === 1) {
        return {
          label: row.label,
          q1: corruptValue(row.q1, data), q2: row.q2,
          q3: row.q3, q4: corruptValue(row.q4, data),
        };
      }
      return { ...row };
    });

    const errorFactor = 1 + (data.int(5, 10) / 100) * (data.int(0, 1) === 0 ? 1 : -1);
    const fakeResult = Math.round(correctValue * errorFactor);
    const fakeLabel = operation === "sum"
      ? `Total ${targetMetric} (${targetQuarters.join("+")})`
      : `${targetMetric} Change (${targetQuarters.join(" vs ")})`;

    return {
      pageData: {
        summaryMetrics, rawMetrics, fakeResult, fakeLabel,
        targetMetric, targetQuarters, operation, variantIndex,
      },
      answer,
    };
  },
};

function corruptValue(value: number, data: ChallengeData): number {
  const str = String(value);
  if (str.length >= 3) {
    const pos = data.int(0, str.length - 2);
    const chars = str.split("");
    [chars[pos], chars[pos + 1]] = [chars[pos + 1], chars[pos]];
    const swapped = parseInt(chars.join(""), 10);
    if (swapped !== value && !isNaN(swapped)) return swapped;
  }
  return value + data.int(1, 3) * (data.int(0, 1) === 0 ? 1 : -1);
}
