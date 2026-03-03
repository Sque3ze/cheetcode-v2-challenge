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
      <div style={{ background: "rgba(26,147,56,0.04)", border: "2px solid rgba(26,147,56,0.3)", borderRadius: 12, padding: 24, marginBottom: 24, textAlign: "center" }}>
        <p className="text-sm" style={{ color: "#1a9338", marginBottom: 4 }}>Pre-computed Result</p>
        <p className="text-4xl font-bold font-mono" style={{ color: "#1a9338" }} {...testAttr('fake-result')}>
          {pageData.fakeResult.toLocaleString()}
        </p>
        <p className="text-sm" style={{ color: "rgba(26,147,56,0.7)", marginTop: 8 }}>{pageData.fakeLabel}</p>
      </div>

      {/* Tab bar */}
      <div className="flex" style={{ borderBottom: "1px solid #e8e8e8" }}>
        <button
          onClick={() => setActiveTab("a")}
          className="text-sm font-medium"
          style={{
            padding: "12px 24px",
            background: "none",
            border: "none",
            cursor: "pointer",
            ...(activeTab === "a"
              ? { color: "#fa5d19", borderBottom: "2px solid #fa5d19" }
              : { color: "rgba(38,38,38,0.5)" }),
          }}
          {...testAttr('report-tab', 'a')}
        >
          Report A
        </button>
        <button
          onClick={handleTabB}
          className="text-sm font-medium"
          style={{
            padding: "12px 24px",
            background: "none",
            border: "none",
            cursor: "pointer",
            ...(activeTab === "b"
              ? { color: "#fa5d19", borderBottom: "2px solid #fa5d19" }
              : { color: "rgba(38,38,38,0.5)" }),
          }}
          {...testAttr('report-tab', 'b')}
        >
          Report B
        </button>
      </div>

      {/* Table */}
      <div style={{ background: "#fff", border: "1px solid #e8e8e8", borderTop: "none", borderRadius: "0 0 12px 12px", padding: 16, marginBottom: 24 }}>
        {loadingB && activeTab === "b" ? (
          <div className="flex items-center justify-center" style={{ padding: "32px 0" }}>
            <div className="animate-spin" style={{ width: 24, height: 24, borderRadius: "50%", borderBottom: "2px solid #fa5d19" }} />
            <span className="text-sm" style={{ marginLeft: 12, color: "rgba(38,38,38,0.5)" }}>Loading Report B...</span>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm" {...testAttr('table', activeTab)}>
              <thead>
                <tr>
                  <th className="text-left font-medium" style={{ padding: "12px 16px", color: "rgba(38,38,38,0.5)" }}>Metric</th>
                  <th className="text-right font-medium" style={{ padding: "12px 16px", color: "rgba(38,38,38,0.5)" }}>Q1</th>
                  <th className="text-right font-medium" style={{ padding: "12px 16px", color: "rgba(38,38,38,0.5)" }}>Q2</th>
                  <th className="text-right font-medium" style={{ padding: "12px 16px", color: "rgba(38,38,38,0.5)" }}>Q3</th>
                  <th className="text-right font-medium" style={{ padding: "12px 16px", color: "rgba(38,38,38,0.5)" }}>Q4</th>
                  <th className="text-right font-medium" style={{ padding: "12px 16px", color: "rgba(38,38,38,0.5)" }}>Annual</th>
                </tr>
              </thead>
              <tbody>
                {currentData.map((row) => (
                  <tr key={row.label} style={{ borderTop: "1px solid #e8e8e8" }} {...testAttr('metric-row', row.label)}>
                    <td className="font-medium" style={{ padding: "12px 16px" }}>{row.label}</td>
                    <td className="text-right font-mono" style={{ padding: "12px 16px" }} {...testAttr('metric-q', 'Q1')}>{row.q1.toLocaleString()}</td>
                    <td className="text-right font-mono" style={{ padding: "12px 16px" }} {...testAttr('metric-q', 'Q2')}>{row.q2.toLocaleString()}</td>
                    <td className="text-right font-mono" style={{ padding: "12px 16px" }} {...testAttr('metric-q', 'Q3')}>{row.q3.toLocaleString()}</td>
                    <td className="text-right font-mono" style={{ padding: "12px 16px" }} {...testAttr('metric-q', 'Q4')}>{row.q4.toLocaleString()}</td>
                    <td className="text-right font-mono" style={{ padding: "12px 16px" }} {...testAttr('metric-annual')}>{row.annual.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Answer input */}
      <div>
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
