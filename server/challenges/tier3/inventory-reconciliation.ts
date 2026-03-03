/**
 * Tier 3 Challenge: Inventory Reconciliation
 *
 * Three inventory systems (Warehouse, Sales, Shipping) report different data
 * for the same products. Agent must load each system's data via interact,
 * apply per-field reconciliation rules, then answer a compound query.
 *
 * Tests: multi-source conflict resolution, field-level trust rules.
 */

import type { ChallengeDefinition } from "../../../src/lib/challenge-types";
import type { ChallengeData } from "../../../src/lib/seed";

interface ProductInfo {
  id: string;
  name: string;
}

interface InventoryReconciliationPageData {
  products: ProductInfo[];
  rules: {
    quantity: string;
    status: string;
    location: string;
    price: string;
  };
  question: string;
  questionParams: Record<string, string | number>;
  locations: string[];
  variantIndex: number;
}

interface SystemProduct {
  productId: string;
  name: string;
  quantity: number;
  status: string;
  location: string;
  price: number;
  lastUpdated: string;
}

const PRODUCT_NAMES = [
  "Industrial Sensor Pack", "Wireless Controller Unit", "Power Distribution Module",
  "Optical Scanner Array", "Thermal Regulation Kit", "Signal Amplifier Board",
  "Hydraulic Pump Assembly", "LED Display Panel", "Battery Management System",
  "Servo Motor Drive", "Fiber Optic Transceiver", "Pressure Gauge Cluster",
] as const;

const LOCATIONS = [
  "West Wing", "East Wing", "North Bay", "South Bay", "Central Hub", "Dock A",
] as const;

const STATUSES = ["active", "active", "active", "active", "damaged", "recalled"] as const;

// Generate a timestamp string that differs per system
function makeTimestamp(data: ChallengeData, baseDay: number): string {
  const month = data.int(1, 12);
  const day = Math.min(baseDay + data.int(0, 5), 28);
  const hour = data.int(0, 23);
  const minute = data.int(0, 59);
  return `2025-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}T${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}:00Z`;
}

