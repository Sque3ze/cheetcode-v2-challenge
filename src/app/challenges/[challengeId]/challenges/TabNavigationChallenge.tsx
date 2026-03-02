"use client";

import { useState, useEffect, MutableRefObject } from "react";
import { testAttr } from "../../../../lib/test-attrs";
import { useInteract } from "../../../../lib/use-interact";

interface TabData {
  label: string;
  content: Array<{ key: string; value: string }>;
}

interface TabNavigationPageData {
  tabs: TabData[];
  conditionTab: string;
  conditionKey: string;
  conditionThreshold: number;
  secondConditionTab?: string;
  secondConditionKey?: string;
  secondConditionThreshold?: number;
  ifAboveTab?: string;
  ifAboveKey?: string;
  ifBelowTab?: string;
  ifBelowKey?: string;
  ifAboveAboveTab?: string;
  ifAboveAboveKey?: string;
  ifAboveBelowTab?: string;
  ifAboveBelowKey?: string;
}

interface Props {
  pageData: TabNavigationPageData;
  answerRef: MutableRefObject<string>;
  sessionId: string;
  challengeId: string;
  renderToken: string;
}

export default function TabNavigationChallenge({ pageData, answerRef, sessionId, challengeId, renderToken }: Props) {
  const [activeTab, setActiveTab] = useState(0);
  const [answer, setAnswer] = useState("");
  const [tabs, setTabs] = useState<TabData[]>(pageData.tabs);
  const [loadingTab, setLoadingTab] = useState(false);
  const interact = useInteract(challengeId, sessionId, renderToken);

  useEffect(() => {
    answerRef.current = answer;
  }, [answer, answerRef]);

  const handleTabClick = async (index: number) => {
    setActiveTab(index);
    // If tab content is empty, fetch it via interact
    if (tabs[index].content.length === 0) {
      setLoadingTab(true);
      try {
        const result = await interact("tab", { index }) as { content: Array<{ key: string; value: string }> };
        if (result?.content) {
          setTabs(prev => {
            const updated = [...prev];
            updated[index] = { ...updated[index], content: result.content };
            return updated;
          });
        }
      } catch (err) {
        console.error("Failed to load tab content:", err);
      } finally {
        setLoadingTab(false);
      }
    }
  };

  return (
    <div>
      {/* Tab bar */}
      <div className="flex border-b border-gray-800 mb-0">
        {tabs.map((tab, i) => (
          <button
            key={i}
            onClick={() => handleTabClick(i)}
            className={`px-6 py-3 text-sm font-medium transition-colors ${
              activeTab === i
                ? "text-white border-b-2 border-blue-500 bg-gray-900"
                : "text-gray-400 hover:text-gray-200"
            }`}
            {...testAttr('tab', tab.label)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="bg-gray-900 rounded-b-lg border border-t-0 border-gray-800 p-6">
        {loadingTab ? (
          <div className="flex items-center justify-center py-4">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-400" />
            <span className="ml-3 text-sm text-gray-400">Loading...</span>
          </div>
        ) : (
          <dl className="space-y-4">
            {tabs[activeTab].content.map((item, i) => (
              <div key={i} className="flex justify-between items-center py-2 border-b border-gray-800 last:border-0">
                <dt className="text-gray-400" {...testAttr('key', item.key)}>{item.key}</dt>
                <dd className="text-gray-100 font-mono" {...testAttr('value', item.key)}>{item.value}</dd>
              </div>
            ))}
          </dl>
        )}
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
