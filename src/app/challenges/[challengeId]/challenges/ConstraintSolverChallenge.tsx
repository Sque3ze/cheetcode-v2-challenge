"use client";

import { useState, useEffect, MutableRefObject } from "react";

interface Item {
  name: string;
  category: string;
  price: number;
  rating: number;
  supplier: string;
  inStock: boolean;
  weight: number;
}

interface Constraint {
  field: string;
  operator: string;
  value: string | number | boolean | string[];
  label: string;
}

interface ConstraintSolverPageData {
  items: Item[];
  requirements: Constraint[];
  budgetConstraints: Constraint[];
  exclusions: Constraint[];
  advancedConstraints: Constraint[];
  optimization: string;
  optimizationField: "price" | "weight";
}

interface Props {
  pageData: ConstraintSolverPageData;
  answerRef: MutableRefObject<string>;
}

export default function ConstraintSolverChallenge({ pageData, answerRef }: Props) {
  const [answer, setAnswer] = useState("");
  const [showAdvanced, setShowAdvanced] = useState(false);

  useEffect(() => {
    answerRef.current = answer;
  }, [answer, answerRef]);

  return (
    <div>
      {/* Inventory Table */}
      <div className="mb-6">
        <h3 className="text-sm font-medium text-gray-400 mb-2">Inventory</h3>
        <div className="overflow-x-auto rounded-lg border border-gray-800">
          <table className="w-full text-sm" data-table="inventory">
            <thead>
              <tr className="bg-gray-900">
                <th className="px-3 py-2 text-left text-gray-400 font-medium">Name</th>
                <th className="px-3 py-2 text-left text-gray-400 font-medium">Category</th>
                <th className="px-3 py-2 text-right text-gray-400 font-medium">Price</th>
                <th className="px-3 py-2 text-right text-gray-400 font-medium">Rating</th>
                <th className="px-3 py-2 text-left text-gray-400 font-medium">Supplier</th>
                <th className="px-3 py-2 text-center text-gray-400 font-medium">In Stock</th>
                <th className="px-3 py-2 text-right text-gray-400 font-medium">Weight (kg)</th>
              </tr>
            </thead>
            <tbody>
              {pageData.items.map((item) => (
                <tr key={item.name} className="border-t border-gray-800" data-item-name={item.name}>
                  <td className="px-3 py-2 font-medium">{item.name}</td>
                  <td className="px-3 py-2 text-gray-400" data-item-category>{item.category}</td>
                  <td className="px-3 py-2 text-right font-mono" data-item-price>${item.price.toFixed(2)}</td>
                  <td className="px-3 py-2 text-right" data-item-rating>{item.rating}</td>
                  <td className="px-3 py-2 text-gray-400" data-item-supplier>{item.supplier}</td>
                  <td className="px-3 py-2 text-center" data-item-stock>
                    {item.inStock ? (
                      <span className="text-green-400">Yes</span>
                    ) : (
                      <span className="text-red-400">No</span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-right" data-item-weight>{item.weight}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Constraint Panels */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        {/* Requirements */}
        <div className="bg-gray-900 rounded-lg border border-gray-800 p-4">
          <h3 className="text-sm font-medium text-blue-400 mb-3">Requirements</h3>
          <ul className="space-y-2" data-panel="requirements">
            {pageData.requirements.map((c, i) => (
              <li key={i} className="text-sm text-gray-300 flex items-start gap-2" data-constraint={i}>
                <span className="text-blue-400 mt-0.5">&#x2022;</span>
                <span>{c.label}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Budget Constraints */}
        <div className="bg-gray-900 rounded-lg border border-gray-800 p-4">
          <h3 className="text-sm font-medium text-yellow-400 mb-3">Budget &amp; Quality</h3>
          <ul className="space-y-2" data-panel="budget">
            {pageData.budgetConstraints.map((c, i) => (
              <li key={i} className="text-sm text-gray-300 flex items-start gap-2" data-constraint={i}>
                <span className="text-yellow-400 mt-0.5">&#x2022;</span>
                <span>{c.label}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Exclusions */}
        <div className="bg-gray-900 rounded-lg border border-gray-800 p-4">
          <h3 className="text-sm font-medium text-red-400 mb-3">Exclusions</h3>
          <ul className="space-y-2" data-panel="exclusions">
            {pageData.exclusions.map((c, i) => (
              <li key={i} className="text-sm text-gray-300 flex items-start gap-2" data-constraint={i}>
                <span className="text-red-400 mt-0.5">&#x2022;</span>
                <span>{c.label}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Advanced Filters accordion (collapsed by default) */}
      <div className="mb-4">
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-300 transition-colors"
          data-toggle-advanced
        >
          <span className="text-xs">{showAdvanced ? "▼" : "▶"}</span>
          Advanced Filters
        </button>

        {showAdvanced && (
          <div className="mt-2 bg-gray-900 rounded-lg border border-gray-800 p-4" data-panel="advanced">
            <ul className="space-y-2">
              {pageData.advancedConstraints.map((c, i) => (
                <li key={i} className="text-sm text-gray-300 flex items-start gap-2" data-constraint={i}>
                  <span className="text-purple-400 mt-0.5">&#x2022;</span>
                  <span>{c.label}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Optimization note */}
      <div className="bg-gray-900/50 rounded-lg border border-gray-800 p-3 mb-6">
        <p className="text-sm text-gray-400" data-optimization>
          <span className="text-amber-400 font-medium">Optimization:</span> {pageData.optimization}
        </p>
      </div>

      {/* Answer input */}
      <div>
        <label className="block text-sm text-gray-400 mb-2">Item Name</label>
        <input
          type="text"
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          placeholder="Enter the item name..."
          className="w-full max-w-md px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-gray-100 placeholder-gray-500 focus:outline-none focus:border-blue-500"
        />
      </div>
    </div>
  );
}
