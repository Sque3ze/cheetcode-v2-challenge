/**
 * Tier 4 Challenge: Calculation Audit (Round 4 — Per-Category Tax Rates)
 *
 * Each line item has a category with a specific tax rate shown in a legend.
 * Correct total: round(qty × unitPrice × (1 + taxRate/100), 2).
 * Error rows use either wrong base math or wrong category's tax rate.
 * Answer: sum of displayedTotal where displayedTotal === correctTaxedTotal.
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
  taxRates: Record<string, number>;
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
  description: "Audit an expense report — verify line-item totals include the correct per-category tax rate, sum only correct rows.",

  instructions: (pageData) => {
    const variants = [
      `Review the expense report below. Each line item has a category with a specific tax rate (see the Tax Rate Schedule). ` +
      `A row's total should equal: qty × unit price × (1 + category tax rate / 100), rounded to 2 decimal places. ` +
      `Sum ONLY the displayed totals of rows where this formula holds. Submit rounded to 2 decimal places.`,

      `Audit this expense report. Each category has a tax rate shown in the Tax Rate Schedule. ` +
      `For each row, the correct total is qty × unit price × (1 + tax rate / 100), rounded to 2 decimals. ` +
      `Some rows have errors — wrong base calculation or wrong tax rate applied. ` +
      `Sum the displayed totals of correctly calculated rows only. Round to 2 decimal places.`,

      `Each expense row should reflect: quantity × unit price × (1 + category tax rate / 100). ` +
      `Look up each row's category in the Tax Rate Schedule to find the applicable rate. ` +
      `Include only rows where the displayed total matches this formula (to 2 decimal places). ` +
      `Submit the sum of correct rows, rounded to 2 decimal places.`,

      `The expense report below uses per-category tax rates. Check the Tax Rate Schedule for each category's rate. ` +
      `A valid row has displayed total = round(qty × unit price × (1 + rate/100), 2). ` +
      `Sum the displayed totals of valid rows. Round to 2 decimal places.`,
    ];
    return variants[pageData.variantIndex];
  },

  generate(data: ChallengeData) {
    const variantIndex = data.int(0, 3);
    const itemCount = data.int(12, 18);
    const errorCount = data.int(2, 4);

    // Generate per-category tax rates (5-15%)
    const taxRates: Record<string, number> = {};
    for (const cat of EXPENSE_CATEGORIES) {
      taxRates[cat] = data.int(5, 15);
    }

    // Pick which rows will have errors (not row 0)
    const errorIndices = new Set<number>();
    while (errorIndices.size < errorCount) {
      errorIndices.add(data.int(1, itemCount - 1));
    }

    const descriptions = data.pickN(EXPENSE_ITEMS, itemCount);
    const lineItems: LineItem[] = [];

    for (let i = 0; i < itemCount; i++) {
      const quantity = data.int(1, 25);
      const unitPrice = data.int(10, 500) + data.int(0, 99) / 100;
      const category = data.pick(EXPENSE_CATEGORIES);
      const rate = taxRates[category];
      const correctTotal = Math.round(quantity * unitPrice * (1 + rate / 100) * 100) / 100;

      let displayedTotal: number;
      if (errorIndices.has(i)) {
        const errorType = data.pick(["wrong_base", "wrong_tax"] as const);
        if (errorType === "wrong_base") {
          // Perturb the base (qty × unitPrice) by 3-10% before applying tax
          const errorPercent = data.int(3, 10);
          const direction = data.pick([1, -1] as const);
          const wrongBase = quantity * unitPrice * (1 + direction * errorPercent / 100);
          displayedTotal = Math.round(wrongBase * (1 + rate / 100) * 100) / 100;
        } else {
          // Apply a different category's tax rate
          const otherCategories = EXPENSE_CATEGORIES.filter((c) => c !== category);
          const wrongCat = data.pick(otherCategories);
          const wrongRate = taxRates[wrongCat];
          displayedTotal = Math.round(quantity * unitPrice * (1 + wrongRate / 100) * 100) / 100;
        }
        // Ensure error row actually differs from correct
        if (displayedTotal === correctTotal) {
          displayedTotal = Math.round((correctTotal + 0.01) * 100) / 100;
        }
      } else {
        displayedTotal = correctTotal;
      }

      lineItems.push({
        id: `EXP-${String(i + 1).padStart(3, "0")}`,
        description: descriptions[i],
        category,
        quantity,
        unitPrice,
        displayedTotal,
      });
    }

    // Sum of ALL displayed totals (the trap — shown in summary card)
    const summaryTotal = Math.round(
      lineItems.reduce((sum, item) => sum + item.displayedTotal, 0) * 100
    ) / 100;

    // Correct answer: sum of rows where displayedTotal === correctTaxedTotal
    let correctSum = 0;
    for (const item of lineItems) {
      const rate = taxRates[item.category];
      const expectedTotal = Math.round(item.quantity * item.unitPrice * (1 + rate / 100) * 100) / 100;
      if (Math.abs(item.displayedTotal - expectedTotal) < 0.001) {
        correctSum += item.displayedTotal;
      }
    }

    const answer = (Math.round(correctSum * 100) / 100).toFixed(2);

    return {
      pageData: { lineItems, taxRates, summaryTotal, variantIndex },
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
