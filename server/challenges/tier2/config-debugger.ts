/**
 * Tier 2 Challenge: Config Override Debugger
 *
 * A configuration system with 3 layers: defaults → production → overrides.
 * The resolved config has one value flagged as "unexpected" (causing a bug).
 * Agent must load each layer via interact, trace which layer introduced the
 * bad override, and determine what the correct value should be.
 *
 * Tests: cascade/layer tracing, multi-source comparison.
 */

import type { ChallengeDefinition } from "../../../src/lib/challenge-types";
import type { ChallengeData } from "../../../src/lib/seed";

interface ConfigDebuggerPageData {
  resolvedConfig: Record<string, string | number | boolean>;
  flaggedKey: string;
  expectedBehavior: string;
  layerNames: string[];
  variantIndex: number;
}

// Pool of config keys with default → production override ranges
const CONFIG_POOL: Array<{
  key: string;
  category: string;
  defaultVal: () => (data: ChallengeData) => string | number | boolean;
  badVal: () => (data: ChallengeData) => string | number | boolean;
}> = [
  {
    key: "database_pool_size",
    category: "database",
    defaultVal: () => (d) => d.int(5, 15),
    badVal: () => (d) => d.int(80, 200),
  },
  {
    key: "cache_ttl_seconds",
    category: "performance",
    defaultVal: () => (d) => d.int(300, 900),
    badVal: () => (d) => d.int(5, 15),
  },
  {
    key: "max_retries",
    category: "resilience",
    defaultVal: () => (d) => d.int(3, 5),
    badVal: () => (d) => d.int(0, 0),
  },
  {
    key: "api_timeout_ms",
    category: "network",
    defaultVal: () => (d) => d.int(5000, 15000),
    badVal: () => (d) => d.int(100, 500),
  },
  {
    key: "log_level",
    category: "observability",
    defaultVal: () => () => "warn",
    badVal: () => () => "debug",
  },
  {
    key: "enable_rate_limiting",
    category: "security",
    defaultVal: () => () => true,
    badVal: () => () => false,
  },
  {
    key: "max_upload_size_mb",
    category: "storage",
    defaultVal: () => (d) => d.int(10, 50),
    badVal: () => (d) => d.int(500, 2000),
  },
  {
    key: "session_expiry_hours",
    category: "auth",
    defaultVal: () => (d) => d.int(1, 8),
    badVal: () => (d) => d.int(168, 720),
  },
  {
    key: "cors_allow_all",
    category: "security",
    defaultVal: () => () => false,
    badVal: () => () => true,
  },
  {
    key: "worker_concurrency",
    category: "performance",
    defaultVal: () => (d) => d.int(4, 8),
    badVal: () => (d) => d.int(50, 100),
  },
  {
    key: "enable_debug_endpoints",
    category: "security",
    defaultVal: () => () => false,
    badVal: () => () => true,
  },
  {
    key: "backup_interval_hours",
    category: "storage",
    defaultVal: () => (d) => d.int(1, 6),
    badVal: () => (d) => d.int(48, 168),
  },
  {
    key: "max_request_body_kb",
    category: "network",
    defaultVal: () => (d) => d.int(256, 1024),
    badVal: () => (d) => d.int(50, 100),
  },
  {
    key: "enable_metrics",
    category: "observability",
    defaultVal: () => () => true,
    badVal: () => () => false,
  },
  {
    key: "gc_pressure_threshold",
    category: "performance",
    defaultVal: () => (d) => d.int(70, 85),
    badVal: () => (d) => d.int(5, 15),
  },
  {
    key: "smtp_port",
    category: "network",
    defaultVal: () => () => 587,
    badVal: () => () => 25,
  },
];