export const inventoryReconciliationChallenge: ChallengeDefinition<InventoryReconciliationPageData> = {
  id: "tier3-inventory-reconciliation",
  title: "Inventory Reconciliation",
  tier: 3,
  dependsOn: ["tier2-linked-data-lookup"],
  description: "Reconcile conflicting data from three inventory systems using per-field trust rules.",

  instructions: (pageData) => {
    const interactHint = `To load a system's data, use the interact API with action "source" and parameter system (e.g. { "system": "warehouse" }, { "system": "sales" }, or { "system": "shipping" }).`;
    const variants = [
      `Three inventory systems track the same products but disagree on values. Load data from each system and reconcile using the rules shown. Then answer: ${pageData.question} ${interactHint}`,
      `Warehouse, Sales, and Shipping each report different data for ${pageData.products.length} products. Fetch each system's data, apply the reconciliation rules to determine the authoritative value for each field, then compute: ${pageData.question} ${interactHint}`,
      `This reconciliation dashboard has ${pageData.products.length} products tracked across 3 systems. Each system may report different quantities, statuses, locations, and prices. Use the trust rules to build the correct unified view, then answer: ${pageData.question} ${interactHint}`,
      `Load all three data sources (Warehouse, Sales, Shipping). For each product, apply the field-level trust rules to determine the correct values. Once reconciled, calculate: ${pageData.question} ${interactHint}`,
    ];
    return variants[pageData.variantIndex];
  },

  generate(data: ChallengeData) {
    const variantIndex = data.int(0, 3);
    const productCount = data.int(8, 12);
    const selectedNames = data.pickN(PRODUCT_NAMES, productCount);
    const selectedLocations = data.pickN(LOCATIONS, 4);

    const products: ProductInfo[] = selectedNames.map((name, i) => ({
      id: `prod-${i + 1}`,
      name,
    }));

    // Generate data for each system
    const systems: Record<string, SystemProduct[]> = {
      warehouse: [],
      sales: [],
      shipping: [],
    };

    // Track "ground truth" timestamps to determine which system has the latest
    const baseDay = data.int(5, 20);

    for (let i = 0; i < products.length; i++) {
      const productId = products[i].id;
      const name = products[i].name;

      // Base values that all systems will vary from
      const baseQuantity = data.int(10, 500);
      const basePrice = data.int(10, 200) + data.int(0, 99) / 100;

      // Warehouse data
      const whQty = baseQuantity + data.int(-20, 20);
      const whStatus = data.pick(STATUSES);
      const whLocation = data.pick(selectedLocations);
      const whPrice = basePrice + data.int(-5, 15);
      const whTimestamp = makeTimestamp(data, baseDay);

      systems.warehouse.push({
        productId, name,
        quantity: whQty,
        status: whStatus,
        location: whLocation,
        price: Math.round(whPrice * 100) / 100,
        lastUpdated: whTimestamp,
      });

      // Sales data
      const slQty = baseQuantity + data.int(-30, 30);
      const slStatus = data.pick(STATUSES);
      const slLocation = data.pick(selectedLocations);
      const slPrice = basePrice + data.int(-10, 10);
      const slTimestamp = makeTimestamp(data, baseDay);

      systems.sales.push({
        productId, name,
        quantity: slQty,
        status: slStatus,
        location: slLocation,
        price: Math.round(slPrice * 100) / 100,
        lastUpdated: slTimestamp,
      });

      // Shipping data
      const shQty = baseQuantity + data.int(-25, 25);
      const shStatus = data.pick(STATUSES);
      const shLocation = data.pick(selectedLocations);
      const shPrice = basePrice + data.int(-8, 12);
      const shTimestamp = makeTimestamp(data, baseDay);

      systems.shipping.push({
        productId, name,
        quantity: shQty,
        status: shStatus,
        location: shLocation,
        price: Math.round(shPrice * 100) / 100,
        lastUpdated: shTimestamp,
      });
    }

    // Apply reconciliation rules to compute the correct view
    const reconciled = products.map((p, i) => {
      const wh = systems.warehouse[i];
      const sl = systems.sales[i];
      const sh = systems.shipping[i];

      // Quantity: trust the most recent lastUpdated
      const timestamps = [
        { system: "warehouse", ts: wh.lastUpdated, qty: wh.quantity },
        { system: "sales", ts: sl.lastUpdated, qty: sl.quantity },
        { system: "shipping", ts: sh.lastUpdated, qty: sh.quantity },
      ];
      timestamps.sort((a, b) => b.ts.localeCompare(a.ts)); // latest first
      const quantity = timestamps[0].qty;

      // Status: if ANY says damaged or recalled, use that
      const allStatuses = [wh.status, sl.status, sh.status];
      let status = "active";
      if (allStatuses.includes("recalled")) status = "recalled";
      else if (allStatuses.includes("damaged")) status = "damaged";

      // Location: warehouse is authoritative
      const location = wh.location;

      // Price: sales is authoritative
      const price = sl.price;

      return { productId: p.id, name: p.name, quantity, status, location, price };
    });

    // Generate a question based on variant
    const targetLocation = data.pick(selectedLocations);
    const priceThreshold = data.int(30, 100);

    let question: string;
    let questionParams: Record<string, string | number>;
    let answer: string;

    if (variantIndex === 0) {
      // Total value (qty * price) of non-damaged items at a location
      question = `What is the total value (quantity × price) of all non-damaged, non-recalled items at "${targetLocation}"?`;
      questionParams = { location: targetLocation };
      const total = reconciled
        .filter((p) => p.location === targetLocation && p.status === "active")
        .reduce((sum, p) => sum + p.quantity * p.price, 0);
      answer = (Math.round(total * 100) / 100).toFixed(2);
    } else if (variantIndex === 1) {
      // How many units of items priced above $X at location Y
      question = `How many total units of items priced above $${priceThreshold} are at "${targetLocation}"?`;
      questionParams = { location: targetLocation, priceThreshold };
      const total = reconciled
        .filter((p) => p.location === targetLocation && p.price > priceThreshold)
        .reduce((sum, p) => sum + p.quantity, 0);
      answer = String(total);
    } else if (variantIndex === 2) {
      // Sum of quantities for active items priced between $A and $B
      const priceLow = priceThreshold;
      const priceHigh = priceThreshold + data.int(30, 80);
      question = `What is the total quantity of items with "active" status priced between $${priceLow} and $${priceHigh} (inclusive)?`;
      questionParams = { priceLow, priceHigh };
      const total = reconciled
        .filter((p) => p.status === "active" && p.price >= priceLow && p.price <= priceHigh)
        .reduce((sum, p) => sum + p.quantity, 0);
      answer = String(total);
    } else {
      // Total value of items at location with active status
      question = `What is the total value (quantity × price) of "active" items at "${targetLocation}"?`;
      questionParams = { location: targetLocation };
      const total = reconciled
        .filter((p) => p.location === targetLocation && p.status === "active")
        .reduce((sum, p) => sum + p.quantity * p.price, 0);
      answer = (Math.round(total * 100) / 100).toFixed(2);
    }

    return {
      pageData: {
        products,
        rules: {
          quantity: "Trust the source with the most recent lastUpdated timestamp",
          status: 'If ANY source reports "damaged" or "recalled", that status overrides (most conservative wins)',
          location: "Warehouse system is always authoritative for location",
          price: "Sales system is always authoritative for price",
        },
        question,
        questionParams,
        locations: [...selectedLocations],
        variantIndex,
      },
      hiddenData: { systems },
      answer,
    };
  },

  interactActions: ["source"],

  handleInteract(hiddenData, action, params) {
    if (action === "source") {
      const system = params.system as string | undefined;
      if (!system) {
        return { error: "Missing required parameter: system. Use { \"system\": \"warehouse\" }, { \"system\": \"sales\" }, or { \"system\": \"shipping\" }." };
      }
      const systems = hiddenData.systems as Record<string, SystemProduct[]>;
      const data = systems[system];
      if (!data) {
        return { error: `Unknown system "${system}". Valid systems: ${Object.keys(systems).join(", ")}` };
      }
      return { system, products: data };
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
