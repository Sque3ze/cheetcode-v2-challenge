"use client";

import { useState, useEffect, MutableRefObject } from "react";
import { testAttr } from "../../../../lib/test-attrs";

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
  const [activeTab, setActiveTab] = useState<"summary" | "raw">("summary");

  useEffect(() => {
    answerRef.current = answer;
  }, [answer, answerRef]);

  return (
    <div>
      {/* Prominent fake result card — the red herring */}
      <div className="bg-gradient-to-r from-green-900/40 to-emerald-900/40 rounded-xl border-2 border-green-500/50 p-6 mb-6 text-center">
        <p className="text-sm text-green-400 mb-1">Pre-computed Result</p>
        <p className="text-4xl font-bold font-mono text-green-300" {...testAttr('fake-result')}>
          {pageData.fakeResult.toLocaleString()}
        </p>
        <p className="text-sm text-green-400/70 mt-2">{pageData.fakeLabel}</p>
      </div>

      {/* Tab bar: Summary Report | Raw Data Source */}
      <div className="flex border-b border-gray-800 mb-0">
        <button
          onClick={() => setActiveTab("summary")}
          className={`px-6 py-3 text-sm font-medium transition-colors ${
            activeTab === "summary"
              ? "text-white border-b-2 border-blue-500 bg-gray-900"
              : "text-gray-400 hover:text-gray-200"
          }`}
          {...testAttr('report-tab', 'summary')}
        >
          Summary Report
        </button>
        <button
          onClick={() => setActiveTab("raw")}
          className={`px-6 py-3 text-sm font-medium transition-colors ${
            activeTab === "raw"
              ? "text-white border-b-2 border-blue-500 bg-gray-900"
              : "text-gray-400 hover:text-gray-200"
          }`}
          {...testAttr('report-tab', 'raw')}
        >
          Raw Data Source
        </button>
      </div>

      {/* Summary Report tab — has subtly wrong values */}
      {activeTab === "summary" && (
        <div className="bg-gray-900 rounded-b-lg border border-t-0 border-gray-800 p-4 mb-6">
          <div className="overflow-x-auto">
            <table className="w-full text-sm" {...testAttr('table', 'summary')}>
              <thead>
                <tr>
                  <th className="px-4 py-3 text-left text-gray-400 font-medium">Metric</th>
                  <th className="px-4 py-3 text-right text-gray-400 font-medium">Q1</th>
                  <th className="px-4 py-3 text-right text-gray-400 font-medium">Q2</th>
                  <th className="px-4 py-3 text-right text-gray-400 font-medium">Q3</th>
                  <th className="px-4 py-3 text-right text-gray-400 font-medium">Q4</th>
                </tr>
              </thead>
              <tbody>
                {pageData.summaryMetrics.map((row) => (
                  <tr key={row.label} className="border-t border-gray-800" {...testAttr('summary-metric', row.label)}>
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
      )}

      {/* Raw Data Source tab — metric cards with correct values */}
      {activeTab === "raw" && (
        <div className="bg-gray-900 rounded-b-lg border border-t-0 border-gray-800 p-4 mb-6">
          <div className="space-y-4" {...testAttr('raw-data-panel')}>
            {pageData.rawMetrics.map((row) => (
              <div
                key={row.label}
                className="bg-gray-800/50 rounded-lg p-4"
                {...testAttr('metric-card', row.label)}
              >
                <h4 className="text-sm font-medium text-gray-200 mb-3">{row.label}</h4>
                <div className="grid grid-cols-4 gap-3">
                  <div className="text-center">
                    <p className="text-xs text-gray-500 mb-1">Q1</p>
                    <p className="font-mono text-sm text-gray-300" {...testAttr('metric-q', 'Q1')}>{row.q1.toLocaleString()}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-gray-500 mb-1">Q2</p>
                    <p className="font-mono text-sm text-gray-300" {...testAttr('metric-q', 'Q2')}>{row.q2.toLocaleString()}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-gray-500 mb-1">Q3</p>
                    <p className="font-mono text-sm text-gray-300" {...testAttr('metric-q', 'Q3')}>{row.q3.toLocaleString()}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-gray-500 mb-1">Q4</p>
                    <p className="font-mono text-sm text-gray-300" {...testAttr('metric-q', 'Q4')}>{row.q4.toLocaleString()}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Small print disclaimer */}
      <p className="text-xs text-gray-600 mb-6">
        Data last refreshed: 2024-12-15T08:30:00Z. Source accuracy may vary.
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
