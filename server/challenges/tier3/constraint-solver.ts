/**
 * Tier 3 Challenge: Constraint Solver (Moderate Rework)
 *
 * OR constraints, hidden constraints behind "Advanced Filters" accordion,
 * optimization step. Points: 5 (overridden from default tier 3 = 4).
 */

import type { ChallengeDefinition } from "../../../src/lib/challenge-types";
import type { ChallengeData } from "../../../src/lib/seed";

interface Item { name: string; category: string; price: number; rating: number; supplier: string; inStock: boolean; weight: number; }
interface Constraint { field: string; operator: string; value: string | number | boolean | string[]; label: string; }

interface ConstraintSolverPageData {
  items: Item[];
  requirements: Constraint[];
  budgetConstraints: Constraint[];
  exclusions: Constraint[];
  advancedConstraints?: Constraint[];
  optimization: string;
  optimizationField: "price" | "weight";
  variantIndex: number;
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
  dependsOn: ["tier2-linked-data-lookup"],
  description: "Find the item that satisfies all constraints (including advanced filters) with the best optimization.",

  instructions: (pageData) => {
    const opt = pageData.optimization;
    const variants = [
      `Review the items in the inventory and ALL constraints across every panel — including the Advanced Filters section. Find items that satisfy ALL constraints simultaneously, then ${opt}. Submit that item's name.`,
      `Check every constraint panel (Requirements, Budget & Quality, Exclusions, and Advanced Filters). Identify which items pass all of them, then ${opt}. Provide the item name.`,
      `The inventory has multiple constraint categories. An item must satisfy ALL of them — don't forget the Advanced Filters. Among qualifying items, ${opt}. Submit the name.`,
      `Examine all panels including the collapsed Advanced Filters. Filter the inventory to items meeting every constraint, then ${opt}. What is the item's name?`,
    ];
    return variants[pageData.variantIndex];
  },

