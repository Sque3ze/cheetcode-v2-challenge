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
      <div className="flex" style={{ borderBottom: "1px solid #e8e8e8" }}>
        {tabs.map((tab, i) => (
          <button
            key={i}
            onClick={() => handleTabClick(i)}
            className="text-sm font-medium"
            style={{
              padding: "12px 24px",
              background: "none",
              border: "none",
              cursor: "pointer",
              ...(activeTab === i
                ? { color: "#fa5d19", borderBottom: "2px solid #fa5d19" }
                : { color: "rgba(38,38,38,0.5)" }),
            }}
            {...testAttr('tab', tab.label)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div style={{ background: "#fff", border: "1px solid #e8e8e8", borderTop: "none", borderRadius: "0 0 12px 12px", padding: 24 }}>
        {loadingTab ? (
          <div className="flex items-center justify-center" style={{ padding: "16px 0" }}>
            <div className="animate-spin" style={{ width: 24, height: 24, borderRadius: "50%", borderBottom: "2px solid #fa5d19" }} />
            <span className="text-sm" style={{ marginLeft: 12, color: "rgba(38,38,38,0.5)" }}>Loading...</span>
          </div>
        ) : (
          <dl style={{ display: "flex", flexDirection: "column", gap: 0 }}>
            {tabs[activeTab].content.map((item, i) => (
              <div
                key={i}
                className="flex justify-between items-center"
                style={{
                  padding: "8px 0",
                  borderBottom: i < tabs[activeTab].content.length - 1 ? "1px solid #e8e8e8" : "none",
                }}
              >
                <dt style={{ color: "rgba(38,38,38,0.5)" }} {...testAttr('key', item.key)}>{item.key}</dt>
                <dd className="font-mono" style={{ color: "#262626" }} {...testAttr('value', item.key)}>{item.value}</dd>
              </div>
            ))}
          </dl>
        )}
      </div>

      {/* Answer input */}
      <div style={{ marginTop: 24 }}>
        <label className="text-sm" style={{ display: "block", color: "rgba(38,38,38,0.5)", marginBottom: 8 }}>Your Answer</label>
        <input
          type="text"
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          placeholder="Enter the value..."
          style={{ width: "100%", maxWidth: 448, padding: "8px 16px", background: "#fff", border: "1px solid #d1d1d1", borderRadius: 8, color: "#262626", outline: "none" }}
        />
      </div>
    </div>
  );
}
