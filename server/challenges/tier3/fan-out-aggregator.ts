/**
 * Tier 3 Challenge: Regional Revenue Aggregator (Fan-Out / Fan-In)
 *
 * Agent must independently collect data from N regional offices,
 * each behind a separate interact call, then aggregate using a
 * headquarters-level formula. Tests parallel data gathering and
 * multi-source computation.
 */

import type { ChallengeDefinition } from "../../../src/lib/challenge-types";
import type { ChallengeData } from "../../../src/lib/seed";

interface ProductData {
  name: string;
  unitsSold: number;
  unitPrice: number;
  returnRate: number; // percentage
}

interface OfficeInfo {
  id: string;
  name: string;
  region: string;
}

interface FanOutAggregatorPageData {
  offices: OfficeInfo[];
  taxRate: number;
  logisticsFee: number;
  formulaDescription: string;
  variantIndex: number;
}

const OFFICE_POOL = [
  { name: "New York HQ", region: "Americas" },
  { name: "London Office", region: "EMEA" },
  { name: "Tokyo Branch", region: "APAC" },
  { name: "Berlin Center", region: "EMEA" },
  { name: "Sydney Hub", region: "APAC" },
  { name: "Toronto Station", region: "Americas" },
] as const;

const PRODUCT_NAMES = [
  "Widget-A", "Module-B", "Sensor-C", "Drive-D", "Core-E",
  "Panel-F", "Relay-G", "Valve-H",
] as const;

export const fanOutAggregatorChallenge: ChallengeDefinition<FanOutAggregatorPageData> = {
  id: "tier3-fan-out-aggregator",
  title: "Regional Revenue Aggregator",
  tier: 3,
  points: 4,
  dependsOn: ["tier2-linked-data-lookup"],
  description: "Gather product data from multiple regional offices, then compute total net revenue using the HQ formula.",

  instructions: (pageData) => {
    const { offices } = pageData;
    const variants = [
      `Load product data from each of the ${offices.length} regional offices. For each product: net = (unitsSold × unitPrice × (1 − returnRate/100)) − (unitsSold × logisticsFee). Sum all product nets across all offices, then apply HQ tax: total × (1 − taxRate/100). Submit to 2 decimal places.`,
      `This HQ dashboard tracks ${offices.length} offices. Fetch each office's product data, compute per-product net revenue (accounting for returns and logistics), sum everything, then apply the tax rate. Round to 2 decimal places.`,
      `Collect product sales from all ${offices.length} offices. Per product: net revenue = units × price × (1 − return%) − units × logistics fee. Grand total = sum of all nets × (1 − tax%). Submit rounded to 2 decimal places.`,
      `Query each regional office for product data. Calculate net revenue per product (sales minus returns and logistics), aggregate across all offices, and apply the headquarters tax deduction. Submit to 2 decimal places.`,
    ];
    return variants[pageData.variantIndex];
  },

  generate(data: ChallengeData) {
    const variantIndex = data.int(0, 3);
    const officeCount = data.int(4, 6);
    const taxRate = data.int(5, 15);
    const logisticsFee = data.int(2, 8) + data.int(0, 99) / 100;

    const selectedOffices = data.pickN(OFFICE_POOL, officeCount);
    const offices: OfficeInfo[] = selectedOffices.map((o, i) => ({
      id: `office-${i + 1}`,
      name: o.name,
      region: o.region,
    }));

    const hiddenOffices: Record<string, { products: ProductData[] }> = {};

    for (const office of offices) {
      const productCount = data.int(3, 5);
      const productNames = data.pickN(PRODUCT_NAMES, productCount);
      const products: ProductData[] = productNames.map((name) => ({
        name,
        unitsSold: data.int(50, 500),
        unitPrice: data.int(10, 100) + data.int(0, 99) / 100,
        returnRate: data.int(1, 15),
      }));
      hiddenOffices[office.id] = { products };
    }

    let grandTotal = 0;
    for (const office of offices) {
      const { products } = hiddenOffices[office.id];
      for (const p of products) {
        const net = (p.unitsSold * p.unitPrice * (1 - p.returnRate / 100)) - (p.unitsSold * logisticsFee);
        grandTotal += net;
      }
    }
    const afterTax = grandTotal * (1 - taxRate / 100);
    const answer = (Math.round(afterTax * 100) / 100).toFixed(2);

    const formulaDescription =
      `Per product: net = (unitsSold × unitPrice × (1 − returnRate/100)) − (unitsSold × ${logisticsFee.toFixed(2)}). ` +
      `Sum all product nets across all offices, then apply tax: total × (1 − ${taxRate}/100).`;

    return {
      pageData: { offices, taxRate, logisticsFee, formulaDescription, variantIndex },
      hiddenData: { offices: hiddenOffices },
      answer,
    };
  },

  interactActions: ["office"],

  handleInteract(hiddenData, action, params) {
    if (action === "office") {
      const officeId = params.officeId as string | undefined;
      if (!officeId) {
        return { error: "Missing required parameter: officeId. Use { \"officeId\": \"office-N\" }." };
      }
      const offices = hiddenData.offices as Record<string, { products: ProductData[] }>;
      const office = offices[officeId];
      if (!office) {
        return { error: `Unknown officeId "${officeId}". Valid IDs: ${Object.keys(offices).join(", ")}` };
      }
      return office;
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