  generate(data: ChallengeData) {
    const variantIndex = data.int(0, 3);
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

    const targetItem = data.pick(items);
    targetItem.inStock = true;

    const otherCategories = [...CATEGORIES].filter((c) => c !== targetItem.category);
    const secondCategory = data.pick(otherCategories);
    const allowedCategories = [targetItem.category, secondCategory];

    const requirements: Constraint[] = [
      { field: "category", operator: "in", value: allowedCategories, label: `Category must be "${allowedCategories[0]}" OR "${allowedCategories[1]}"` },
      { field: "inStock", operator: "equals", value: true, label: "Must be in stock" },
    ];

    // Pick which budget constraint to replace with a relative one
    const relativeConstraintType = data.pick(["below_avg_price", "above_avg_rating"] as const);

    const priceMax = Math.ceil(targetItem.price + data.int(30, 80));
    const ratingMin = Math.floor((targetItem.rating - 0.5) * 10) / 10;

    const budgetConstraints: Constraint[] = [];
    if (relativeConstraintType === "below_avg_price") {
      // Replace price constraint with relative; keep absolute rating
      budgetConstraints.push(
        { field: "price", operator: "below_avg", value: 0, label: "Price must be below the average price of in-stock items" },
        { field: "rating", operator: "gte", value: ratingMin, label: `Rating must be ≥ ${ratingMin}` },
      );
    } else {
      // Replace rating constraint with relative; keep absolute price
      budgetConstraints.push(
        { field: "price", operator: "lte", value: priceMax, label: `Price must be ≤ $${priceMax}` },
        { field: "rating", operator: "above_avg", value: 0, label: "Rating must be above the average rating of all items" },
      );
    }

    const otherSuppliers = [...SUPPLIERS].filter((s) => s !== targetItem.supplier);
    const excludedSupplier = data.pick(otherSuppliers);
    const exclusions: Constraint[] = [
      { field: "supplier", operator: "not_equals", value: excludedSupplier, label: `Supplier must NOT be "${excludedSupplier}"` },
    ];

    const weightMax = targetItem.weight + data.int(2, 5);
    const advancedConstraints: Constraint[] = [
      { field: "weight", operator: "lte", value: weightMax, label: `Weight must be ≤ ${weightMax} kg` },
    ];

    const optimizationField = data.pick(["price", "weight"] as const);
    const optimization = optimizationField === "price"
      ? "among qualifying items, submit the one with the lowest price"
      : "among qualifying items, submit the one with the lowest weight";

    // Compute aggregates for relative constraints
    const inStockItems = items.filter((it) => it.inStock);
    const avgPrice = inStockItems.length > 0
      ? Math.round(inStockItems.reduce((s, it) => s + it.price, 0) / inStockItems.length * 100) / 100
      : 0;
    const avgRating = items.length > 0
      ? Math.round(items.reduce((s, it) => s + it.rating, 0) / items.length * 10) / 10
      : 0;

    const passesAll = (item: Item) => {
      if (!allowedCategories.includes(item.category)) return false;
      if (!item.inStock) return false;
      if (relativeConstraintType === "below_avg_price") {
        if (item.price >= avgPrice) return false;
      } else {
        if (item.price > priceMax) return false;
      }
      if (relativeConstraintType === "above_avg_rating") {
        if (item.rating <= avgRating) return false;
      } else {
        if (item.rating < ratingMin) return false;
      }
      if (item.supplier === excludedSupplier) return false;
      if (item.weight > weightMax) return false;
      return true;
    };

    // Fix target item to pass relative constraint if needed
    if (relativeConstraintType === "below_avg_price" && targetItem.price >= avgPrice) {
      targetItem.price = Math.round((avgPrice - data.int(1, 20)) * 100) / 100;
    }
    if (relativeConstraintType === "above_avg_rating" && targetItem.rating <= avgRating) {
      targetItem.rating = Math.round((avgRating + data.int(1, 10) / 10) * 10) / 10;
    }

    let passing = items.filter(passesAll);

    if (!passesAll(targetItem)) {
      targetItem.weight = weightMax - 1;
      passing = items.filter(passesAll);
    }

    if (passing.length > 1) {
      const others = passing.filter((p) => p.name !== targetItem.name);
      const bestOther = Math.min(...others.map((p) => p[optimizationField]));
      if (targetItem[optimizationField] >= bestOther) {
        targetItem[optimizationField] = bestOther - (optimizationField === "price" ? 0.01 : 1);
      }
    }

    // Recompute aggregates after mutations (prices/ratings may have changed)
    const inStockItemsFinal = items.filter((it) => it.inStock);
    const avgPriceFinal = inStockItemsFinal.length > 0
      ? Math.round(inStockItemsFinal.reduce((s, it) => s + it.price, 0) / inStockItemsFinal.length * 100) / 100
      : 0;
    const avgRatingFinal = items.length > 0
      ? Math.round(items.reduce((s, it) => s + it.rating, 0) / items.length * 10) / 10
      : 0;

    const passesAllFinal = (item: Item) => {
      if (!allowedCategories.includes(item.category)) return false;
      if (!item.inStock) return false;
      if (relativeConstraintType === "below_avg_price") {
        if (item.price >= avgPriceFinal) return false;
      } else {
        if (item.price > priceMax) return false;
      }
      if (relativeConstraintType === "above_avg_rating") {
        if (item.rating <= avgRatingFinal) return false;
      } else {
        if (item.rating < ratingMin) return false;
      }
      if (item.supplier === excludedSupplier) return false;
      if (item.weight > weightMax) return false;
      return true;
    };

    // Ensure target item passes final constraints (aggregates may have shifted)
    if (!passesAllFinal(targetItem)) {
      if (relativeConstraintType === "below_avg_price") {
        targetItem.price = Math.round((avgPriceFinal - 1) * 100) / 100;
      }
      if (relativeConstraintType === "above_avg_rating") {
        targetItem.rating = Math.round((avgRatingFinal + 0.1) * 10) / 10;
      }
      if (targetItem.weight > weightMax) {
        targetItem.weight = weightMax - 1;
      }
    }

    const finalPassing = items.filter(passesAllFinal);
    const winner = finalPassing.length > 0
      ? finalPassing.reduce((best, item) =>
          item[optimizationField] < best[optimizationField] ? item : best
        )
      : targetItem;

    return {
      pageData: {
        items, requirements, budgetConstraints, exclusions,
        optimization, optimizationField, variantIndex,
      },
      hiddenData: { advancedConstraints },
      answer: winner.name,
    };
  },

  interactActions: ["accordion"],

  handleInteract(hiddenData, action) {
    if (action === "accordion") {
      return { advancedConstraints: hiddenData.advancedConstraints };
    }
    return null;
  },
};
