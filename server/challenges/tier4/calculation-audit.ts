/**
 * Tier 4 Challenge: Calculation Audit
 *
 * An expense report table with line items (item, qty, unit price, displayed total).
 * 3-5 rows have intentionally wrong calculations (off by 3-10%).
 * Agent must verify each row's math (qty × unitPrice) and sum only the correct ones.
 *
 * Why it's harder than prompt-injection:
 * - No explicit "ignore X" instruction — just says "verify each line item"
 * - Requires actual math per row (not just filtering by a status label)
 * - Errors are subtle (not color-coded) — no visual distinction
 * - Quick Summary card shows total of ALL rows (trap)
 * - Agents naturally trust displayed totals
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
  description: "Audit an expense report — verify each line item's math and sum only correctly calculated rows.",

  instructions: (pageData) => {
    const variants = [
      `Review the expense report below. Each line item shows quantity, unit price, and a displayed total. ` +
      `Verify each row by computing quantity × unit price. Some rows have incorrect totals. ` +
      `Sum ONLY the displayed totals of rows where the displayed total exactly matches quantity × unit price. ` +
      `Submit the sum rounded to 2 decimal places.`,

      `Audit this expense report. For every line item, check whether displayed total equals qty × unit price. ` +
      `Add up the displayed totals from correctly calculated rows only. Ignore rows where the math doesn't check out. ` +
      `Round your answer to 2 decimal places.`,

      `Each expense row shows a total, but not all are correct. Multiply quantity by unit price for each row. ` +
      `If a row's displayed total matches that product, include it in your sum. Skip mismatched rows. ` +
      `Submit the sum to 2 decimal places.`,

      `The table below is an expense report. Some line totals contain errors. ` +
      `For each row, verify: does displayed total = quantity × unit price? ` +
      `Sum the displayed totals of verified (correct) rows only and submit, rounded to 2 decimals.`,
    ];
    return variants[pageData.variantIndex];
  },

  generate(data: ChallengeData) {
    const variantIndex = data.int(0, 3);
    const itemCount = data.int(12, 18);
    const errorCount = data.int(3, 5);

    // Pick which rows will have errors
    const errorIndices = new Set<number>();
    while (errorIndices.size < errorCount) {
      errorIndices.add(data.int(0, itemCount - 1));
    }

    const descriptions = data.pickN(EXPENSE_ITEMS, itemCount);
    const lineItems: LineItem[] = [];

    for (let i = 0; i < itemCount; i++) {
      const quantity = data.int(1, 25);
      const unitPrice = data.int(10, 500) + data.int(0, 99) / 100;
      const correctTotal = Math.round(quantity * unitPrice * 100) / 100;

      let displayedTotal: number;
      if (errorIndices.has(i)) {
        // Apply a small multiplicative error (3-10%) — looks plausible
        const errorPercent = data.int(3, 10);
        const direction = data.pick([1, -1] as const);
        displayedTotal = Math.round(correctTotal * (1 + direction * errorPercent / 100) * 100) / 100;
        // Ensure error is actually different
        if (displayedTotal === correctTotal) {
          displayedTotal = Math.round((correctTotal + direction * 0.01) * 100) / 100;
        }
      } else {
        displayedTotal = correctTotal;
      }

      lineItems.push({
        id: `EXP-${String(i + 1).padStart(3, "0")}`,
        description: descriptions[i],
        category: data.pick(EXPENSE_CATEGORIES),
        quantity,
        unitPrice,
        displayedTotal,
      });
    }

    // Sum of ALL displayed totals (the trap — shown in summary card)
    const summaryTotal = Math.round(
      lineItems.reduce((sum, item) => sum + item.displayedTotal, 0) * 100
    ) / 100;

    // Correct answer: sum of only correctly calculated rows
    const correctSum = lineItems.reduce((sum, item) => {
      const expected = Math.round(item.quantity * item.unitPrice * 100) / 100;
      if (item.displayedTotal === expected) {
        return sum + item.displayedTotal;
      }
      return sum;
    }, 0);

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
