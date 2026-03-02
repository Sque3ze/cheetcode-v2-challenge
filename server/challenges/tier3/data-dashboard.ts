/**
 * Tier 3 Challenge: Data Dashboard (Major Rework)
 *
 * Sales, Costs, and Taxes each in separate tabs (forces tab switching).
 * Sales table is paginated (2 pages).
 * Quarter filter requirement: "Compute profit for Q2 and Q3 only".
 * Misleading "Quick Stats" card showing wrong pre-computed totals.
 */

import type { ChallengeDefinition } from "../../../src/lib/challenge-types";
import type { ChallengeData } from "../../../src/lib/seed";

interface SalesRow { id: string; region: string; product: string; revenue: number; units: number; quarter: string; }
interface CostRow { product: string; costPerUnit: number; shipping: number; }
interface TaxRow { region: string; taxRate: number; }

interface DataDashboardPageData {
  sales: SalesRow[];
  costs?: CostRow[];
  taxes?: TaxRow[];
  totalSales?: number;
  targetProduct: string;
  targetRegion: string;
  targetQuarters: string[];
  quickStatsTotal: number;
  salesPerPage: number;
  variantIndex: number;
}

const REGIONS = ["North", "South", "East", "West", "Central"] as const;
const PRODUCTS = ["AlphaWidget", "BetaModule", "GammaSensor", "DeltaDrive", "EpsilonCore"] as const;
const QUARTERS = ["Q1", "Q2", "Q3", "Q4"] as const;

export const dataDashboardChallenge: ChallengeDefinition<DataDashboardPageData> = {
  id: "tier3-data-dashboard",
  title: "Data Dashboard",
  tier: 3,
  dependsOn: ["tier2-sequential-calculator"],
  description: "Cross-reference sales, costs, and tax data across tabs to compute profit.",

  instructions: (pageData) => {
    const { targetProduct, targetRegion, targetQuarters } = pageData;
    const qs = targetQuarters.join(" and ");
    const variants = [
      `Analyze the dashboard. Find all sales of "${targetProduct}" in the "${targetRegion}" region for ${qs} only. ` +
      `For each matching sale, compute the profit: (revenue - units × cost_per_unit - shipping) × (1 - tax_rate/100). ` +
      `Look up cost_per_unit and shipping in the Costs tab, and tax_rate in the Taxes tab. ` +
      `Submit the total profit across all matching sales, rounded to 2 decimal places.`,

      `Using the dashboard tabs, locate "${targetProduct}" sales in "${targetRegion}" limited to ${qs}. ` +
      `Calculate each sale's profit as (revenue - units × cost_per_unit - shipping) × (1 - tax_rate/100). ` +
      `Get cost_per_unit and shipping from Product Costs, tax_rate from Regional Taxes. Sum all profits and round to 2 decimals.`,

      `Cross-reference the three tabs to compute total profit for "${targetProduct}" / "${targetRegion}" during ${qs}. ` +
      `Profit per sale = (revenue - units × cost_per_unit - shipping) × (1 - tax_rate/100). ` +
      `Round the total to 2 decimal places.`,

      `Find every "${targetProduct}" sale in "${targetRegion}" for ${qs} from the Sales tab. ` +
      `For each, apply: profit = (revenue - units × cost_per_unit - shipping) × (1 - tax_rate/100). ` +
      `Use the Costs and Taxes tabs for lookup values. Submit the summed profit to 2 decimals.`,
    ];
    return variants[pageData.variantIndex];
  },

  generate(data: ChallengeData) {
    const variantIndex = data.int(0, 3);
    const products = data.shuffle(PRODUCTS).slice(0, data.int(4, 5));
    const costs: CostRow[] = products.map((product) => ({
      product,
      costPerUnit: data.int(5, 40) + data.int(0, 99) / 100,
      shipping: data.int(10, 100) + data.int(0, 99) / 100,
    }));

    const regions = data.shuffle(REGIONS).slice(0, data.int(4, 5));
    const taxes: TaxRow[] = regions.map((region) => ({
      region, taxRate: data.int(5, 25),
    }));

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

    const targetQuarters: string[] = [...data.pickN(QUARTERS, 2)];
    let targetProduct: string;
    let targetRegion: string;
    let matching: SalesRow[];

    do {
      targetProduct = data.pick(products);
      targetRegion = data.pick(regions);
      matching = sales.filter(
        (s) => s.product === targetProduct && s.region === targetRegion && targetQuarters.includes(s.quarter)
      );
    } while (matching.length === 0);

    const cost = costs.find((c) => c.product === targetProduct)!;
    const tax = taxes.find((t) => t.region === targetRegion)!;

    const totalProfit = matching.reduce((sum, sale) => {
      const grossProfit = sale.revenue - sale.units * cost.costPerUnit - cost.shipping;
      return sum + grossProfit * (1 - tax.taxRate / 100);
    }, 0);

    const answer = (Math.round(totalProfit * 100) / 100).toFixed(2);

    const allMatching = sales.filter((s) => s.product === targetProduct && s.region === targetRegion);
    const wrongProfit = allMatching.reduce((sum, sale) => {
      const grossProfit = sale.revenue - sale.units * cost.costPerUnit - cost.shipping;
      return sum + grossProfit * (1 - tax.taxRate / 100);
    }, 0);
    const quickStatsTotal = Math.round(wrongProfit * 100) / 100;

    // Gate: only sales page 1 visible initially; costs and taxes behind tabs
    const salesPerPage = 10;
    const salesPages: Record<number, SalesRow[]> = {};
    for (let i = 0; i < Math.ceil(sales.length / salesPerPage); i++) {
      salesPages[i] = sales.slice(i * salesPerPage, (i + 1) * salesPerPage);
    }

    return {
      pageData: {
        sales: salesPages[0] ?? [],
        totalSales: sales.length,
        targetProduct, targetRegion, targetQuarters,
        quickStatsTotal, salesPerPage, variantIndex,
      },
      hiddenData: { costs, taxes, salesPages },
      answer,
    };
  },

  interactActions: ["tab", "page"],

  handleInteract(hiddenData, action, params) {
    if (action === "tab") {
      const tab = params.tab as string;
      if (tab === "costs") return { costs: hiddenData.costs };
      if (tab === "taxes") return { taxes: hiddenData.taxes };
    }
    if (action === "page") {
      const page = (params.page as number) ?? 0;
      const salesPages = hiddenData.salesPages as Record<number, unknown[]>;
      return { sales: salesPages[page] ?? [], page };
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
