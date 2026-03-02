/**
 * Tier 1 Challenge: Dropdown Select (Moderate Rework)
 *
 * Changes: Compound conditions ("best price-to-rating ratio",
 * "most expensive in-stock item"). Card grid instead of table.
 * Requires computation, not just min/max of one column.
 */

import type { ChallengeDefinition } from "../../../src/lib/challenge-types";
import type { ChallengeData } from "../../../src/lib/seed";

interface DropdownSelectPageData {
  products: Array<{
    name: string;
    price: number;
    category: string;
    rating: number;
    stock: number;
  }>;
  condition: string;
  conditionType: string;
}

type ConditionDef = {
  label: string;
  type: string;
  evaluate: (products: DropdownSelectPageData["products"]) => string;
};

const CONDITIONS: ConditionDef[] = [
  {
    label: "best price-to-rating ratio (lowest price/rating)",
    type: "best-price-to-rating",
    evaluate: (products) =>
      products.reduce((best, p) =>
        (p.price / p.rating) < (best.price / best.rating) ? p : best, products[0]
      ).name,
  },
  {
    label: "most expensive in-stock item (stock > 0)",
    type: "most-expensive-in-stock",
    evaluate: (products) => {
      const inStock = products.filter((p) => p.stock > 0);
      return inStock.reduce((max, p) => (p.price > max.price ? p : max), inStock[0]).name;
    },
  },
  {
    label: "highest total value (price × stock)",
    type: "highest-total-value",
    evaluate: (products) =>
      products.reduce((max, p) =>
        (p.price * p.stock) > (max.price * max.stock) ? p : max, products[0]
      ).name,
  },
  {
    label: "best rated item under $200",
    type: "best-rated-under-200",
    evaluate: (products) => {
      const under200 = products.filter((p) => p.price < 200);
      return under200.reduce((max, p) => (p.rating > max.rating ? p : max), under200[0]).name;
    },
  },
];

export const dropdownSelectChallenge: ChallengeDefinition<DropdownSelectPageData> = {
  id: "tier1-dropdown-select",
  title: "Dropdown Select",
  tier: 1,
  description: "Find the product matching a compound condition and select it.",

  instructions: (pageData) =>
    `Review the products below. Select the product with the ${pageData.condition} from the dropdown and submit its name.`,

  generate(data: ChallengeData) {
    const count = data.int(6, 10);
    const products = data.products(count).map((p) => ({
      name: p.name,
      price: Math.round(p.price * 100) / 100,
      category: p.category,
      rating: p.rating,
      stock: p.stock,
    }));

    // Ensure unique prices and ensure some are in-stock, some under 200
    const usedPrices = new Set<number>();
    for (const p of products) {
      while (usedPrices.has(p.price)) p.price += 0.01;
      usedPrices.add(p.price);
    }

    // Ensure at least 2 products in stock and 2 under $200
    if (products.filter((p) => p.stock > 0).length < 2) {
      products[0].stock = data.int(10, 500);
      products[1].stock = data.int(10, 500);
    }
    if (products.filter((p) => p.price < 200).length < 2) {
      products[products.length - 1].price = data.int(50, 199) + data.int(0, 99) / 100;
      products[products.length - 2].price = data.int(50, 199) + data.int(0, 99) / 100;
    }

    const condition = data.pick(CONDITIONS);
    const answer = condition.evaluate(products);

    return {
      pageData: {
        products,
        condition: condition.label,
        conditionType: condition.type,
      },
      answer,
    };
  },
};
