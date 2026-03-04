/**
 * Tier 4 Challenge: Calculation Audit (Round 5 — Tiered Tax Rates)
 *
 * Each line item has a category and a subtotal (qty × unitPrice).
 * Tax rates depend on BOTH category AND subtotal bracket (3 tiers).
 * Correct total: round(subtotal × (1 + tieredRate/100), 2).
 * Error rows use the wrong tier bracket's rate for their category.
 * Answer: sum of displayedTotal where displayedTotal === correctTieredTotal.
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

/** 3 subtotal brackets × 5 categories → 15 distinct rates */
interface TierBracket {
  label: string;
  min: number;
  max: number; // Infinity for last bracket
}

interface CalculationAuditPageData {
  lineItems: LineItem[];
  summaryTotal: number;
  /** Categories present in the tax schedule (agents must fetch full rates via interact) */
  categories: string[];
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

/** Look up the tiered rate for a category + subtotal combination */
function getTieredRate(
  category: string,
  subtotal: number,
  tieredRates: Record<string, Record<string, number>>,
  brackets: TierBracket[],
): number {
  // Use threshold comparison to avoid floating-point gaps between brackets
  const rounded = Math.round(subtotal * 100) / 100;
  const bracket = rounded <= brackets[0].max
    ? brackets[0]
    : rounded <= brackets[1].max
      ? brackets[1]
      : brackets[2];
  return tieredRates[category][bracket.label];
}

export const calculationAuditChallenge: ChallengeDefinition<CalculationAuditPageData> = {
  id: "tier4-calculation-audit",
  title: "Calculation Audit",
  tier: 4,
  points: 4,
  dependsOn: ["tier3-data-dashboard", "tier2-config-debugger"],
  description: "Audit an expense report — verify line-item totals using the tiered tax rate schedule, sum only correct rows.",

  instructions: (pageData) => {
    const variants = [
      `Review the expense report below. Tax rates depend on both category AND subtotal bracket (see the Tiered Tax Rate Schedule). ` +
      `For each row, compute: subtotal = qty × unit price, then find the bracket for that subtotal, look up the rate for the row's category in that bracket. ` +
      `Correct total = round(subtotal × (1 + rate / 100), 2). Sum ONLY displayed totals of correctly calculated rows. Submit rounded to 2 decimal places.`,

      `Audit this expense report. The Tax Rate Schedule has different rates depending on category AND subtotal range. ` +
      `Step 1: subtotal = qty × unit price. Step 2: find which bracket the subtotal falls into. Step 3: look up the rate for that category + bracket. ` +
      `Step 4: correct total = round(subtotal × (1 + rate/100), 2). Sum correct rows only. Round to 2 decimal places.`,

      `Each expense row's total should equal: round((qty × unit price) × (1 + tiered rate / 100), 2). ` +
      `The tiered rate depends on the row's category AND subtotal bracket — check the schedule. ` +
      `Include only rows where the displayed total matches this formula. Submit the sum, rounded to 2 decimal places.`,

      `The expense report uses tiered tax rates — the rate varies by both category and subtotal amount. ` +
      `Compute each row's subtotal (qty × unit price), determine the bracket, look up the rate, then verify: ` +
      `displayed total = round(subtotal × (1 + rate/100), 2). Sum the displayed totals of valid rows. Round to 2 decimal places.`,
    ];
    return variants[pageData.variantIndex];
  },

  generate(data: ChallengeData) {
    const variantIndex = data.int(0, 3);
    const itemCount = data.int(12, 18);
    const errorCount = data.int(3, 5);

    // Generate 3 subtotal brackets with random thresholds
    const threshold1 = data.int(300, 700);   // e.g., $500
    const threshold2 = data.int(1500, 3000);  // e.g., $2000
    const brackets: TierBracket[] = [
      { label: `≤$${threshold1}`, min: 0, max: threshold1 },
      { label: `$${threshold1 + 1}–$${threshold2}`, min: threshold1 + 1, max: threshold2 },
      { label: `>$${threshold2}`, min: threshold2 + 1, max: 999999 },
    ];

    // Generate tiered rates: 5 categories × 3 brackets = 15 rates (each 4-18%)
    const tieredTaxRates: Record<string, Record<string, number>> = {};
    for (const cat of EXPENSE_CATEGORIES) {
      tieredTaxRates[cat] = {};
      // Rates generally increase with higher brackets (but not strictly)
      let baseRate = data.int(4, 8);
      for (const bracket of brackets) {
        tieredTaxRates[cat][bracket.label] = baseRate;
        baseRate += data.int(1, 5); // step up for next bracket
      }
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
      const subtotal = quantity * unitPrice;
      const rate = getTieredRate(category, subtotal, tieredTaxRates, brackets);
      const correctTotal = Math.round(subtotal * (1 + rate / 100) * 100) / 100;

      let displayedTotal: number;
      if (errorIndices.has(i)) {
        // Error: use a DIFFERENT bracket's rate for the same category
        const rounded = Math.round(subtotal * 100) / 100;
        const correctBracketIdx = rounded <= brackets[0].max ? 0 : rounded <= brackets[1].max ? 1 : 2;
        const otherBracketIndices = [0, 1, 2].filter((idx) => idx !== correctBracketIdx);
        const wrongBracketIdx = data.pick(otherBracketIndices);
        const wrongRate = tieredTaxRates[category][brackets[wrongBracketIdx].label];
        displayedTotal = Math.round(subtotal * (1 + wrongRate / 100) * 100) / 100;
        // Ensure error row actually differs from correct
        if (displayedTotal === correctTotal) {
          displayedTotal = Math.round((correctTotal + data.int(1, 5) * 0.01) * 100) / 100;
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

    // Sum of ALL displayed totals (shown in summary card)
    const summaryTotal = Math.round(
      lineItems.reduce((sum, item) => sum + item.displayedTotal, 0) * 100
    ) / 100;

    // Correct answer: sum of rows where displayedTotal === correctTieredTotal
    let correctSum = 0;
    for (const item of lineItems) {
      const subtotal = item.quantity * item.unitPrice;
      const rate = getTieredRate(item.category, subtotal, tieredTaxRates, brackets);
      const expectedTotal = Math.round(subtotal * (1 + rate / 100) * 100) / 100;
      if (Math.abs(item.displayedTotal - expectedTotal) < 0.001) {
        correctSum += item.displayedTotal;
      }
    }

    const answer = (Math.round(correctSum * 100) / 100).toFixed(2);

    return {
      pageData: {
        lineItems,
        summaryTotal,
        categories: [...EXPENSE_CATEGORIES],
        variantIndex,
      },
      hiddenData: { tieredTaxRates, brackets },
      answer,
    };
  },

  interactActions: ["tax_schedule"],

  handleInteract(
    hiddenData: Record<string, unknown>,
    action: string,
  ) {
    if (action === "tax_schedule") {
      return {
        tieredTaxRates: hiddenData.tieredTaxRates,
        brackets: hiddenData.brackets,
      };
    }
    return { error: `Unknown action: ${action}` };
  },

  validateAnswer(submitted: string, correct: string): boolean {
    const s = parseFloat(submitted.trim());
    const c = parseFloat(correct);
    if (isNaN(s)) return false;
    return Math.abs(s - c) < 0.011;
  },
};
