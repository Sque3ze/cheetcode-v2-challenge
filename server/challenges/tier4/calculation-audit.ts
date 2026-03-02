/**
 * Tier 4 Challenge: Calculation Audit (Round 3 — Running Totals)
 *
 * Each line item now has a running total. Error rows have wrong displayedTotal,
 * which makes their running total AND all subsequent running totals wrong.
 * New question: "Sum displayed totals of rows where BOTH the line-item math
 * (qty × unitPrice) AND the running total are correct."
 */

import type { ChallengeDefinition } from "../../../src/lib/challenge-types";
import type { ChallengeData } from "../../../src/lib/seed";

interface LineItem {
  id: string;
  description: string;
  category: string;
  quantity: number;
  unitPrice: number;
  displayedTotal: number;
  runningTotal: number;
}

interface CalculationAuditPageData {
  lineItems: LineItem[];
  summaryTotal: number;
  variantIndex: number;
}

const EXPENSE_ITEMS = [
  "Office Supplies", "Software License", "Travel Expense", "Equipment Rental",
  "Consulting Fee", "Cloud Hosting", "Marketing Materials", "Training Course",
  "Maintenance Contract", "Shipping Charges", "Catering Service", "Print Services",
  "Data Storage Plan", "Security Audit", "Legal Review", "Hardware Component",
  "API Subscription", "Domain Renewal",
] as const;

const EXPENSE_CATEGORIES = [
  "Operations", "Technology", "Marketing", "Professional Services", "Facilities",
] as const;

export const calculationAuditChallenge: ChallengeDefinition<CalculationAuditPageData> = {
  id: "tier4-calculation-audit",
  title: "Calculation Audit",
  tier: 4,
  points: 4,
  description: "Audit an expense report — verify line-item math and running totals, sum only fully correct rows.",

  instructions: (pageData) => {
    const variants = [
      `Review the expense report below. Each line item shows quantity, unit price, a displayed total, and a running total. ` +
      `A row is correct ONLY if: (1) displayed total = quantity × unit price, AND (2) the running total = previous running total + displayed total. ` +
      `Note: if a row has a wrong displayed total, its running total and ALL subsequent running totals will also be wrong. ` +
      `Sum ONLY the displayed totals of rows where BOTH checks pass. Submit rounded to 2 decimal places.`,

      `Audit this expense report. Each row has a running total that should equal the cumulative sum of displayed totals. ` +
      `Verify: (1) displayed total matches qty × unit price, (2) running total matches previous + current displayed total. ` +
      `An error propagates — once a row is wrong, all rows after it have incorrect running totals too. ` +
      `Sum the displayed totals of fully verified rows only. Round to 2 decimal places.`,

      `Each expense row has a line total and a running total. Check each row: ` +
      `does the displayed total equal quantity × unit price? Does the running total equal the previous running total plus this row's displayed total? ` +
      `Errors propagate through running totals. Include only rows where BOTH the line math and running total are correct. ` +
      `Submit the sum to 2 decimal places.`,

      `The expense report below includes running totals. A row is valid only if its displayed total = qty × unit price AND ` +
      `its running total = sum of all displayed totals up to and including this row. ` +
      `Remember: a single error makes all subsequent running totals wrong. ` +
      `Sum the displayed totals of valid rows. Round to 2 decimal places.`,
    ];
    return variants[pageData.variantIndex];
  },

  generate(data: ChallengeData) {
    const variantIndex = data.int(0, 3);
    const itemCount = data.int(12, 18);
    const errorCount = data.int(2, 4);

    // Pick which rows will have line-item errors (ensure first error is not row 0 to have some valid rows)
    const errorIndices = new Set<number>();
    while (errorIndices.size < errorCount) {
      errorIndices.add(data.int(1, itemCount - 1));
    }

    const descriptions = data.pickN(EXPENSE_ITEMS, itemCount);
    const lineItems: LineItem[] = [];
    let correctRunningTotal = 0;
    let displayedRunningTotal = 0;

    for (let i = 0; i < itemCount; i++) {
      const quantity = data.int(1, 25);
      const unitPrice = data.int(10, 500) + data.int(0, 99) / 100;
      const correctTotal = Math.round(quantity * unitPrice * 100) / 100;

      let displayedTotal: number;
      if (errorIndices.has(i)) {
        const errorPercent = data.int(3, 10);
        const direction = data.pick([1, -1] as const);
        displayedTotal = Math.round(correctTotal * (1 + direction * errorPercent / 100) * 100) / 100;
        if (displayedTotal === correctTotal) {
          displayedTotal = Math.round((correctTotal + direction * 0.01) * 100) / 100;
        }
      } else {
        displayedTotal = correctTotal;
      }

      // Running total uses the DISPLAYED totals (so errors propagate)
      displayedRunningTotal = Math.round((displayedRunningTotal + displayedTotal) * 100) / 100;

      lineItems.push({
        id: `EXP-${String(i + 1).padStart(3, "0")}`,
        description: descriptions[i],
        category: data.pick(EXPENSE_CATEGORIES),
        quantity,
        unitPrice,
        displayedTotal,
        runningTotal: displayedRunningTotal,
      });
    }

    // Sum of ALL displayed totals (the trap — shown in summary card)
    const summaryTotal = Math.round(
      lineItems.reduce((sum, item) => sum + item.displayedTotal, 0) * 100
    ) / 100;

    // Correct answer: sum of rows where BOTH line-item math AND running total are correct
    // A row's running total is correct only if ALL previous rows' displayed totals are correct too
    let expectedRunning = 0;
    let correctSum = 0;
    let runningStillValid = true;

    for (const item of lineItems) {
      const expectedLineTotal = Math.round(item.quantity * item.unitPrice * 100) / 100;
      const lineCorrect = item.displayedTotal === expectedLineTotal;
      expectedRunning = Math.round((expectedRunning + item.displayedTotal) * 100) / 100;
      const runningCorrect = Math.abs(item.runningTotal - expectedRunning) < 0.001;

      if (!lineCorrect) {
        runningStillValid = false;
      }

      if (lineCorrect && runningStillValid && runningCorrect) {
        correctSum += item.displayedTotal;
      }
    }

    const answer = (Math.round(correctSum * 100) / 100).toFixed(2);

    return {
      pageData: { lineItems, summaryTotal, variantIndex },
      answer,
    };
  },

  validateAnswer(submitted: string, correct: string): boolean {
    const s = parseFloat(submitted.trim());
    const c = parseFloat(correct);
    if (isNaN(s)) return false;
    return Math.abs(s - c) < 0.011;
  },
};
