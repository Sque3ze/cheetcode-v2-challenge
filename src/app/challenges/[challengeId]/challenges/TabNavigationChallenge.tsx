"use client";

import { useState, useEffect, MutableRefObject } from "react";

interface TabData {
  label: string;
  content: Array<{ key: string; value: string }>;
}

interface TabNavigationPageData {
  tabs: TabData[];
  conditionTab: string;
  conditionKey: string;
  conditionThreshold: number;
  ifAboveTab: string;
  ifAboveKey: string;
  ifBelowTab: string;
  ifBelowKey: string;
}

interface Props {
  pageData: TabNavigationPageData;
  answerRef: MutableRefObject<string>;
}

export default function TabNavigationChallenge({ pageData, answerRef }: Props) {
  const [activeTab, setActiveTab] = useState(0);
  const [answer, setAnswer] = useState("");

  useEffect(() => {
    answerRef.current = answer;
  }, [answer, answerRef]);

  return (
    <div>
      {/* Tab bar */}
      <div className="flex border-b border-gray-800 mb-0">
        {pageData.tabs.map((tab, i) => (
          <button
            key={i}
            onClick={() => setActiveTab(i)}
            className={`px-6 py-3 text-sm font-medium transition-colors ${
              activeTab === i
                ? "text-white border-b-2 border-blue-500 bg-gray-900"
                : "text-gray-400 hover:text-gray-200"
            }`}
            data-tab={tab.label}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="bg-gray-900 rounded-b-lg border border-t-0 border-gray-800 p-6">
        <dl className="space-y-4">
          {pageData.tabs[activeTab].content.map((item, i) => (
            <div key={i} className="flex justify-between items-center py-2 border-b border-gray-800 last:border-0">
              <dt className="text-gray-400" data-key={item.key}>{item.key}</dt>
              <dd className="text-gray-100 font-mono" data-value={item.key}>{item.value}</dd>
            </div>
          ))}
        </dl>
      </div>

      {/* Answer input */}
      <div className="mt-6">
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
