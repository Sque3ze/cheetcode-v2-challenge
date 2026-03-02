/**
 * Tier 3 Challenge: Constraint Solver (Moderate Rework)
 *
 * Changes from v1:
 * - OR constraints: "Category must be Electronics OR Medical"
 * - Hidden constraints behind "Advanced Filters" accordion (collapsed by default)
 * - Optimization: "Among qualifying items, submit the one with the lowest price"
 * - Multiple items pass visible constraints; only one passes after including
 *   hidden constraints + optimization
 *
 * Points: 5 (overridden from default tier 3 = 4)
 */

import type { ChallengeDefinition } from "../../../src/lib/challenge-types";
import type { ChallengeData } from "../../../src/lib/seed";

interface Item {
  name: string;
  category: string;
  price: number;
  rating: number;
  supplier: string;
  inStock: boolean;
  weight: number;
}

interface Constraint {
  field: string;
  operator: string;
  value: string | number | boolean | string[];
  label: string;
}

interface ConstraintSolverPageData {
  items: Item[];
  requirements: Constraint[];
  budgetConstraints: Constraint[];
  exclusions: Constraint[];
  /** Hidden constraints behind "Advanced Filters" accordion */
  advancedConstraints: Constraint[];
  /** Optimization criterion */
  optimization: string;
  optimizationField: "price" | "weight";
}

const CATEGORIES = ["Electronics", "Office", "Industrial", "Medical", "Automotive"] as const;
const SUPPLIERS = ["AlphaSupply", "BetaTrade", "GammaLogistics", "DeltaWholesale", "EpsilonDirect"] as const;
const ITEM_NAMES = [
  "ProMax 3000", "UltraLite X", "CoreTech V2", "NanoShield S",
  "FlexiPort R", "TurboLink 5", "MegaDrive Q", "SwiftCoil Z",
  "PrimeFuse D", "VoltEdge W", "AeroSync T", "ClearPath M",
] as const;

export const constraintSolverChallenge: ChallengeDefinition<ConstraintSolverPageData> = {
  id: "tier3-constraint-solver",
  title: "Constraint Solver",
  tier: 3,
  points: 5,
  description: "Find the item that satisfies all constraints (including advanced filters) with the best optimization.",

  instructions: (pageData) =>
    `Review the items in the inventory and ALL constraints across every panel — including the Advanced Filters section. ` +
    `Find items that satisfy ALL constraints simultaneously, then ${pageData.optimization}. Submit that item's name.`,

  generate(data: ChallengeData) {
    // Generate items
    const itemCount = data.int(10, 12);
    const names = data.pickN(ITEM_NAMES, itemCount);
    const items: Item[] = names.map((name) => ({
      name,
      category: data.pick(CATEGORIES),
      price: data.int(20, 500) + data.int(0, 99) / 100,
      rating: Math.round(data.rng.float(1, 5) * 10) / 10,
      supplier: data.pick(SUPPLIERS),
      inStock: data.int(0, 1) === 1,
      weight: data.int(1, 50),
    }));

    // Pick the target item
    const targetItem = data.pick(items);
    targetItem.inStock = true;

    // Pick a second allowed category for the OR constraint
    const otherCategories = [...CATEGORIES].filter((c) => c !== targetItem.category);
    const secondCategory = data.pick(otherCategories);
    const allowedCategories = [targetItem.category, secondCategory];

    // Build visible constraints — OR category + in stock
    const requirements: Constraint[] = [
      {
        field: "category",
        operator: "in",
        value: allowedCategories,
        label: `Category must be "${allowedCategories[0]}" OR "${allowedCategories[1]}"`,
      },
      {
        field: "inStock",
        operator: "equals",
        value: true,
        label: "Must be in stock",
      },
    ];

    // Budget constraints
    const priceMax = Math.ceil(targetItem.price + data.int(30, 80));
    const ratingMin = Math.floor((targetItem.rating - 0.5) * 10) / 10;

    const budgetConstraints: Constraint[] = [
      {
        field: "price",
        operator: "lte",
        value: priceMax,
        label: `Price must be ≤ $${priceMax}`,
      },
      {
        field: "rating",
        operator: "gte",
        value: ratingMin,
        label: `Rating must be ≥ ${ratingMin}`,
      },
    ];

    // Exclusions
    const otherSuppliers = [...SUPPLIERS].filter((s) => s !== targetItem.supplier);
    const excludedSupplier = data.pick(otherSuppliers);

    const exclusions: Constraint[] = [
      {
        field: "supplier",
        operator: "not_equals",
        value: excludedSupplier,
        label: `Supplier must NOT be "${excludedSupplier}"`,
      },
    ];

    // Advanced (hidden) constraints — the key differentiator
    const weightMax = targetItem.weight + data.int(2, 5);
    const advancedConstraints: Constraint[] = [
      {
        field: "weight",
        operator: "lte",
        value: weightMax,
        label: `Weight must be ≤ ${weightMax} kg`,
      },
    ];

    // Optimization criterion
    const optimizationField = data.pick(["price", "weight"] as const);
    const optimization = optimizationField === "price"
      ? "among qualifying items, submit the one with the lowest price"
      : "among qualifying items, submit the one with the lowest weight";

    // Verify which items pass ALL constraints
    const passesAll = (item: Item) => {
      if (!allowedCategories.includes(item.category)) return false;
      if (!item.inStock) return false;
      if (item.price > priceMax) return false;
      if (item.rating < ratingMin) return false;
      if (item.supplier === excludedSupplier) return false;
      if (item.weight > weightMax) return false;
      return true;
    };

    let passing = items.filter(passesAll);

    // If target doesn't pass (shouldn't happen), force it
    if (!passesAll(targetItem)) {
      targetItem.weight = weightMax - 1;
      passing = items.filter(passesAll);
    }

    // The optimization step: pick the one with lowest price or weight
    if (passing.length > 1) {
      // Make the target have the best optimization value
      const others = passing.filter((p) => p.name !== targetItem.name);
      const bestOther = Math.min(...others.map((p) => p[optimizationField]));
      if (targetItem[optimizationField] >= bestOther) {
        // Adjust target to be slightly better
        targetItem[optimizationField] = bestOther - (optimizationField === "price" ? 0.01 : 1);
      }
    }

    // Re-verify the final answer
    const finalPassing = items.filter(passesAll);
    const winner = finalPassing.reduce((best, item) =>
      item[optimizationField] < best[optimizationField] ? item : best
    );

    return {
      pageData: {
        items,
        requirements,
        budgetConstraints,
        exclusions,
        advancedConstraints,
        optimization,
        optimizationField,
      },
      answer: winner.name,
    };
  },
};
