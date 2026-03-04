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
      <div className="card-surface" style={{ borderRadius: 12, padding: 16, marginBottom: 24 }}>
        <p className="text-sm" style={{ color: "rgba(38,38,38,0.5)" }}>Starting Value</p>
        <p className="text-2xl font-mono font-bold" {...testAttr('start-value')}>{pageData.startValue}</p>
      </div>

      {/* Operations */}
      <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 24 }}>
        {pageData.operations.map((op, i) => (
          <div
            key={i}
            className="card-surface"
            style={{ borderRadius: 12, padding: 16 }}
            {...testAttr('step', String(i))}
            {...testAttr('step-type', op.type)}
          >
            {op.type === "normal" && (
              <div className="flex items-center" style={{ gap: 12 }}>
                <span className="text-sm" style={{ color: "rgba(38,38,38,0.35)", width: 56 }}>{op.label}</span>
                <span className="text-lg font-mono" style={{ color: "#fa5d19" }} {...testAttr('operator', String(i))}>{OP_SYMBOLS[op.operator]}</span>
                {op.hidden && !revealedSteps.has(i) ? (
                  loadingReveal === i ? (
                    <span className="text-sm" style={{ color: "rgba(38,38,38,0.5)" }}>Loading...</span>
                  ) : (
                    <button
                      onClick={() => revealStep(i)}
                      className="btn-ghost text-sm"
                      style={{ padding: "4px 12px", borderRadius: 6 }}
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
                  <div className="flex items-center" style={{ gap: 8, marginBottom: 8 }}>
                    <span className="text-sm" style={{ color: "rgba(38,38,38,0.35)", width: 56 }}>{op.label}</span>
                    <span className="text-sm font-medium" style={{ color: "#b45309" }}>CONDITIONAL</span>
                  </div>
                  <div className="text-sm" style={{ marginLeft: 56, display: "flex", flexDirection: "column", gap: 4 }} {...testAttr('conditional', String(i))}>
                    <p style={{ color: "rgba(38,38,38,0.7)" }}>
                      IF current &gt; <span className="font-mono" style={{ color: "#262626" }} {...testAttr('threshold', String(i))}>{op.threshold}</span>:
                    </p>
                    <p style={{ color: "rgba(38,38,38,0.5)", marginLeft: 16 }}>
                      <span {...testAttr('operator-above', String(i))}>{OP_SYMBOLS[op.ifAbove.operator]}</span>{" "}
                      {op.hidden && !revealedSteps.has(i) ? (
                        loadingReveal === i ? (
                          <span className="text-xs" style={{ color: "rgba(38,38,38,0.5)" }}>Loading...</span>
                        ) : (
                          <button
                            onClick={() => revealStep(i)}
                            className="btn-ghost text-xs"
                            style={{ padding: "2px 8px", borderRadius: 4 }}
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
                    <p style={{ color: "rgba(38,38,38,0.7)" }}>OTHERWISE:</p>
                    <p style={{ color: "rgba(38,38,38,0.5)", marginLeft: 16 }}>
                      <span {...testAttr('operator-below', String(i))}>{OP_SYMBOLS[op.ifBelow.operator]}</span>{" "}
                      {op.hidden && !revealedSteps.has(i) ? (
                        <span className="text-xs" style={{ color: "rgba(38,38,38,0.35)" }}>[Reveal above]</span>
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
              <div className="flex items-center" style={{ gap: 12 }}>
                <span className="text-sm" style={{ color: "rgba(38,38,38,0.35)", width: 56 }}>{op.label}</span>
                <span className="text-lg font-mono" style={{ color: "#fa5d19" }} {...testAttr('operator', String(i))}>{OP_SYMBOLS[op.operator]}</span>
                <span className="text-sm" style={{ color: "#9061ff" }} {...testAttr('lookup-key', String(i))}>
                  value of &quot;{op.lookupKey}&quot; from reference table
                </span>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Reference Table */}
      <div style={{ marginBottom: 24 }}>
        <h3 className="text-sm font-medium" style={{ color: "rgba(38,38,38,0.5)", marginBottom: 8 }}>Reference Table</h3>
        <div className="card-surface overflow-x-auto" style={{ borderRadius: 12, overflow: "hidden" }}>
          <table className="w-full text-sm" {...testAttr('table', 'reference')}>
            <thead>
              <tr style={{ background: "#f3f3f3" }}>
                <th className="text-left font-medium" style={{ padding: "8px 16px", color: "rgba(38,38,38,0.5)" }}>Key</th>
                <th className="text-right font-medium" style={{ padding: "8px 16px", color: "rgba(38,38,38,0.5)" }}>Value</th>
              </tr>
            </thead>
            <tbody>
              {pageData.referenceTable.map((entry) => (
                <tr key={entry.key} style={{ borderTop: "1px solid #e8e8e8" }} {...testAttr('ref-key', entry.key)}>
                  <td style={{ padding: "8px 16px" }}>{entry.key}</td>
                  <td className="text-right font-mono" style={{ padding: "8px 16px" }} {...testAttr('ref-value')}>{entry.value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Answer input */}
      <div>
        <label className="text-sm" style={{ display: "block", color: "rgba(38,38,38,0.5)", marginBottom: 8 }}>Final Result</label>
        <input
          type="text"
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          placeholder="Enter the final result..."
          style={{ width: "100%", maxWidth: 448, padding: "8px 16px", background: "#fff", border: "1px solid #d1d1d1", borderRadius: 8, color: "#262626", outline: "none" }}
        />
      </div>
    </div>
  );
}
