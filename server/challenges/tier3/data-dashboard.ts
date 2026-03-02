/**
 * Tier 3 Challenge: Data Dashboard (Major Rework)
 *
 * Sales, Costs, and Taxes each in separate tabs (forces tab switching).
 * Sales table is paginated (2 pages).
 * Quarter filter requirement: "Compute profit for Q2 and Q3 only".
 * Misleading "Quick Stats" card showing wrong pre-computed totals.
 *
 * Tests: tab switching, pagination, quarter filtering, cross-referencing
 * 3 data sources, ignoring misleading summary data.
 */

import type { ChallengeDefinition } from "../../../src/lib/challenge-types";
import type { ChallengeData } from "../../../src/lib/seed";

interface SalesRow {
  id: string;
  region: string;
  product: string;
  revenue: number;
  units: number;
  quarter: string;
}

interface CostRow {
  product: string;
  costPerUnit: number;
  shipping: number;
}

interface TaxRow {
  region: string;
  taxRate: number;
}

interface DataDashboardPageData {
  sales: SalesRow[];
  costs: CostRow[];
  taxes: TaxRow[];
  targetProduct: string;
  targetRegion: string;
  targetQuarters: string[];
  /** Wrong pre-computed total shown in Quick Stats */
  quickStatsTotal: number;
  salesPerPage: number;
}

const REGIONS = ["North", "South", "East", "West", "Central"] as const;
const PRODUCTS = [
  "AlphaWidget", "BetaModule", "GammaSensor", "DeltaDrive", "EpsilonCore",
] as const;
const QUARTERS = ["Q1", "Q2", "Q3", "Q4"] as const;

export const dataDashboardChallenge: ChallengeDefinition<DataDashboardPageData> = {
  id: "tier3-data-dashboard",
  title: "Data Dashboard",
  tier: 3,
  description: "Cross-reference sales, costs, and tax data across tabs to compute profit.",

  instructions: (pageData) =>
    `Analyze the dashboard. Find all sales of "${pageData.targetProduct}" in the "${pageData.targetRegion}" region ` +
    `for ${pageData.targetQuarters.join(" and ")} only. ` +
    `For each matching sale, compute the profit: (revenue - units × cost_per_unit - shipping) × (1 - tax_rate/100). ` +
    `Look up cost_per_unit and shipping in the Costs tab, and tax_rate in the Taxes tab. ` +
    `Submit the total profit across all matching sales, rounded to 2 decimal places.`,

  generate(data: ChallengeData) {
    // Generate costs for each product
    const products = data.shuffle(PRODUCTS).slice(0, data.int(4, 5));
    const costs: CostRow[] = products.map((product) => ({
      product,
      costPerUnit: data.int(5, 40) + data.int(0, 99) / 100,
      shipping: data.int(10, 100) + data.int(0, 99) / 100,
    }));

    // Generate tax rates for each region
    const regions = data.shuffle(REGIONS).slice(0, data.int(4, 5));
    const taxes: TaxRow[] = regions.map((region) => ({
      region,
      taxRate: data.int(5, 25),
    }));

    // Generate more sales rows (enough to need pagination)
    const salesCount = data.int(18, 26);
    const sales: SalesRow[] = [];
    for (let i = 0; i < salesCount; i++) {
      sales.push({
        id: `S-${String(i + 1).padStart(3, "0")}`,
        region: data.pick(regions),
        product: data.pick(products),
        revenue: data.int(200, 2000) + data.int(0, 99) / 100,
        units: data.int(5, 50),
        quarter: data.pick(QUARTERS),
      });
    }

    // Pick target product, region, and quarter filter (2 quarters)
    const targetQuarters: string[] = [...data.pickN(QUARTERS, 2)];

    let targetProduct: string;
    let targetRegion: string;
    let matching: SalesRow[];

    // Ensure at least 1 match exists for the filtered criteria
    do {
      targetProduct = data.pick(products);
      targetRegion = data.pick(regions);
      matching = sales.filter(
        (s) =>
          s.product === targetProduct &&
          s.region === targetRegion &&
          targetQuarters.includes(s.quarter)
      );
    } while (matching.length === 0);

    // Compute correct answer (only matching product + region + quarters)
    const cost = costs.find((c) => c.product === targetProduct)!;
    const tax = taxes.find((t) => t.region === targetRegion)!;

    const totalProfit = matching.reduce((sum, sale) => {
      const grossProfit = sale.revenue - sale.units * cost.costPerUnit - cost.shipping;
      const netProfit = grossProfit * (1 - tax.taxRate / 100);
      return sum + netProfit;
    }, 0);

    const answer = (Math.round(totalProfit * 100) / 100).toFixed(2);

    // Compute WRONG Quick Stats total (all quarters, not just target quarters)
    const allMatching = sales.filter(
      (s) => s.product === targetProduct && s.region === targetRegion
    );
    const wrongProfit = allMatching.reduce((sum, sale) => {
      const grossProfit = sale.revenue - sale.units * cost.costPerUnit - cost.shipping;
      const netProfit = grossProfit * (1 - tax.taxRate / 100);
      return sum + netProfit;
    }, 0);
    const quickStatsTotal = Math.round(wrongProfit * 100) / 100;

    const salesPerPage = 10;

    return {
      pageData: {
        sales,
        costs,
        taxes,
        targetProduct,
        targetRegion,
        targetQuarters,
        quickStatsTotal,
        salesPerPage,
      },
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
