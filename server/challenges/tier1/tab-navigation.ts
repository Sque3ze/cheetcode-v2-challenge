/**
 * Tier 1 Challenge: Tab Navigation (Moderate Rework)
 *
 * Changes: Cross-tab computation required.
 * "Find the Growth Rate in Financials. If above 50%, submit the Region
 * from Technical. Otherwise submit the Headquarters from Overview."
 * Forces multi-tab navigation + conditional reasoning.
 */

import type { ChallengeDefinition } from "../../../src/lib/challenge-types";
import type { ChallengeData } from "../../../src/lib/seed";

interface TabData {
  label: string;
  content: Array<{ key: string; value: string }>;
}

interface TabNavigationPageData {
  tabs: TabData[];
  conditionTab: string;
  conditionKey: string;
  conditionThreshold: number;
  ifAboveTab: string;
  ifAboveKey: string;
  ifBelowTab: string;
  ifBelowKey: string;
  variantIndex: number;
}

export const tabNavigationChallenge: ChallengeDefinition<TabNavigationPageData> = {
  id: "tier1-tab-navigation",
  title: "Tab Navigation",
  tier: 1,
  description: "Navigate tabs and use conditional logic to find the right value.",

  instructions: (pageData) => {
    const { conditionKey, conditionTab, conditionThreshold, ifAboveKey, ifAboveTab, ifBelowKey, ifBelowTab } = pageData;
    const variants = [
      `Find the "${conditionKey}" value in the "${conditionTab}" tab. If the numeric value is above ${conditionThreshold}, submit the "${ifAboveKey}" from the "${ifAboveTab}" tab. Otherwise, submit the "${ifBelowKey}" from the "${ifBelowTab}" tab.`,
      `Navigate to "${conditionTab}" and check "${conditionKey}". When it exceeds ${conditionThreshold}, your answer is "${ifAboveKey}" from "${ifAboveTab}"; if not, answer with "${ifBelowKey}" from "${ifBelowTab}".`,
      `In the "${conditionTab}" tab, locate "${conditionKey}". Compare it against ${conditionThreshold}. Above? Submit "${ifAboveKey}" (found in "${ifAboveTab}"). Below or equal? Submit "${ifBelowKey}" (found in "${ifBelowTab}").`,
      `Check the "${conditionTab}" section for "${conditionKey}". If that number is greater than ${conditionThreshold}, provide the "${ifAboveKey}" value from "${ifAboveTab}". Otherwise provide "${ifBelowKey}" from "${ifBelowTab}".`,
    ];
    return variants[pageData.variantIndex];
  },

  generate(data: ChallengeData) {
    const variantIndex = data.int(0, 3);
    const tabConfigs = [
      { label: "Overview", keys: ["Company", "Founded", "Headquarters", "Industry"] },
      { label: "Financials", keys: ["Revenue", "Profit", "Employees", "Growth Rate"] },
      { label: "Contact", keys: ["Phone", "Email", "Address", "Website"] },
      { label: "Technical", keys: ["Stack", "Uptime", "API Version", "Region"] },
    ];

    const numTabs = data.int(3, 4);
    const selectedConfigs = data.pickN(tabConfigs, numTabs);

    const tabs: TabData[] = selectedConfigs.map((config) => ({
      label: config.label,
      content: config.keys.map((key) => ({
        key,
        value: generateValue(key, data),
      })),
    }));

    // Pick a condition: use a numeric field as the threshold check
    const numericKeys: { tab: TabData; key: string; value: number }[] = [];
    for (const tab of tabs) {
      for (const item of tab.content) {
        const num = parseNumericValue(item.value);
        if (num !== null) {
          numericKeys.push({ tab, key: item.key, value: num });
        }
      }
    }

    const conditionEntry = data.pick(numericKeys);
    const conditionTab = conditionEntry.tab.label;
    const conditionKey = conditionEntry.key;

    const isAbove = data.int(1, 10) <= 6;
    const conditionThreshold = isAbove
      ? Math.floor(conditionEntry.value - data.int(1, 10))
      : Math.ceil(conditionEntry.value + data.int(1, 10));

    const otherTabs = tabs.filter((t) => t.label !== conditionEntry.tab.label);
    const ifAboveTab = data.pick(otherTabs);
    const ifAboveItem = data.pick(ifAboveTab.content);
    const ifBelowTab = data.pick(otherTabs);
    const ifBelowItem = data.pick(ifBelowTab.content);

    const answer = conditionEntry.value > conditionThreshold
      ? ifAboveItem.value
      : ifBelowItem.value;

    return {
      pageData: {
        tabs,
        conditionTab,
        conditionKey,
        conditionThreshold,
        ifAboveTab: ifAboveTab.label,
        ifAboveKey: ifAboveItem.key,
        ifBelowTab: ifBelowTab.label,
        ifBelowKey: ifBelowItem.key,
        variantIndex,
      },
      answer,
    };
  },
};

function parseNumericValue(value: string): number | null {
  const cleanedPercent = value.match(/^(\d+)%$/);
  if (cleanedPercent) return parseInt(cleanedPercent[1]);
  const cleanedDollar = value.match(/^\$(\d+)M?$/);
  if (cleanedDollar) return parseInt(cleanedDollar[1]);
  const cleanedNumber = value.match(/^(\d+)$/);
  if (cleanedNumber) return parseInt(cleanedNumber[1]);
  const cleanedDecimal = value.match(/^([\d.]+)%$/);
  if (cleanedDecimal) return parseFloat(cleanedDecimal[1]);
  return null;
}

function generateValue(key: string, data: ChallengeData): string {
  switch (key) {
    case "Company":
      return data.pick(["Acme Corp", "TechFlow Inc", "NovaBridge", "Synthetix Labs", "CloudPeak", "DataVerse", "PulseNet"] as const);
    case "Founded":
      return String(data.int(1990, 2023));
    case "Headquarters":
      return data.city();
    case "Industry":
      return data.pick(["SaaS", "Fintech", "Healthcare", "E-commerce", "Cybersecurity", "AI/ML", "DevTools"] as const);
    case "Revenue":
      return `$${data.int(1, 500)}M`;
    case "Profit":
      return `$${data.int(1, 100)}M`;
    case "Employees":
      return String(data.int(50, 5000));
    case "Growth Rate":
      return `${data.int(5, 95)}%`;
    case "Phone":
      return `+1-${data.int(200, 999)}-${data.int(100, 999)}-${data.int(1000, 9999)}`;
    case "Email":
      return `contact@${data.pick(["acme", "techflow", "novabridge", "synthetix", "cloudpeak"] as const)}.com`;
    case "Address":
      return `${data.int(100, 9999)} ${data.pick(["Main St", "Market St", "Broadway", "Oak Ave", "Pine Rd"] as const)}`;
    case "Website":
      return `https://${data.pick(["acme", "techflow", "novabridge", "synthetix", "cloudpeak"] as const)}.com`;
    case "Stack":
      return data.pick(["React + Node", "Vue + Python", "Next.js + Go", "Angular + Rust", "Svelte + Elixir"] as const);
    case "Uptime":
      return `${data.int(990, 999) / 10}%`;
    case "API Version":
      return `v${data.int(1, 5)}.${data.int(0, 9)}.${data.int(0, 20)}`;
    case "Region":
      return data.pick(["us-east-1", "eu-west-1", "ap-southeast-1", "us-west-2", "eu-central-1"] as const);
    default:
      return data.name();
  }
}
