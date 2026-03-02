/**
 * Tier 2 Challenge: Multi-Step Wizard (Round 3 — Budget Backtracking)
 *
 * Adds a budgetLimit to Step 3. The target discount passes budget,
 * but at least one other discount does NOT. Agent must detect the
 * "Budget Exceeded" error and backtrack to pick a different discount.
 */

import type { ChallengeDefinition } from "../../../src/lib/challenge-types";
import type { ChallengeData } from "../../../src/lib/seed";

interface Order {
  id: string;
  customer: string;
  product: string;
  quantity: number;
  unitPrice: number;
  status: string;
}

interface DiscountCode {
  code: string;
  percent: number;
}

interface ShippingOption {
  name: string;
  cost: number;
}

interface MultiStepWizardPageData {
  orders: Order[];
  discountCodes?: DiscountCode[];
  shippingOptions?: ShippingOption[];
  orderCondition: string;
  targetStatus: string;
  discountCondition: string;
  targetShipping: string;
  budgetLimit?: number;
  variantIndex: number;
}

export const multiStepWizardChallenge: ChallengeDefinition<MultiStepWizardPageData> = {
  id: "tier2-multi-step-wizard",
  title: "Multi-Step Wizard",
  tier: 2,
  dependsOn: ["tier1-dropdown-select"],
  description: "Complete a 4-step order processing wizard with conditional lookups.",

  instructions: (pageData) => {
    const { orderCondition, targetStatus, discountCondition, targetShipping } = pageData;
    const variants = [
      `Step 1: Find the order with the ${orderCondition} among orders with status "${targetStatus}". ` +
      `Step 2: Apply the ${discountCondition}. ` +
      `Step 3: Select "${targetShipping}" shipping. Note: the discounted subtotal must not exceed the budget limit shown in Step 3. If it does, go back and pick a different discount. ` +
      `Step 4: Calculate the final total: (quantity × unit price) × (1 - discount/100) + shipping cost. ` +
      `Submit the result rounded to 2 decimal places.`,

      `Process an order through the wizard: (1) Among "${targetStatus}" orders, pick the one with the ${orderCondition}. ` +
      `(2) Use the ${discountCondition}. (3) Choose "${targetShipping}" shipping — but if the discounted subtotal exceeds the budget limit, go back and try a different discount. ` +
      `(4) Compute: (qty × unitPrice) × (1 - discount%) + shippingCost. Round to 2 decimals.`,

      `Navigate the 4-step form. First, select the "${targetStatus}" order with the ${orderCondition}. ` +
      `Then apply the ${discountCondition} and select "${targetShipping}" for shipping. ` +
      `Watch for the budget limit in Step 3 — if your discounted subtotal exceeds it, return to Step 2 and choose another discount. ` +
      `Finally, calculate (quantity × unit price) × (1 - discount/100) + shipping. Submit to 2 decimal places.`,

      `Complete these steps: Pick the ${orderCondition} from "${targetStatus}" orders. ` +
      `Apply ${discountCondition} as your discount. Ship via "${targetShipping}". ` +
      `Important: the discounted subtotal must stay within the budget shown in Step 3. If it exceeds it, go back and use a different discount. ` +
      `Your answer is (qty × unit price) × (1 - discount/100) + shipping cost, rounded to 2 decimals.`,
    ];
    return variants[pageData.variantIndex];
  },

  generate(data: ChallengeData) {
    const variantIndex = data.int(0, 3);
    const orderCount = data.int(8, 12);
    const orders: Order[] = [];
    const usedIds = new Set<string>();
    for (let i = 0; i < orderCount; i++) {
      let id: string;
      do {
        id = `ORD-${data.int(1000, 9999)}`;
      } while (usedIds.has(id));
      usedIds.add(id);

      orders.push({
        id,
        customer: data.person().fullName,
        product: data.pick([
          "Cloud Server Pro", "Data Pipeline Suite", "API Gateway License",
          "ML Training Cluster", "Storage Vault 1TB", "Network Shield Plus",
          "Analytics Dashboard", "DevOps Toolkit",
        ] as const),
        quantity: data.int(1, 20),
        unitPrice: data.int(10, 200) + data.int(0, 99) / 100,
        status: data.pick(["Pending", "Processing", "Shipped", "Delivered"] as const),
      });
    }

    const discountCodes: DiscountCode[] = [
      { code: `SAVE${data.int(10, 30)}`, percent: data.int(5, 15) },
      { code: `DEAL${data.int(40, 60)}`, percent: data.int(10, 25) },
      { code: `VIP${data.int(70, 99)}`, percent: data.int(15, 35) },
    ];

    const shippingOptions: ShippingOption[] = [
      { name: "Standard", cost: data.int(5, 15) + data.int(0, 99) / 100 },
      { name: "Express", cost: data.int(20, 40) + data.int(0, 99) / 100 },
      { name: "Overnight", cost: data.int(45, 80) + data.int(0, 99) / 100 },
    ];

    const targetStatus = data.pick(["Pending", "Processing"] as const);

    let statusOrders = orders.filter((o) => o.status === targetStatus);
    while (statusOrders.length < 2) {
      const randomOrder = data.pick(orders);
      if (randomOrder.status !== targetStatus) {
        randomOrder.status = targetStatus;
        statusOrders = orders.filter((o) => o.status === targetStatus);
      }
    }

    const orderCondition = data.pick(["highest subtotal", "lowest subtotal"] as const);

    const sortedOrders = [...statusOrders].sort((a, b) => {
      const subA = a.quantity * a.unitPrice;
      const subB = b.quantity * b.unitPrice;
      return orderCondition === "highest subtotal" ? subB - subA : subA - subB;
    });
    const targetOrder = sortedOrders[0];
    const subtotal = targetOrder.quantity * targetOrder.unitPrice;

    const discountCondition = data.pick(["highest discount percentage", "lowest discount percentage"] as const);
    const sortedDiscounts = [...discountCodes].sort((a, b) =>
      discountCondition === "highest discount percentage" ? b.percent - a.percent : a.percent - b.percent
    );
    const targetDiscount = sortedDiscounts[0];
    const discountedSubtotal = subtotal * (1 - targetDiscount.percent / 100);

    // Set budget limit so that the target discount PASSES but at least one other fails
    // The target discount produces the correct discounted subtotal.
    // Find a discount that produces a HIGHER discounted subtotal to use as the failing one.
    const otherDiscounts = discountCodes.filter((d) => d.code !== targetDiscount.code);
    const failingDiscounts = otherDiscounts.filter((d) => {
      const ds = subtotal * (1 - d.percent / 100);
      return ds > discountedSubtotal;
    });

    let budgetLimit: number;
    if (failingDiscounts.length > 0) {
      // Budget sits between target's discounted subtotal and the failing one
      const worstFailing = failingDiscounts.reduce((max, d) => {
        const ds = subtotal * (1 - d.percent / 100);
        return ds > max ? ds : max;
      }, 0);
      budgetLimit = Math.round((discountedSubtotal + (worstFailing - discountedSubtotal) * 0.5) * 100) / 100;
    } else {
      // All discounts produce lower or equal — set budget just above target
      budgetLimit = Math.round((discountedSubtotal + data.int(10, 50)) * 100) / 100;
    }

    // Ensure target passes
    if (budgetLimit < discountedSubtotal) {
      budgetLimit = Math.round((discountedSubtotal + data.int(5, 20)) * 100) / 100;
    }

    const targetShipping = data.pick(shippingOptions);
    const finalTotal = discountedSubtotal + targetShipping.cost;
    const answer = finalTotal.toFixed(2);

    return {
      pageData: {
        orders,
        orderCondition,
        targetStatus,
        discountCondition,
        targetShipping: targetShipping.name,
        variantIndex,
      },
      hiddenData: {
        step2: { discountCodes },
        step3: { shippingOptions, budgetLimit },
      },
      answer,
    };
  },

  interactActions: ["step"],

  handleInteract(hiddenData, action, params) {
    if (action === "step") {
      const step = params.step as number;
      if (step === 2) return hiddenData.step2;
      if (step === 3) return hiddenData.step3;
    }
    return null;
  },
};
