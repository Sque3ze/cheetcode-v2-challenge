"use client";

import { useState, useEffect, MutableRefObject } from "react";
import { testAttr } from "../../../../lib/test-attrs";
import { useInteract } from "../../../../lib/use-interact";

interface MetricRow {
  label: string;
  q1: number;
  q2: number;
  q3: number;
  q4: number;
  annual: number;
}

interface RedHerringPageData {
  dataA: MetricRow[];
  dataB?: MetricRow[];
  fakeResult: number;
  fakeLabel: string;
  targetMetric: string;
  targetQuarters: string[];
  operation: "sum" | "difference";
}

interface Props {
  pageData: RedHerringPageData;
  answerRef: MutableRefObject<string>;
  sessionId: string;
  challengeId: string;
  renderToken: string;
}

export default function RedHerringChallenge({ pageData, answerRef, sessionId, challengeId, renderToken }: Props) {
  const [answer, setAnswer] = useState("");
  const [activeTab, setActiveTab] = useState<"a" | "b">("a");
  const [dataB, setDataB] = useState<MetricRow[]>(pageData.dataB ?? []);
  const [loadingB, setLoadingB] = useState(false);
  const interact = useInteract(challengeId, sessionId, renderToken);

  useEffect(() => {
    answerRef.current = answer;
  }, [answer, answerRef]);

  const handleTabB = async () => {
    setActiveTab("b");
    if (dataB.length === 0) {
      setLoadingB(true);
      try {
        const result = await interact("tab", { tab: "b" }) as { dataB: MetricRow[] };
        if (result?.dataB) setDataB(result.dataB);
      } catch (err) {
        console.error("Failed to load Report B:", err);
      } finally {
        setLoadingB(false);
      }
    }
  };

  const currentData = activeTab === "a" ? pageData.dataA : dataB;

  return (
    <div>
      {/* Fake result card */}
      <div className="bg-gradient-to-r from-green-900/40 to-emerald-900/40 rounded-xl border-2 border-green-500/50 p-6 mb-6 text-center">
        <p className="text-sm text-green-400 mb-1">Pre-computed Result</p>
        <p className="text-4xl font-bold font-mono text-green-300" {...testAttr('fake-result')}>
          {pageData.fakeResult.toLocaleString()}
        </p>
        <p className="text-sm text-green-400/70 mt-2">{pageData.fakeLabel}</p>
      </div>

      {/* Tab bar */}
      <div className="flex border-b border-gray-800 mb-0">
        <button
          onClick={() => setActiveTab("a")}
          className={`px-6 py-3 text-sm font-medium transition-colors ${
            activeTab === "a"
              ? "text-white border-b-2 border-blue-500 bg-gray-900"
              : "text-gray-400 hover:text-gray-200"
          }`}
          {...testAttr('report-tab', 'a')}
        >
          Report A
        </button>
        <button
          onClick={handleTabB}
          className={`px-6 py-3 text-sm font-medium transition-colors ${
            activeTab === "b"
              ? "text-white border-b-2 border-blue-500 bg-gray-900"
              : "text-gray-400 hover:text-gray-200"
          }`}
          {...testAttr('report-tab', 'b')}
        >
          Report B
        </button>
      </div>

      {/* Table */}
      <div className="bg-gray-900 rounded-b-lg border border-t-0 border-gray-800 p-4 mb-6">
        {loadingB && activeTab === "b" ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-400" />
            <span className="ml-3 text-sm text-gray-400">Loading Report B...</span>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm" {...testAttr('table', activeTab)}>
              <thead>
                <tr>
                  <th className="px-4 py-3 text-left text-gray-400 font-medium">Metric</th>
                  <th className="px-4 py-3 text-right text-gray-400 font-medium">Q1</th>
                  <th className="px-4 py-3 text-right text-gray-400 font-medium">Q2</th>
                  <th className="px-4 py-3 text-right text-gray-400 font-medium">Q3</th>
                  <th className="px-4 py-3 text-right text-gray-400 font-medium">Q4</th>
                  <th className="px-4 py-3 text-right text-gray-400 font-medium">Annual</th>
                </tr>
              </thead>
              <tbody>
                {currentData.map((row) => (
                  <tr key={row.label} className="border-t border-gray-800" {...testAttr('metric-row', row.label)}>
                    <td className="px-4 py-3 font-medium">{row.label}</td>
                    <td className="px-4 py-3 text-right font-mono" {...testAttr('metric-q', 'Q1')}>{row.q1.toLocaleString()}</td>
                    <td className="px-4 py-3 text-right font-mono" {...testAttr('metric-q', 'Q2')}>{row.q2.toLocaleString()}</td>
                    <td className="px-4 py-3 text-right font-mono" {...testAttr('metric-q', 'Q3')}>{row.q3.toLocaleString()}</td>
                    <td className="px-4 py-3 text-right font-mono" {...testAttr('metric-q', 'Q4')}>{row.q4.toLocaleString()}</td>
                    <td className="px-4 py-3 text-right font-mono" {...testAttr('metric-annual')}>{row.annual.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

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
