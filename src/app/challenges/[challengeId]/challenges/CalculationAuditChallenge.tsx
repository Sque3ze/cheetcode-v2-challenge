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

  return (
    <div>
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

      {/* Expense report table */}
      <div className="overflow-x-auto rounded-lg border border-gray-800 mb-6">
        <table className="w-full text-sm" {...testAttr('table', 'expenses')}>
          <thead>
            <tr className="bg-gray-900">
              <th className="px-3 py-2 text-left text-gray-400 font-medium">ID</th>
              <th className="px-3 py-2 text-left text-gray-400 font-medium">Description</th>
              <th className="px-3 py-2 text-left text-gray-400 font-medium">Category</th>
              <th className="px-3 py-2 text-right text-gray-400 font-medium">Qty</th>
              <th className="px-3 py-2 text-right text-gray-400 font-medium">Unit Price</th>
              <th className="px-3 py-2 text-right text-gray-400 font-medium">Total</th>
            </tr>
          </thead>
          <tbody>
            {pageData.lineItems.map((item) => (
              <tr key={item.id} className="border-t border-gray-800" {...testAttr('row-id', item.id)}>
                <td className="px-3 py-2 font-mono text-xs">{item.id}</td>
                <td className="px-3 py-2" {...testAttr('description')}>{item.description}</td>
                <td className="px-3 py-2 text-gray-400" {...testAttr('category')}>{item.category}</td>
                <td className="px-3 py-2 text-right" {...testAttr('quantity')}>{item.quantity}</td>
                <td className="px-3 py-2 text-right font-mono" {...testAttr('unit-price')}>${item.unitPrice.toFixed(2)}</td>
                <td className="px-3 py-2 text-right font-mono" {...testAttr('displayed-total')}>${item.displayedTotal.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
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
