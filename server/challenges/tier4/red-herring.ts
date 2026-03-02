/**
 * Tier 4 Challenge: Quarterly Report (Round 5 — Near-Consistent Decoy)
 *
 * TWO datasets in "Report A" and "Report B" tabs (non-semantic names).
 * Both have columns: Metric | Q1 | Q2 | Q3 | Q4 | Annual.
 * The correct dataset has Annual = Q1+Q2+Q3+Q4 for EVERY row.
 * The wrong dataset is ALMOST consistent — only ONE row has a subtle error (±1-3 in one quarter).
 * Agent must carefully validate both datasets mathematically to find the fully consistent one.
 */

import type { ChallengeDefinition } from "../../../src/lib/challenge-types";
import type { ChallengeData } from "../../../src/lib/seed";

interface MetricRow { label: string; q1: number; q2: number; q3: number; q4: number; annual: number; }

interface RedHerringPageData {
  dataA: MetricRow[];
  dataB?: MetricRow[];
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
  dependsOn: ["tier2-linked-data-lookup"],
  description: "Analyze quarterly metrics — find the internally consistent dataset, then compute the answer.",

  instructions: (pageData) => {
    const { targetMetric, targetQuarters, operation } = pageData;
    if (operation === "sum") {
      const qs = targetQuarters.join(" and ");
      const variants = [
        `This page has two datasets. One contains a calculation error — find the internally consistent dataset (where annual totals match quarterly sums for ALL metrics), then find "${targetMetric}" and compute the sum of ${qs}. Submit the result.`,
        `Two reports are shown. In one, every row's Annual column equals Q1+Q2+Q3+Q4; the other has an inconsistency. Use the consistent dataset to locate "${targetMetric}" and add ${qs}. Submit the total.`,
        `Verify which dataset is internally consistent (Annual = Q1+Q2+Q3+Q4 for every metric). From that dataset, find "${targetMetric}" and sum its ${qs} values. Submit the result.`,
        `One dataset has matching annual totals, the other doesn't. Identify the correct one, then compute the combined ${qs} value for "${targetMetric}". Submit your answer.`,
      ];
      return variants[pageData.variantIndex];
    }
    const variants = [
      `This page has two datasets. One contains a calculation error — find the internally consistent dataset (where annual totals match quarterly sums for ALL metrics), then find "${targetMetric}" and compute: ${targetQuarters[0]} minus ${targetQuarters[1]}. Submit the result.`,
      `Two reports are shown. Verify which one is internally consistent (Annual = sum of quarters for every row). From that dataset, look up "${targetMetric}" and subtract ${targetQuarters[1]} from ${targetQuarters[0]}. Submit the result.`,
      `Check both datasets for consistency (Annual should equal Q1+Q2+Q3+Q4). Use the valid one to compute ${targetQuarters[0]} - ${targetQuarters[1]} for "${targetMetric}". Submit your answer.`,
      `Find the dataset where every row's Annual matches its quarterly sum. Then compute the difference between ${targetQuarters[0]} and ${targetQuarters[1]} for "${targetMetric}". Submit the result.`,
    ];
    return variants[pageData.variantIndex];
  },

  generate(data: ChallengeData) {
    const variantIndex = data.int(0, 3);
    const metricCount = data.int(5, 7);
    const metricNames = data.pickN(METRIC_NAMES, metricCount);

    // Generate raw (correct) metrics with consistent annual totals
    const rawMetrics: MetricRow[] = metricNames.map((label) => {
      const q1 = data.int(100, 5000);
      const q2 = data.int(100, 5000);
      const q3 = data.int(100, 5000);
      const q4 = data.int(100, 5000);
      return { label, q1, q2, q3, q4, annual: q1 + q2 + q3 + q4 };
    });

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

    // Create near-consistent decoy: copy all rows perfectly EXCEPT one subtle error
    // Pick a random row (NOT the target metric) and corrupt ONE quarter by ±1-3
    const nonTargetIndices = rawMetrics
      .map((_, i) => i)
      .filter((i) => rawMetrics[i].label !== targetMetric);
    const corruptRowIdx = data.pick(nonTargetIndices);
    const corruptQuarter = data.pick(["q1", "q2", "q3", "q4"] as const);
    const corruptDelta = data.int(1, 3) * (data.int(0, 1) === 0 ? 1 : -1);

    const decoyMetrics: MetricRow[] = rawMetrics.map((row, i) => {
      if (i === corruptRowIdx) {
        // Corrupt one quarter value — but keep Annual as original sum
        // This creates: annual ≠ q1+q2+q3+q4 by exactly |corruptDelta|
        const corrupted = { ...row };
        corrupted[corruptQuarter] = row[corruptQuarter] + corruptDelta;
        // Annual stays as original sum → mismatch
        return corrupted;
      }
      // All other rows: perfectly consistent (annual = sum of quarters)
      return { ...row };
    });

    // Randomize which tab gets the correct data
    const correctTab = data.pick(["a", "b"] as const);
    const dataA = correctTab === "a" ? rawMetrics : decoyMetrics;
    const dataB = correctTab === "b" ? rawMetrics : decoyMetrics;

    const errorFactor = 1 + (data.int(5, 10) / 100) * (data.int(0, 1) === 0 ? 1 : -1);
    const fakeResult = Math.round(correctValue * errorFactor);
    const fakeLabel = operation === "sum"
      ? `Total ${targetMetric} (${targetQuarters.join("+")})`
      : `${targetMetric} Change (${targetQuarters.join(" vs ")})`;

    return {
      pageData: {
        dataA, fakeResult, fakeLabel,
        targetMetric, targetQuarters, operation, variantIndex,
      },
      hiddenData: { dataB },
      answer,
    };
  },

  interactActions: ["tab"],

  handleInteract(hiddenData, action, params) {
    if (action === "tab") {
      const tab = params.tab as string;
      if (tab === "b") return { dataB: hiddenData.dataB };
    }
    return null;
  },
};
