/**
 * Tier 3 Challenge: Price Negotiator (Binary Search)
 *
 * Agent must determine a vendor's exact minimum acceptable price
 * through iterative bidding. Each bid returns "accepted" or "rejected."
 * Requires binary search to converge in ~8-9 steps.
 * Optional market intel interact narrows the initial search range.
 */

import type { ChallengeDefinition } from "../../../src/lib/challenge-types";
import type { ChallengeData } from "../../../src/lib/seed";

interface ProductInfo {
  name: string;
  category: string;
  specs: string[];
  vendorProfile: string;
}

interface PriceNegotiatorPageData {
  product: ProductInfo;
  minBid: number;
  maxBid: number;
  variantIndex: number;
}

const PRODUCTS = [
  "Enterprise Server Rack",
  "Industrial IoT Gateway",
  "Data Center UPS",
  "Network Fabric Switch",
  "AI Accelerator Card",
  "Quantum-Safe Encryption Module",
] as const;

const CATEGORIES = [
  "Infrastructure", "Networking", "Security", "Compute",
] as const;

const SPEC_POOL = [
  "Rack-mountable 2U", "Hot-swappable components", "Redundant power supply",
  "10GbE connectivity", "256GB ECC RAM", "Enterprise SSD storage",
  "FIPS 140-2 compliant", "IPv6 ready", "Dual-processor support",
  "Remote management (IPMI)", "5-year warranty", "99.999% uptime SLA",
  "Liquid cooling compatible", "Tool-less installation", "SNMP monitoring",
] as const;

const VENDOR_PROFILES = [
  "Established vendor, known for negotiating hard but accepting fair market prices.",
  "Mid-tier supplier, generally flexible on pricing for bulk orders.",
  "Premium vendor with strict pricing but willing to negotiate within reason.",
  "Growing supplier eager to close deals — may accept competitive offers.",
] as const;

export const priceNegotiatorChallenge: ChallengeDefinition<PriceNegotiatorPageData> = {
  id: "tier3-price-negotiator",
  title: "Price Negotiator",
  tier: 3,
  points: 5,
  dependsOn: ["tier2-sequential-calculator"],
  description: "Negotiate with a vendor to find their exact minimum acceptable price through iterative bidding.",

  instructions: (pageData) => {
    const { product, minBid, maxBid } = pageData;
    const variants = [
      `You are negotiating to purchase a "${product.name}". Your budget ceiling is $${maxBid} and the minimum bid is $${minBid}. Submit bids to discover the vendor's exact minimum acceptable price (the lowest integer price they will accept). You may also request market intelligence to help narrow your search. Submit the exact floor price.`,
      `Find the vendor's minimum acceptable price for "${product.name}". Bid range: $${minBid}–$${maxBid}. Each bid will be accepted or rejected. Use binary search or similar strategy to pinpoint the exact threshold. Optionally fetch market intel first. Submit the floor price (integer).`,
      `Negotiate the price for "${product.name}". The vendor will accept bids at or above their floor price and reject those below. Your range is $${minBid}–$${maxBid}. Determine the exact floor price through iterative bidding. Market intelligence is available to narrow the range. Submit the exact minimum price.`,
      `Determine what the vendor's lowest acceptable price is for "${product.name}" (an integer between $${minBid} and $${maxBid}). Place bids — "accepted" means at or above the floor, "rejected" means below. Find the exact boundary. Submit the floor price.`,
    ];
    return variants[pageData.variantIndex];
  },

  generate(data: ChallengeData) {
    const variantIndex = data.int(0, 3);

    const productName = data.pick(PRODUCTS);
    const category = data.pick(CATEGORIES);
    const specs = [...data.pickN(SPEC_POOL, data.int(3, 5))];
    const vendorProfile = data.pick(VENDOR_PROFILES);

    const maxBid = data.int(500, 2000);
    let minBid = Math.floor(maxBid * 0.2);
    // Ensure range is at least 200
    if (maxBid - minBid < 200) minBid = maxBid - 200;

    const floorPrice = data.int(
      Math.floor(maxBid * 0.4),
      Math.floor(maxBid * 0.8)
    );

    // Market data narrows the range by ~30%
    const marketLow = floorPrice - data.int(20, 40);
    const marketHigh = floorPrice + data.int(50, 100);
    const avgMarketPrice = floorPrice + data.int(-50, 100);

    const recentSales = Array.from({ length: data.int(3, 5) }, () => ({
      price: floorPrice + data.int(-30, 80),
      date: `2025-${String(data.int(1, 12)).padStart(2, "0")}-${String(data.int(1, 28)).padStart(2, "0")}`,
    }));

    return {
      pageData: {
        product: { name: productName, category, specs, vendorProfile },
        minBid,
        maxBid,
        variantIndex,
      },
      hiddenData: {
        floorPrice,
        marketData: {
          avgMarketPrice,
          priceRange: { low: marketLow, high: marketHigh },
          recentSales,
        },
      },
      answer: String(floorPrice),
    };
  },

  interactActions: ["bid", "market_intel"],

  handleInteract(hiddenData, action, params) {
    if (action === "bid") {
      const amount = Number(params.amount);
      if (isNaN(amount) || !Number.isInteger(amount)) {
        return { result: "error", message: "Bid must be an integer" };
      }
      const floorPrice = hiddenData.floorPrice as number;
      if (amount < floorPrice) {
        return {
          result: "rejected",
          message: `Offer of $${amount} rejected — too low.`,
          hint: "increase",
        };
      }
      return {
        result: "accepted",
        message: `Vendor accepts $${amount}.`,
      };
    }
    if (action === "market_intel") {
      return { marketData: hiddenData.marketData };
    }
    return null;
  },

  validateAnswer(submitted: string, correct: string): boolean {
    const s = parseInt(submitted.trim(), 10);
    const c = parseInt(correct, 10);
    if (isNaN(s)) return false;
    return s === c;
  },
};
