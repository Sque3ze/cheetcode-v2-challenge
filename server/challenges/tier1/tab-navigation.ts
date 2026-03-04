/**
 * Tier 1 Challenge: Tab Navigation (Round 3 — Chained Decision Tree)
 *
 * 2-level decision tree: Check key1 in tab1. If above threshold1,
 * check key2 in tab2. If above threshold2, submit key3 from tab3.
 * Otherwise submit key4 from tab4. If key1 was below threshold1,
 * submit key5 from tab5.
 * Requires 3-4 tab navigations with branching.
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
  // Second level — only evaluated if first condition is above
  secondConditionTab: string;
  secondConditionKey: string;
  secondConditionThreshold: number;
  // Leaf nodes
  ifAboveAboveTab: string;
  ifAboveAboveKey: string;
  ifAboveBelowTab: string;
  ifAboveBelowKey: string;
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
    const {
      conditionKey, conditionTab, conditionThreshold,
      secondConditionKey, secondConditionTab, secondConditionThreshold,
      ifAboveAboveKey, ifAboveAboveTab,
      ifAboveBelowKey, ifAboveBelowTab,
      ifBelowKey, ifBelowTab,
    } = pageData;
    const variants = [
      `Check "${conditionKey}" in the "${conditionTab}" tab. If above ${conditionThreshold}, then check "${secondConditionKey}" in "${secondConditionTab}". If that is above ${secondConditionThreshold}, submit "${ifAboveAboveKey}" from "${ifAboveAboveTab}". Otherwise submit "${ifAboveBelowKey}" from "${ifAboveBelowTab}". If "${conditionKey}" was not above ${conditionThreshold}, submit "${ifBelowKey}" from "${ifBelowTab}".`,

      `Navigate to "${conditionTab}" and read "${conditionKey}". When it exceeds ${conditionThreshold}, go to "${secondConditionTab}" and check "${secondConditionKey}" against ${secondConditionThreshold}. Above? Answer with "${ifAboveAboveKey}" from "${ifAboveAboveTab}". Below or equal? Answer with "${ifAboveBelowKey}" from "${ifAboveBelowTab}". If the first check ("${conditionKey}") was ${conditionThreshold} or less, your answer is "${ifBelowKey}" from "${ifBelowTab}".`,

      `First, find "${conditionKey}" in "${conditionTab}". Compare it to ${conditionThreshold}. If greater, proceed to "${secondConditionTab}" and evaluate "${secondConditionKey}" against ${secondConditionThreshold}: above means submit "${ifAboveAboveKey}" from "${ifAboveAboveTab}", otherwise "${ifAboveBelowKey}" from "${ifAboveBelowTab}". If the initial "${conditionKey}" was not above ${conditionThreshold}, submit "${ifBelowKey}" from "${ifBelowTab}".`,

      `Look up "${conditionKey}" in the "${conditionTab}" section. If that number is greater than ${conditionThreshold}, check "${secondConditionKey}" in "${secondConditionTab}" next. Above ${secondConditionThreshold}? Provide "${ifAboveAboveKey}" from "${ifAboveAboveTab}". Not above? Provide "${ifAboveBelowKey}" from "${ifAboveBelowTab}". If "${conditionKey}" was ${conditionThreshold} or below from the start, provide "${ifBelowKey}" from "${ifBelowTab}".`,
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

    // Always use 4 tabs for enough branching targets
    const selectedConfigs = data.pickN(tabConfigs, 4);

    const tabs: TabData[] = selectedConfigs.map((config) => ({
      label: config.label,
      content: config.keys.map((key) => ({
        key,
        value: generateValue(key, data),
      })),
    }));

    const numericKeys: { tab: TabData; key: string; value: number }[] = [];
    for (const tab of tabs) {
      for (const item of tab.content) {
        const num = parseNumericValue(item.value);
        if (num !== null) {
          numericKeys.push({ tab, key: item.key, value: num });
        }
      }
    }

    // First condition
    const conditionEntry = data.pick(numericKeys);
    const conditionTab = conditionEntry.tab.label;
    const conditionKey = conditionEntry.key;

    // Bias toward first condition being above (so second branch is exercised)
    const firstIsAbove = data.int(1, 10) <= 6;
    const conditionThreshold = firstIsAbove
      ? Math.floor(conditionEntry.value - data.int(1, 10))
      : Math.ceil(conditionEntry.value + data.int(1, 10));

    // Second condition (from a different tab)
    const secondCandidates = numericKeys.filter((n) => n.tab.label !== conditionEntry.tab.label);
    const secondConditionEntry = data.pick(secondCandidates.length > 0 ? secondCandidates : numericKeys);
    const secondConditionTab = secondConditionEntry.tab.label;
    const secondConditionKey = secondConditionEntry.key;

    const secondIsAbove = data.int(1, 10) <= 5;
    const secondConditionThreshold = secondIsAbove
      ? Math.floor(secondConditionEntry.value - data.int(1, 10))
      : Math.ceil(secondConditionEntry.value + data.int(1, 10));

    // Leaf targets — each from a different tab if possible
    const allTabs = tabs;
    const pickLeaf = (exclude: string[]) => {
      const candidates = allTabs.filter((t) => !exclude.includes(t.label));
      const tab = candidates.length > 0 ? data.pick(candidates) : data.pick(allTabs);
      const item = data.pick(tab.content);
      return { tab: tab.label, key: item.key, value: item.value };
    };

    const leafAboveAbove = pickLeaf([conditionTab, secondConditionTab]);
    const leafAboveBelow = pickLeaf([conditionTab, secondConditionTab, leafAboveAbove.tab]);
    const leafBelow = pickLeaf([conditionTab]);

    let answer: string;
    if (conditionEntry.value > conditionThreshold) {
      if (secondConditionEntry.value > secondConditionThreshold) {
        answer = leafAboveAbove.value;
      } else {
        answer = leafAboveBelow.value;
      }
    } else {
      answer = leafBelow.value;
    }

    // Build gated tab contents: only first tab visible initially
    const tabContents: Record<number, Array<{ key: string; value: string }>> = {};
    const gatedTabs = tabs.map((tab, i) => {
      if (i === 0) return tab;
      tabContents[i] = tab.content;
      return { ...tab, content: [] as Array<{ key: string; value: string }> };
    });

    return {
      pageData: {
        tabs: gatedTabs,
        conditionTab,
        conditionKey,
        conditionThreshold,
        secondConditionTab,
        secondConditionKey,
        secondConditionThreshold,
        ifAboveAboveTab: leafAboveAbove.tab,
        ifAboveAboveKey: leafAboveAbove.key,
        ifAboveBelowTab: leafAboveBelow.tab,
        ifAboveBelowKey: leafAboveBelow.key,
        ifBelowTab: leafBelow.tab,
        ifBelowKey: leafBelow.key,
        variantIndex,
      },
      hiddenData: { tabContents },
      answer,
    };
  },

  interactActions: ["tab"],

  handleInteract(hiddenData, action, params) {
    if (action === "tab") {
      const index = params.index as number | undefined;
      if (index === undefined || index === null) {
        return { error: "Missing required parameter: index. Use { \"index\": <tab number> }." };
      }
      const tabContents = hiddenData.tabContents as Record<number, Array<{ key: string; value: string }>>;
      const content = tabContents[index];
      if (!content) {
        return { error: `Unknown tab index ${index}. Valid indices: ${Object.keys(tabContents).join(", ")}` };
      }
      return { content };
    }
    return null;
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
