"use client";

import { useState, useEffect, MutableRefObject } from "react";
import { testAttr } from "../../../../lib/test-attrs";
import { useInteract } from "../../../../lib/use-interact";

type BaseOperation = {
  operator: "add" | "subtract" | "multiply" | "divide";
  operand: number | null;
  hidden: boolean;
  label: string;
  type: "normal";
};

type ConditionalOperation = {
  threshold: number;
  ifAbove: { operator: "add" | "subtract"; operand: number | null };
  ifBelow: { operator: "add" | "subtract"; operand: number | null };
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

interface Props {
  pageData: SequentialCalculatorPageData;
  answerRef: MutableRefObject<string>;
  sessionId: string;
  challengeId: string;
  renderToken: string;
}

const OP_SYMBOLS: Record<string, string> = {
  add: "+",
  subtract: "\u2212",
  multiply: "\u00d7",
  divide: "\u00f7",
};

export default function SequentialCalculatorChallenge({ pageData, answerRef, sessionId, challengeId, renderToken }: Props) {
  const [answer, setAnswer] = useState("");
  const [revealedSteps, setRevealedSteps] = useState<Set<number>>(new Set());
  const [revealedValues, setRevealedValues] = useState<Record<number, unknown>>({});
  const [loadingReveal, setLoadingReveal] = useState<number | null>(null);
  const interact = useInteract(challengeId, sessionId, renderToken);

  useEffect(() => {
    answerRef.current = answer;
  }, [answer, answerRef]);

  const revealStep = async (index: number) => {
    if (revealedSteps.has(index)) return;
    setLoadingReveal(index);
    try {
      const result = await interact("reveal", { stepIndex: index }) as { operand: unknown };
      if (result?.operand !== undefined) {
        setRevealedValues(prev => ({ ...prev, [index]: result.operand }));
      }
      setRevealedSteps(prev => new Set([...prev, index]));
    } catch (err) {
      console.error("Failed to reveal step:", err);
    } finally {
      setLoadingReveal(null);
    }
  };

  const getRevealedOperand = (index: number): number | null => {
    const val = revealedValues[index];
    return typeof val === "number" ? val : null;
  };

  const getRevealedConditional = (index: number): { ifAbove: number; ifBelow: number } | null => {
    const val = revealedValues[index];
    if (val && typeof val === "object" && "ifAbove" in (val as object)) {
      return val as { ifAbove: number; ifBelow: number };
    }
    return null;
  };

  return (
    <div>
      {/* Starting value */}
      <div className="bg-gray-900 rounded-lg border border-gray-800 p-4 mb-6">
        <p className="text-sm text-gray-400">Starting Value</p>
        <p className="text-2xl font-mono font-bold" {...testAttr('start-value')}>{pageData.startValue}</p>
      </div>

      {/* Operations */}
      <div className="space-y-3 mb-6">
        {pageData.operations.map((op, i) => (
          <div
            key={i}
            className="bg-gray-900 rounded-lg border border-gray-800 p-4"
            {...testAttr('step', String(i))}
            {...testAttr('step-type', op.type)}
          >
            {op.type === "normal" && (
              <div className="flex items-center gap-3">
                <span className="text-sm text-gray-500 w-14">{op.label}</span>
                <span className="text-lg font-mono text-blue-400">{OP_SYMBOLS[op.operator]}</span>
                {op.hidden && !revealedSteps.has(i) ? (
                  loadingReveal === i ? (
                    <span className="text-sm text-gray-400">Loading...</span>
                  ) : (
                    <button
                      onClick={() => revealStep(i)}
                      className="px-3 py-1 text-sm bg-gray-800 rounded border border-gray-700 text-gray-400 hover:text-gray-200 hover:border-gray-500 transition-colors"
                      {...testAttr('reveal', String(i))}
                    >
                      Reveal
                    </button>
                  )
                ) : (
                  <span className="text-lg font-mono" {...testAttr('operand', String(i))}>
                    {op.operand !== null ? op.operand : getRevealedOperand(i) ?? "?"}
                  </span>
                )}
              </div>
            )}

            {op.type === "conditional" && (() => {
              const revealed = getRevealedConditional(i);
              return (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-sm text-gray-500 w-14">{op.label}</span>
                    <span className="text-sm text-amber-400 font-medium">CONDITIONAL</span>
                  </div>
                  <div className="ml-14 text-sm space-y-1" {...testAttr('conditional', String(i))}>
                    <p className="text-gray-300">
                      IF current &gt; <span className="font-mono text-white" {...testAttr('threshold', String(i))}>{op.threshold}</span>:
                    </p>
                    <p className="text-gray-400 ml-4">
                      {OP_SYMBOLS[op.ifAbove.operator]}{" "}
                      {op.hidden && !revealedSteps.has(i) ? (
                        loadingReveal === i ? (
                          <span className="text-xs text-gray-400">Loading...</span>
                        ) : (
                          <button
                            onClick={() => revealStep(i)}
                            className="px-2 py-0.5 text-xs bg-gray-800 rounded border border-gray-700 text-gray-400 hover:text-gray-200 hover:border-gray-500 transition-colors"
                            {...testAttr('reveal', String(i))}
                          >
                            Reveal
                          </button>
                        )
                      ) : (
                        <span className="font-mono" {...testAttr('operand-above', String(i))}>
                          {op.ifAbove.operand !== null ? op.ifAbove.operand : revealed?.ifAbove ?? "?"}
                        </span>
                      )}
                    </p>
                    <p className="text-gray-300">OTHERWISE:</p>
                    <p className="text-gray-400 ml-4">
                      {OP_SYMBOLS[op.ifBelow.operator]}{" "}
                      {op.hidden && !revealedSteps.has(i) ? (
                        <span className="text-xs text-gray-600">[Reveal above]</span>
                      ) : (
                        <span className="font-mono" {...testAttr('operand-below', String(i))}>
                          {op.ifBelow.operand !== null ? op.ifBelow.operand : revealed?.ifBelow ?? "?"}
                        </span>
                      )}
                    </p>
                  </div>
                </div>
              );
            })()}

            {op.type === "lookup" && (
              <div className="flex items-center gap-3">
                <span className="text-sm text-gray-500 w-14">{op.label}</span>
                <span className="text-lg font-mono text-blue-400">{OP_SYMBOLS[op.operator]}</span>
                <span className="text-sm text-purple-400" {...testAttr('lookup-key', String(i))}>
                  value of &quot;{op.lookupKey}&quot; from reference table
                </span>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Reference Table */}
      <div className="mb-6">
        <h3 className="text-sm font-medium text-gray-400 mb-2">Reference Table</h3>
        <div className="overflow-x-auto rounded-lg border border-gray-800">
          <table className="w-full text-sm" {...testAttr('table', 'reference')}>
            <thead>
              <tr className="bg-gray-900">
                <th className="px-4 py-2 text-left text-gray-400 font-medium">Key</th>
                <th className="px-4 py-2 text-right text-gray-400 font-medium">Value</th>
              </tr>
            </thead>
            <tbody>
              {pageData.referenceTable.map((entry) => (
                <tr key={entry.key} className="border-t border-gray-800" {...testAttr('ref-key', entry.key)}>
                  <td className="px-4 py-2">{entry.key}</td>
                  <td className="px-4 py-2 text-right font-mono" {...testAttr('ref-value')}>{entry.value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Answer input */}
      <div>
        <label className="block text-sm text-gray-400 mb-2">Final Result</label>
        <input
          type="text"
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          placeholder="Enter the final result..."
          className="w-full max-w-md px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-gray-100 placeholder-gray-500 focus:outline-none focus:border-blue-500"
        />
      </div>
    </div>
  );
}
