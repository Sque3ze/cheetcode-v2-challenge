/**
 * Tier 1 Challenge: Modal Interaction (Minor Tweak)
 *
 * Changes: Target card is described by condition ("product in 'Security'
 * category with the lowest price") instead of by name. Forces evaluation
 * before knowing which modal to open.
 */

import type { ChallengeDefinition } from "../../../src/lib/challenge-types";
import type { ChallengeData } from "../../../src/lib/seed";

interface CardData {
  id: number;
  name: string;
  category: string;
  price: number;
  sku: string;
  supplier: string;
}

interface ModalInteractionPageData {
  cards: CardData[];
  targetCondition: string;
  targetField: string;
  targetCardName: string;
  targetCategory: string;
  modalLoadDelay: number;
  variantIndex: number;
}

const SUPPLIERS = [
  "Apex Trading", "NorthStar Supply", "Pacific Imports", "Continental Goods",
  "Summit Logistics", "Harbor Wholesale", "Pinnacle Sources", "Metro Distributors",
] as const;

export const modalInteractionChallenge: ChallengeDefinition<ModalInteractionPageData> = {
  id: "tier1-modal-interaction",
  title: "Modal Interaction",
  tier: 1,
  description: "Find a product by condition, open its modal, and extract hidden info.",

  instructions: (pageData) => {
    const { targetCategory, targetCondition, targetField } = pageData;
    const variants = [
      `Find the product in the "${targetCategory}" category with the ${targetCondition}. Click "View Details" to open its modal and submit the ${targetField}.`,
      `Among "${targetCategory}" products, identify the one with the ${targetCondition}. Open its detail modal and provide the ${targetField}.`,
      `Look at products categorized as "${targetCategory}". Which one has the ${targetCondition}? Click its details button and submit the ${targetField} shown in the modal.`,
      `In the "${targetCategory}" section, locate the product with the ${targetCondition}. View its details and report the ${targetField}.`,
    ];
    return variants[pageData.variantIndex];
  },

  generate(data: ChallengeData) {
    const count = data.int(6, 9);
    const products = data.products(count);
    const variantIndex = data.int(0, 3);

    const usedNames = new Set<string>();
    const cards: CardData[] = products.map((p, i) => {
      let name = p.name;
      let suffix = 2;
      while (usedNames.has(name)) {
        name = `${p.name} ${suffix}`;
        suffix++;
      }
      usedNames.add(name);
      return {
        id: i,
        name,
        category: p.category,
        price: Math.round(p.price * 100) / 100,
        sku: p.sku,
        supplier: data.pick(SUPPLIERS),
      };
    });

    const usedPrices = new Set<number>();
    for (const c of cards) {
      while (usedPrices.has(c.price)) c.price += 0.01;
      usedPrices.add(c.price);
    }

    const categoryCounts = new Map<string, number>();
    for (const c of cards) {
      categoryCounts.set(c.category, (categoryCounts.get(c.category) || 0) + 1);
    }
    const validCategories = [...categoryCounts.entries()]
      .filter(([, count]) => count >= 2)
      .map(([cat]) => cat);

    if (validCategories.length === 0) {
      cards[0].category = cards[1].category;
      validCategories.push(cards[0].category);
    }

    const targetCategory = data.pick(validCategories);
    const categoryCards = cards.filter((c) => c.category === targetCategory);

    const conditionType = data.pick(["lowest price", "highest price"] as const);
    const targetCard = conditionType === "lowest price"
      ? categoryCards.reduce((min, c) => (c.price < min.price ? c : min), categoryCards[0])
      : categoryCards.reduce((max, c) => (c.price > max.price ? c : max), categoryCards[0]);

    const targetField = data.pick(["sku", "supplier"] as const);
    const answer = targetField === "sku" ? targetCard.sku : targetCard.supplier;

    return {
      pageData: {
        cards,
        targetCondition: conditionType,
        targetField,
        targetCardName: targetCard.name,
        targetCategory,
        modalLoadDelay: 800,
        variantIndex,
      },
      answer,
    };
  },
};
