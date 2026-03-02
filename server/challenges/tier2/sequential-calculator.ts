/**
 * Tier 2 Challenge: Sequential Calculator (Moderate Rework)
 *
 * Conditional operations, lookup operations, and hidden values behind Reveal buttons.
 */

import type { ChallengeDefinition } from "../../../src/lib/challenge-types";
import type { ChallengeData } from "../../../src/lib/seed";

type BaseOperation = { operator: "add" | "subtract" | "multiply" | "divide"; operand: number | null; hidden: boolean; label: string; type: "normal"; };
type ConditionalOperation = { threshold: number; ifAbove: { operator: "add" | "subtract"; operand: number | null }; ifBelow: { operator: "add" | "subtract"; operand: number | null }; hidden: boolean; label: string; type: "conditional"; };
type LookupOperation = { operator: "add" | "subtract" | "multiply"; lookupKey: string; lookupValue: number; hidden: boolean; label: string; type: "lookup"; };
type Operation = BaseOperation | ConditionalOperation | LookupOperation;

interface ReferenceEntry { key: string; value: number; }

interface SequentialCalculatorPageData {
  startValue: number;
  operations: Operation[];
  referenceTable: ReferenceEntry[];
  variantIndex: number;
}

const OP_SYMBOLS: Record<string, string> = {
  add: "+", subtract: "\u2212", multiply: "\u00d7", divide: "\u00f7",
};

export const sequentialCalculatorChallenge: ChallengeDefinition<SequentialCalculatorPageData> = {
  id: "tier2-sequential-calculator",
  title: "Sequential Calculator",
  tier: 2,
  dependsOn: ["tier1-tab-navigation"],
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
    const stepList = steps.join("\n");
    const sv = pageData.startValue;
    const variants = [
      `Start with ${sv}. Apply each operation in order:\n${stepList}\nSubmit the final result rounded to 2 decimal places.`,
      `Beginning from ${sv}, perform the following operations sequentially:\n${stepList}\nRound your final answer to 2 decimals.`,
      `Your initial value is ${sv}. Execute these steps one by one:\n${stepList}\nProvide the result to 2 decimal places.`,
      `Take ${sv} as the starting number and apply each operation below in sequence:\n${stepList}\nSubmit the outcome rounded to two decimal places.`,
    ];
    return variants[pageData.variantIndex];
  },

  generate(data: ChallengeData) {
    const startValue = data.int(10, 100);
    const stepCount = data.int(4, 6);
    const variantIndex = data.int(0, 3);

    const refKeys = ["Alpha", "Beta", "Gamma", "Delta", "Epsilon"] as const;
    const referenceTable: ReferenceEntry[] = refKeys.map((key) => ({
      key, value: data.int(2, 30),
    }));

    const operations: Operation[] = [];
    let currentValue = startValue;

    for (let i = 0; i < stepCount; i++) {
      const hidden = data.int(1, 10) <= 6;
      const typeRoll = data.int(1, 10);

      if (typeRoll <= 6) {
        const operator = data.pick(["add", "subtract", "multiply", "divide"] as const);
        let operand: number;
        switch (operator) {
          case "add": operand = data.int(5, 50); currentValue += operand; break;
          case "subtract": operand = data.int(5, 30); currentValue -= operand; break;
          case "multiply": operand = data.int(2, 5); currentValue *= operand; break;
          case "divide": operand = data.pick([2, 3, 4, 5] as const); currentValue /= operand; break;
        }
        operations.push({ type: "normal", operator, operand, hidden, label: `Step ${i + 1}` });
      } else if (typeRoll <= 8) {
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
          type: "conditional", threshold,
          ifAbove: { operator: ifAboveOp, operand: ifAboveVal },
          ifBelow: { operator: ifBelowOp, operand: ifBelowVal },
          hidden, label: `Step ${i + 1}`,
        });
      } else {
        const ref = data.pick(referenceTable);
        const operator = data.pick(["add", "subtract", "multiply"] as const);
        switch (operator) {
          case "add": currentValue += ref.value; break;
          case "subtract": currentValue -= ref.value; break;
          case "multiply": currentValue *= ref.value; break;
        }
        operations.push({
          type: "lookup", operator, lookupKey: ref.key, lookupValue: ref.value,
          hidden: false, label: `Step ${i + 1}`,
        });
      }
    }

    const answer = (Math.round(currentValue * 100) / 100).toFixed(2);

    // Build revealed operands map for hidden steps
    const revealedOperands: Record<number, unknown> = {};
    const gatedOperations = operations.map((op, i) => {
      if (!op.hidden) return op;
      if (op.type === "normal") {
        revealedOperands[i] = op.operand;
        return { ...op, operand: null };
      }
      if (op.type === "conditional") {
        revealedOperands[i] = { ifAbove: op.ifAbove.operand, ifBelow: op.ifBelow.operand };
        return {
          ...op,
          ifAbove: { ...op.ifAbove, operand: null },
          ifBelow: { ...op.ifBelow, operand: null },
        };
      }
      return op;
    });

    return {
      pageData: { startValue, operations: gatedOperations, referenceTable, variantIndex },
      hiddenData: { revealedOperands },
      answer,
    };
  },

  interactActions: ["reveal"],

  handleInteract(hiddenData, action, params) {
    if (action === "reveal") {
      const stepIndex = params.stepIndex as number;
      const revealedOperands = hiddenData.revealedOperands as Record<number, unknown>;
      return { operand: revealedOperands[stepIndex] ?? null };
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
