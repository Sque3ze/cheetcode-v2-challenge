"use client";

import { useState, useEffect, MutableRefObject } from "react";

interface MetricRow {
  label: string;
  q1: number;
  q2: number;
  q3: number;
  q4: number;
}

interface RedHerringPageData {
  summaryMetrics: MetricRow[];
  rawMetrics: MetricRow[];
  fakeResult: number;
  fakeLabel: string;
  targetMetric: string;
  targetQuarters: string[];
  operation: "sum" | "difference";
}

interface Props {
  pageData: RedHerringPageData;
  answerRef: MutableRefObject<string>;
}

export default function RedHerringChallenge({ pageData, answerRef }: Props) {
  const [answer, setAnswer] = useState("");
  const [showRawData, setShowRawData] = useState(false);

  useEffect(() => {
    answerRef.current = answer;
  }, [answer, answerRef]);

  return (
    <div>
      {/* Prominent fake result card — the red herring */}
      <div className="bg-gradient-to-r from-green-900/40 to-emerald-900/40 rounded-xl border-2 border-green-500/50 p-6 mb-6 text-center">
        <p className="text-sm text-green-400 mb-1">Pre-computed Result</p>
        <p className="text-4xl font-bold font-mono text-green-300" data-fake-result>
          {pageData.fakeResult.toLocaleString()}
        </p>
        <p className="text-sm text-green-400/70 mt-2">{pageData.fakeLabel}</p>
      </div>

      {/* Summary Report table — prominent, but has subtly wrong values */}
      <div className="mb-6">
        <h3 className="text-base font-semibold text-gray-200 mb-2">Summary Report</h3>
        <div className="overflow-x-auto rounded-lg border border-gray-700">
          <table className="w-full text-sm" data-table="summary">
            <thead>
              <tr className="bg-gray-900">
                <th className="px-4 py-3 text-left text-gray-400 font-medium">Metric</th>
                <th className="px-4 py-3 text-right text-gray-400 font-medium">Q1</th>
                <th className="px-4 py-3 text-right text-gray-400 font-medium">Q2</th>
                <th className="px-4 py-3 text-right text-gray-400 font-medium">Q3</th>
                <th className="px-4 py-3 text-right text-gray-400 font-medium">Q4</th>
              </tr>
            </thead>
            <tbody>
              {pageData.summaryMetrics.map((row) => (
                <tr key={row.label} className="border-t border-gray-800" data-summary-metric={row.label}>
                  <td className="px-4 py-3 font-medium">{row.label}</td>
                  <td className="px-4 py-3 text-right font-mono">{row.q1.toLocaleString()}</td>
                  <td className="px-4 py-3 text-right font-mono">{row.q2.toLocaleString()}</td>
                  <td className="px-4 py-3 text-right font-mono">{row.q3.toLocaleString()}</td>
                  <td className="px-4 py-3 text-right font-mono">{row.q4.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Raw Data toggle — hidden by default, has correct values */}
      <div className="mb-6">
        <button
          onClick={() => setShowRawData(!showRawData)}
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-300 transition-colors"
          data-toggle-raw
        >
          <span className="text-xs">{showRawData ? "▼" : "▶"}</span>
          View Raw Data
        </button>

        {showRawData && (
          <div className="mt-2 overflow-x-auto rounded-lg border border-gray-800">
            <table className="w-full text-sm" data-table="raw">
              <thead>
                <tr className="bg-gray-900/50">
                  <th className="px-4 py-3 text-left text-gray-500 font-medium text-xs">Metric</th>
                  <th className="px-4 py-3 text-right text-gray-500 font-medium text-xs">Q1</th>
                  <th className="px-4 py-3 text-right text-gray-500 font-medium text-xs">Q2</th>
                  <th className="px-4 py-3 text-right text-gray-500 font-medium text-xs">Q3</th>
                  <th className="px-4 py-3 text-right text-gray-500 font-medium text-xs">Q4</th>
                </tr>
              </thead>
              <tbody>
                {pageData.rawMetrics.map((row) => (
                  <tr key={row.label} className="border-t border-gray-800/50" data-metric={row.label}>
                    <td className="px-4 py-3 text-gray-400 text-xs">{row.label}</td>
                    <td className="px-4 py-3 text-right font-mono text-xs text-gray-400" data-q="Q1">{row.q1.toLocaleString()}</td>
                    <td className="px-4 py-3 text-right font-mono text-xs text-gray-400" data-q="Q2">{row.q2.toLocaleString()}</td>
                    <td className="px-4 py-3 text-right font-mono text-xs text-gray-400" data-q="Q3">{row.q3.toLocaleString()}</td>
                    <td className="px-4 py-3 text-right font-mono text-xs text-gray-400" data-q="Q4">{row.q4.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Small print disclaimer */}
      <p className="text-xs text-gray-600 mb-6">
        Note: Summary reports may contain rounding adjustments. Always verify against raw data for accuracy.
      </p>

      {/* Answer input */}
      <div>
        <label className="block text-sm text-gray-400 mb-2">Your Answer</label>
        <input
          type="text"
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          placeholder="Enter the value..."
          className="w-full max-w-md px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-gray-100 placeholder-gray-500 focus:outline-none focus:border-blue-500"
        />
      </div>
    </div>
  );
}
