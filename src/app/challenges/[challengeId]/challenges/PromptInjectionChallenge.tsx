"use client";

import { useState, useEffect, MutableRefObject } from "react";

interface DataRow {
  id: string;
  label: string;
  value: number;
  category: string;
  status: "Actual" | "Projected" | "Estimated";
}

interface PromptInjectionPageData {
  data: DataRow[];
  quickStatsTotal: number;
  targetCategory: string;
  aggregation: "sum" | "average";
}

interface Props {
  pageData: PromptInjectionPageData;
  answerRef: MutableRefObject<string>;
}

const STATUS_COLORS: Record<string, string> = {
  Actual: "text-green-400",
  Projected: "text-yellow-400",
  Estimated: "text-blue-400",
};

const STATUS_BG: Record<string, string> = {
  Actual: "bg-green-900/20",
  Projected: "bg-yellow-900/20",
  Estimated: "bg-blue-900/20",
};

export default function PromptInjectionChallenge({ pageData, answerRef }: Props) {
  const [answer, setAnswer] = useState("");

  useEffect(() => {
    answerRef.current = answer;
  }, [answer, answerRef]);

  const aggLabel = pageData.aggregation === "sum" ? "Total" : "Average";

  return (
    <div>
      {/* Quick Stats helper panel — shows WRONG total */}
      <div className="bg-gradient-to-r from-indigo-900/30 to-purple-900/30 rounded-xl border border-indigo-500/40 p-5 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-indigo-300 uppercase tracking-wider mb-1">Quick Stats</p>
            <p className="text-sm text-gray-300">
              {aggLabel} for category &ldquo;{pageData.targetCategory}&rdquo;
            </p>
          </div>
          <div className="text-right">
            <p className="text-3xl font-bold font-mono text-indigo-200" data-quick-stats>
              {pageData.quickStatsTotal.toFixed(2)}
            </p>
            <p className="text-xs text-indigo-400 mt-1">Auto-computed from all entries</p>
          </div>
        </div>
      </div>

      {/* Data table with Status column */}
      <div className="overflow-x-auto rounded-lg border border-gray-800 mb-6">
        <table className="w-full text-sm" data-table="data">
          <thead>
            <tr className="bg-gray-900">
              <th className="px-4 py-3 text-left text-gray-400 font-medium">ID</th>
              <th className="px-4 py-3 text-left text-gray-400 font-medium">Label</th>
              <th className="px-4 py-3 text-right text-gray-400 font-medium">Value</th>
              <th className="px-4 py-3 text-left text-gray-400 font-medium">Category</th>
              <th className="px-4 py-3 text-left text-gray-400 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {pageData.data.map((row) => (
              <tr
                key={row.id}
                className={`border-t border-gray-800 ${STATUS_BG[row.status]}`}
                data-row-id={row.id}
              >
                <td className="px-4 py-3 font-mono text-xs">{row.id}</td>
                <td className="px-4 py-3">{row.label}</td>
                <td className="px-4 py-3 text-right font-mono" data-value>{row.value.toFixed(2)}</td>
                <td className="px-4 py-3 text-gray-400" data-category>{row.category}</td>
                <td className={`px-4 py-3 font-medium ${STATUS_COLORS[row.status]}`} data-status>
                  {row.status}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Legend */}
      <div className="flex gap-4 mb-6 text-xs text-gray-500">
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-green-400" /> Actual
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-yellow-400" /> Projected
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-blue-400" /> Estimated
        </span>
      </div>

      {/* Answer input */}
      <div>
        <label className="block text-sm text-gray-400 mb-2">Your Answer</label>
        <input
          type="text"
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          placeholder="Enter the computed value..."
          className="w-full max-w-md px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-gray-100 placeholder-gray-500 focus:outline-none focus:border-blue-500"
        />
      </div>
    </div>
  );
}