export const configDebuggerChallenge: ChallengeDefinition<ConfigDebuggerPageData> = {
  id: "tier2-config-debugger",
  title: "Config Override Debugger",
  tier: 2,
  dependsOn: ["tier1-filter-search"],
  description: "Trace through layered config overrides to find which layer introduced a bad value.",

  instructions: (pageData) => {
    const interactHint = `To load a config layer, use the interact API with action "layer" and parameter name set to the layer name (e.g. { "name": "defaults" }, { "name": "production" }, or { "name": "overrides" }).`;
    const variants = [
      `A configuration system uses 3 layers: defaults → production → overrides (last wins). The resolved config below has one key flagged as problematic — "${pageData.flaggedKey}" has an unexpected value. Load each config layer, trace which layer introduced the bad override, and determine what the correct value should be (the value from the layer before the override). Submit your answer as "layerName:key:correctValue". ${interactHint}`,
      `The resolved configuration shows the final merged values from 3 layers (defaults, production, overrides). The key "${pageData.flaggedKey}" is flagged as causing issues. Investigate each layer to find which one overrode it to the wrong value, then report the layer name, key, and what the value should be. Format: "layer:key:value". ${interactHint}`,
      `Debug this config cascade. Three layers merge into the resolved config shown below. The key "${pageData.flaggedKey}" has a bad value. Load each layer via the panel below, find which layer is responsible for the override, and determine the correct value (what the previous layer had). Answer format: "layerName:key:correctValue". ${interactHint}`,
      `Something is wrong with "${pageData.flaggedKey}" in the resolved config. The config system has 3 layers (defaults → production → overrides) where later layers override earlier ones. Find which layer set the bad value and what it should be instead. Submit as "layer:key:value". ${interactHint}`,
    ];
    return variants[pageData.variantIndex];
  },

  generate(data: ChallengeData) {
    const variantIndex = data.int(0, 3);

    // Pick 13-15 config keys
    const keyCount = data.int(13, 15);
    const selectedKeys = data.pickN(CONFIG_POOL, keyCount);

    // Build defaults layer — all keys get default values
    const defaults: Record<string, string | number | boolean> = {};
    for (const entry of selectedKeys) {
      defaults[entry.key] = entry.defaultVal()(data);
    }

    // Pick which keys production overrides (4-6 keys, different values)
    const prodOverrideCount = Math.min(data.int(4, 6), selectedKeys.length);
    const prodOverrideIndices = new Set<number>();
    while (prodOverrideIndices.size < prodOverrideCount) {
      prodOverrideIndices.add(data.int(0, selectedKeys.length - 1));
    }

    const production: Record<string, string | number | boolean> = {};
    for (const idx of prodOverrideIndices) {
      const entry = selectedKeys[idx];
      // Generate a different value for production
      const defaultV = defaults[entry.key];
      let prodV: string | number | boolean;
      if (typeof defaultV === "number") {
        // Shift the value by a seeded amount
        prodV = defaultV + data.int(-Math.floor(defaultV * 0.3), Math.floor(defaultV * 0.5));
        if (prodV === defaultV) prodV = defaultV + 1;
      } else if (typeof defaultV === "boolean") {
        prodV = defaultV; // keep same for boolean in production (only bad override flips)
      } else {
        prodV = defaultV; // keep same for strings in production
      }
      production[entry.key] = prodV;
    }

    // Pick which keys overrides layer touches (2-3 keys)
    const overrideCount = data.int(2, 3);
    const overrideIndices = new Set<number>();
    while (overrideIndices.size < overrideCount) {
      overrideIndices.add(data.int(0, selectedKeys.length - 1));
    }

    const overrides: Record<string, string | number | boolean> = {};
    for (const idx of overrideIndices) {
      const entry = selectedKeys[idx];
      const baseV = production[entry.key] ?? defaults[entry.key];
      let overV: string | number | boolean;
      if (typeof baseV === "number") {
        overV = baseV + data.int(1, Math.max(2, Math.floor(baseV * 0.2)));
      } else {
        overV = baseV;
      }
      overrides[entry.key] = overV;
    }

    // Pick the flagged key — must be one that gets overridden in production or overrides
    // We'll inject a "bad" value into one layer for the flagged key
    const flaggedIdx = data.int(0, selectedKeys.length - 1);
    const flaggedEntry = selectedKeys[flaggedIdx];
    const flaggedKey = flaggedEntry.key;

    // Decide which layer introduces the bad value
    const badLayerChoice = data.pick(["production", "overrides"] as const);

    // The "correct" value is what the previous layer had
    let correctValue: string | number | boolean;
    let badValue: string | number | boolean;

    badValue = flaggedEntry.badVal()(data);

    if (badLayerChoice === "production") {
      // Correct value is from defaults
      correctValue = defaults[flaggedKey];
      production[flaggedKey] = badValue;
      // Remove from overrides if it was there (so production is the source)
      delete overrides[flaggedKey];
    } else {
      // Correct value is from production if it overrides, else defaults
      correctValue = production[flaggedKey] ?? defaults[flaggedKey];
      overrides[flaggedKey] = badValue;
    }

    // Build resolved config (defaults → production → overrides)
    const resolvedConfig: Record<string, string | number | boolean> = { ...defaults };
    for (const [k, v] of Object.entries(production)) {
      resolvedConfig[k] = v;
    }
    for (const [k, v] of Object.entries(overrides)) {
      resolvedConfig[k] = v;
    }

    const expectedBehavior = `"${flaggedKey}" is set to ${JSON.stringify(resolvedConfig[flaggedKey])} but should be ${JSON.stringify(correctValue)}`;

    const answer = `${badLayerChoice}:${flaggedKey}:${String(correctValue)}`;

    return {
      pageData: {
        resolvedConfig,
        flaggedKey,
        expectedBehavior,
        layerNames: ["defaults", "production", "overrides"],
        variantIndex,
      },
      hiddenData: {
        layers: { defaults, production, overrides },
      },
      answer,
    };
  },

  interactActions: ["layer"],

  handleInteract(hiddenData, action, params) {
    if (action === "layer") {
      const name = params.name as string | undefined;
      if (!name) {
        return { error: "Missing required parameter: name. Use { \"name\": \"<layer-name>\" }." };
      }
      const layers = hiddenData.layers as Record<string, Record<string, string | number | boolean>>;
      const layer = layers[name];
      if (!layer) {
        return { error: `Unknown layer "${name}". Valid layers: ${Object.keys(layers).join(", ")}` };
      }
      return { name, config: layer };
    }
    return null;
  },

  validateAnswer(submitted: string, correct: string): boolean {
    const sParts = submitted.trim().split(":");
    const cParts = correct.split(":");
    if (sParts.length < 3 || cParts.length < 3) return false;

    const sLayer = sParts[0].trim().toLowerCase();
    const sKey = sParts[1].trim().toLowerCase();
    // Value might contain colons, so join remaining parts
    const sValue = sParts.slice(2).join(":").trim().toLowerCase();

    const cLayer = cParts[0].trim().toLowerCase();
    const cKey = cParts[1].trim().toLowerCase();
    const cValue = cParts.slice(2).join(":").trim().toLowerCase();

    return sLayer === cLayer && sKey === cKey && sValue === cValue;
  },
};
