"use client";

import { useState, useEffect, MutableRefObject } from "react";
import { testAttr } from "../../../../lib/test-attrs";
import { useInteract } from "../../../../lib/use-interact";

interface LineItem {
  id: string;
  description: string;
  category: string;
  quantity: number;
  unitPrice: number;
  displayedTotal: number;
}

interface TierBracket {
  label: string;
  min: number;
  max: number;
}

interface CalculationAuditPageData {
  lineItems: LineItem[];
  summaryTotal: number;
  categories: string[];
}

interface Props {
  pageData: CalculationAuditPageData;
  answerRef: MutableRefObject<string>;
  sessionId?: string;
  challengeId?: string;
  renderToken?: string;
}

export default function CalculationAuditChallenge({ pageData, answerRef, sessionId, challengeId, renderToken }: Props) {
  const [answer, setAnswer] = useState("");
  const [tieredTaxRates, setTieredTaxRates] = useState<Record<string, Record<string, number>> | null>(null);
  const [brackets, setBrackets] = useState<TierBracket[] | null>(null);
  const [loading, setLoading] = useState(true);

  const interact = useInteract(challengeId ?? "", sessionId ?? "", renderToken ?? "");

  useEffect(() => {
    answerRef.current = answer;
  }, [answer, answerRef]);

  // Fetch tax schedule via interact on mount
  useEffect(() => {
    if (!sessionId || !challengeId || !renderToken) return;

    interact("tax_schedule").then((data) => {
      const result = data as { tieredTaxRates: Record<string, Record<string, number>>; brackets: TierBracket[] };
      setTieredTaxRates(result.tieredTaxRates);
      setBrackets(result.brackets);
      setLoading(false);
    }).catch(() => {
      setLoading(false);
    });
  }, [sessionId, challengeId, renderToken, interact]);

  const categories = tieredTaxRates ? Object.keys(tieredTaxRates) : pageData.categories;

  return (
    <div>
      {loading ? (
        <div className="card-surface" style={{ borderRadius: 12, padding: 16, marginBottom: 24 }} {...testAttr('tax-rate-legend')}>
          <h3 className="text-sm font-medium" style={{ color: "#b45309", marginBottom: 12 }}>Tiered Tax Rate Schedule</h3>
          <p className="text-xs" style={{ color: "rgba(38,38,38,0.35)" }}>Loading tax rate schedule...</p>
        </div>
      ) : tieredTaxRates && brackets && brackets.length > 0 && (
        <div className="card-surface" style={{ borderRadius: 12, padding: 16, marginBottom: 24 }} {...testAttr('tax-rate-legend')}>
          <h3 className="text-sm font-medium" style={{ color: "#b45309", marginBottom: 12 }}>Tiered Tax Rate Schedule</h3>
          <p className="text-xs" style={{ color: "rgba(38,38,38,0.35)", marginBottom: 12 }}>Rate depends on category AND subtotal bracket (qty &times; unit price)</p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm" {...testAttr('tax-rate-table')}>
              <thead>
                <tr>
                  <th className="text-left font-medium text-xs" style={{ padding: "8px 12px", color: "rgba(38,38,38,0.5)" }}>Category</th>
                  {brackets.map((b) => (
                    <th key={b.label} className="text-right font-medium text-xs" style={{ padding: "8px 12px", color: "rgba(38,38,38,0.5)" }} {...testAttr('bracket-header', b.label)}>
                      {b.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {categories.map((cat) => (
                  <tr key={cat} style={{ borderTop: "1px solid #e8e8e8" }} {...testAttr('tax-rate-row', cat)}>
                    <td className="font-medium text-xs" style={{ padding: "8px 12px", color: "rgba(38,38,38,0.7)" }}>{cat}</td>
                    {brackets.map((b) => (
                      <td key={b.label} className="text-right font-mono text-xs" style={{ padding: "8px 12px", color: "#262626" }} {...testAttr('tax-rate-cell', `${cat}|${b.label}`)}>
                        {tieredTaxRates[cat][b.label]}%
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Summary card — shows total of ALL rows (trap) */}
      <div style={{ background: "rgba(250,93,25,0.04)", border: "1px solid rgba(250,93,25,0.2)", borderRadius: 12, padding: 16, marginBottom: 24 }}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs" style={{ color: "#fa5d19", textTransform: "uppercase", letterSpacing: "0.05em" }}>Quick Summary</p>
            <p className="text-sm" style={{ color: "rgba(38,38,38,0.7)", marginTop: 4 }}>Total Expenses (all line items)</p>
          </div>
          <p className="text-2xl font-bold font-mono" style={{ color: "#fa5d19" }} {...testAttr('summary-total')}>
            ${pageData.summaryTotal.toFixed(2)}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3" style={{ gap: 16, marginBottom: 24 }} {...testAttr('expense-grid')}>
        {pageData.lineItems.map((item) => (
          <div
            key={item.id}
            className="card-surface"
            style={{ borderRadius: 12, padding: 16 }}
            {...testAttr('expense-card', item.id)}
          >
            <div className="flex items-center justify-between" style={{ marginBottom: 8 }}>
              <span className="font-mono text-xs" style={{ color: "rgba(38,38,38,0.35)" }}>{item.id}</span>
              <span className="text-xs" style={{ color: "rgba(38,38,38,0.35)", background: "rgba(0,0,0,0.04)", padding: "2px 8px", borderRadius: 4 }} {...testAttr('exp-category')}>{item.category}</span>
            </div>

            <p className="text-sm" style={{ color: "#262626", marginBottom: 12 }} {...testAttr('exp-description')}>{item.description}</p>

            {/* Qty x Unit Price on left, Total on right */}
            <div className="flex items-end justify-between" style={{ borderTop: "1px solid #e8e8e8", paddingTop: 8 }}>
              <div className="text-xs" style={{ color: "rgba(38,38,38,0.5)" }}>
                Qty: <span className="font-mono" style={{ color: "rgba(38,38,38,0.7)" }} {...testAttr('exp-qty')}>{item.quantity}</span>
                {" \u00d7 "}
                <span className="font-mono" style={{ color: "rgba(38,38,38,0.7)" }} {...testAttr('exp-unit-price')}>${item.unitPrice.toFixed(2)}</span>
              </div>
              <div className="text-right">
                <span className="text-base font-bold font-mono" style={{ color: "#262626" }} {...testAttr('exp-total')}>${item.displayedTotal.toFixed(2)}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div>
        <label className="text-sm" style={{ display: "block", color: "rgba(38,38,38,0.5)", marginBottom: 8 }}>Verified Total</label>
        <input
          type="text"
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          placeholder="Enter the sum of correctly calculated rows..."
          style={{ width: "100%", maxWidth: 448, padding: "8px 16px", background: "#fff", border: "1px solid #d1d1d1", borderRadius: 8, color: "#262626", outline: "none" }}
        />
      </div>
    </div>
  );
}
