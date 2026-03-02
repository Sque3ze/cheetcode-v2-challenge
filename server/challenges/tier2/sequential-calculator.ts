/**
 * Tier 2 Challenge: Sequential Calculator (Moderate Rework)
 *
 * Changes:
 * - Add conditional operations: "If current > 50, add 12; otherwise subtract 8"
 * - Add lookup operations: one operand references a value in a separate reference table
 * - Increase hidden percentage (60-70% behind Reveal buttons)
 *
 * Tests: sequential multi-step computation, conditional reasoning,
 * cross-referencing a lookup table, interacting with UI to reveal data.
 */

import type { ChallengeDefinition } from "../../../src/lib/challenge-types";
import type { ChallengeData } from "../../../src/lib/seed";

type BaseOperation = {
  operator: "add" | "subtract" | "multiply" | "divide";
  operand: number;
  hidden: boolean;
  label: string;
  type: "normal";
};

type ConditionalOperation = {
  threshold: number;
  ifAbove: { operator: "add" | "subtract"; operand: number };
  ifBelow: { operator: "add" | "subtract"; operand: number };
  hidden: boolean;
  label: string;
  type: "conditional";
};

type LookupOperation = {
  operator: "add" | "subtract" | "multiply";
  lookupKey: string;
  lookupValue: number;
  hidden: boolean;
  label: string;
  type: "lookup";
};

type Operation = BaseOperation | ConditionalOperation | LookupOperation;

interface ReferenceEntry {
  key: string;
  value: number;
}

interface SequentialCalculatorPageData {
  startValue: number;
  operations: Operation[];
  referenceTable: ReferenceEntry[];
}

const OP_SYMBOLS: Record<string, string> = {
  add: "+",
  subtract: "\u2212",
  multiply: "\u00d7",
  divide: "\u00f7",
};

export const sequentialCalculatorChallenge: ChallengeDefinition<SequentialCalculatorPageData> = {
  id: "tier2-sequential-calculator",
  title: "Sequential Calculator",
  tier: 2,
  description: "Apply operations including conditionals and lookups to compute a final value.",

  instructions: (pageData) => {
    const steps = pageData.operations.map((op, i) => {
      if (op.type === "conditional") {
        const aboveSym = OP_SYMBOLS[op.ifAbove.operator];
        const belowSym = OP_SYMBOLS[op.ifBelow.operator];
        if (op.hidden) {
          return `Step ${i + 1}: IF current > ${op.threshold}, ${aboveSym} [Reveal]; otherwise ${belowSym} [Reveal]`;
        }
        return `Step ${i + 1}: IF current > ${op.threshold}, ${aboveSym} ${op.ifAbove.operand}; otherwise ${belowSym} ${op.ifBelow.operand}`;
      }
      if (op.type === "lookup") {
        const sym = OP_SYMBOLS[op.operator];
        return `Step ${i + 1}: ${sym} value of "${op.lookupKey}" from the reference table`;
      }
      const sym = OP_SYMBOLS[op.operator];
      if (op.hidden) {
        return `Step ${i + 1}: ${sym} [click "Reveal" to see the value]`;
      }
      return `Step ${i + 1}: ${sym} ${op.operand}`;
    });
    return (
      `Start with ${pageData.startValue}. Apply each operation in order:\n` +
      steps.join("\n") +
      `\nSubmit the final result rounded to 2 decimal places.`
    );
  },

  generate(data: ChallengeData) {
    const startValue = data.int(10, 100);
    const stepCount = data.int(4, 6);

    // Generate reference table for lookup operations
    const refKeys = ["Alpha", "Beta", "Gamma", "Delta", "Epsilon"] as const;
    const referenceTable: ReferenceEntry[] = refKeys.map((key) => ({
      key,
      value: data.int(2, 30),
    }));

    const operations: Operation[] = [];
    let currentValue = startValue;

    for (let i = 0; i < stepCount; i++) {
      // 60-70% chance of being hidden
      const hidden = data.int(1, 10) <= 6;

      // Decide operation type: 60% normal, 20% conditional, 20% lookup
      const typeRoll = data.int(1, 10);

      if (typeRoll <= 6) {
        // Normal operation
        const operator = data.pick(["add", "subtract", "multiply", "divide"] as const);
        let operand: number;

        switch (operator) {
          case "add":
            operand = data.int(5, 50);
            currentValue += operand;
            break;
          case "subtract":
            operand = data.int(5, 30);
            currentValue -= operand;
            break;
          case "multiply":
            operand = data.int(2, 5);
            currentValue *= operand;
            break;
          case "divide":
            operand = data.pick([2, 3, 4, 5] as const);
            currentValue /= operand;
            break;
        }

        operations.push({
          type: "normal",
          operator,
          operand,
          hidden,
          label: `Step ${i + 1}`,
        });
      } else if (typeRoll <= 8) {
        // Conditional operation
        const threshold = Math.round(currentValue);
        const ifAboveOp = data.pick(["add", "subtract"] as const);
        const ifBelowOp = data.pick(["add", "subtract"] as const);
        const ifAboveVal = data.int(5, 25);
        const ifBelowVal = data.int(5, 25);

        if (currentValue > threshold) {
          currentValue = ifAboveOp === "add" ? currentValue + ifAboveVal : currentValue - ifAboveVal;
        } else {
          currentValue = ifBelowOp === "add" ? currentValue + ifBelowVal : currentValue - ifBelowVal;
        }

        operations.push({
          type: "conditional",
          threshold,
          ifAbove: { operator: ifAboveOp, operand: ifAboveVal },
          ifBelow: { operator: ifBelowOp, operand: ifBelowVal },
          hidden,
          label: `Step ${i + 1}`,
        });
      } else {
        // Lookup operation
        const ref = data.pick(referenceTable);
        const operator = data.pick(["add", "subtract", "multiply"] as const);

        switch (operator) {
          case "add":
            currentValue += ref.value;
            break;
          case "subtract":
            currentValue -= ref.value;
            break;
          case "multiply":
            currentValue *= ref.value;
            break;
        }

        operations.push({
          type: "lookup",
          operator,
          lookupKey: ref.key,
          lookupValue: ref.value,
          hidden: false, // Lookup ops are visible (you still need to find the value)
          label: `Step ${i + 1}`,
        });
      }
    }

    const answer = (Math.round(currentValue * 100) / 100).toFixed(2);

    return {
      pageData: {
        startValue,
        operations,
        referenceTable,
      },
      answer,
    };
  },

  validateAnswer(submitted: string, correct: string): boolean {
    const s = parseFloat(submitted.trim());
    const c = parseFloat(correct);
    if (isNaN(s)) return false;
    return Math.abs(s - c) < 0.011;
  },
};
