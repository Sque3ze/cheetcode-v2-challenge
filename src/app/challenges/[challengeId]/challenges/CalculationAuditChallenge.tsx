"use client";

import { useState, useEffect, MutableRefObject } from "react";
import { testAttr } from "../../../../lib/test-attrs";

interface LineItem {
  id: string;
  description: string;
  category: string;
  quantity: number;
  unitPrice: number;
  displayedTotal: number;
}

interface CalculationAuditPageData {
  lineItems: LineItem[];
  taxRates: Record<string, number>;
  summaryTotal: number;
  variantIndex: number;
}

interface Props {
  pageData: CalculationAuditPageData;
  answerRef: MutableRefObject<string>;
}

export default function CalculationAuditChallenge({ pageData, answerRef }: Props) {
  const [answer, setAnswer] = useState("");

  useEffect(() => {
    answerRef.current = answer;
  }, [answer, answerRef]);

  const taxEntries = Object.entries(pageData.taxRates || {});

  return (
    <div>
      {/* Tax Rate Schedule */}
      {taxEntries.length > 0 && (
        <div className="bg-gray-900 rounded-lg border border-gray-800 p-4 mb-6" {...testAttr('tax-rate-legend')}>
          <h3 className="text-sm font-medium text-amber-400 mb-3">Tax Rate Schedule</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
            {taxEntries.map(([category, rate]) => (
              <div key={category} className="flex justify-between text-sm" {...testAttr('tax-rate', category)}>
                <span className="text-gray-400">{category}</span>
                <span className="font-mono text-gray-200" {...testAttr('tax-rate-value')}>{rate}%</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Summary card — shows total of ALL rows (trap) */}
      <div className="bg-gradient-to-r from-blue-900/30 to-indigo-900/30 rounded-xl border border-blue-500/30 p-4 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-blue-400 uppercase tracking-wider">Quick Summary</p>
            <p className="text-sm text-gray-300 mt-1">Total Expenses (all line items)</p>
          </div>
          <p className="text-2xl font-bold font-mono text-blue-300" {...testAttr('summary-total')}>
            ${pageData.summaryTotal.toFixed(2)}
          </p>
        </div>
      </div>

      {/* Expense receipt cards grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6" {...testAttr('expense-grid')}>
        {pageData.lineItems.map((item) => (
          <div
            key={item.id}
            className="bg-gray-900 rounded-lg border border-gray-800 p-4"
            {...testAttr('expense-card', item.id)}
          >
            {/* Header: ID + Category */}
            <div className="flex items-center justify-between mb-2">
              <span className="font-mono text-xs text-gray-500">{item.id}</span>
              <span className="text-xs text-gray-500 bg-gray-800 px-2 py-0.5 rounded" {...testAttr('exp-category')}>{item.category}</span>
            </div>

            {/* Description */}
            <p className="text-sm text-gray-200 mb-3" {...testAttr('exp-description')}>{item.description}</p>

            {/* Qty x Unit Price on left, Total on right */}
            <div className="flex items-end justify-between border-t border-gray-800 pt-2">
              <div className="text-xs text-gray-400">
                Qty: <span className="font-mono text-gray-300" {...testAttr('exp-qty')}>{item.quantity}</span>
                {" \u00d7 "}
                <span className="font-mono text-gray-300" {...testAttr('exp-unit-price')}>${item.unitPrice.toFixed(2)}</span>
              </div>
              <div className="text-right">
                <span className="text-base font-bold font-mono text-gray-100" {...testAttr('exp-total')}>${item.displayedTotal.toFixed(2)}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Answer input */}
      <div>
        <label className="block text-sm text-gray-400 mb-2">Verified Total</label>
        <input
          type="text"
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          placeholder="Enter the sum of correctly calculated rows..."
          className="w-full max-w-md px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-gray-100 placeholder-gray-500 focus:outline-none focus:border-blue-500"
        />
      </div>
    </div>
  );
}
