"use client";

import { useState, useEffect, MutableRefObject } from "react";
import { testAttr } from "../../../../lib/test-attrs";
import { useInteract } from "../../../../lib/use-interact";

interface SourceInfo {
  id: string;
  name: string;
  description: string;
  isStable: boolean;
}

interface ResilientCollectorPageData {
  sources: SourceInfo[];
  aggregationMethod: "sum" | "average";
}

interface SourceResult {
  status: "ok" | "unavailable";
  value?: number;
  label?: string;
  retryAfterMs?: number;
  message?: string;
}

interface Props {
  pageData: ResilientCollectorPageData;
  answerRef: MutableRefObject<string>;
  sessionId: string;
  challengeId: string;
  renderToken: string;
}

export default function ResilientCollectorChallenge({ pageData, answerRef, sessionId, challengeId, renderToken }: Props) {
  const [answer, setAnswer] = useState("");
  const [sourceResults, setSourceResults] = useState<Record<string, SourceResult>>({});
  const [loadingSource, setLoadingSource] = useState<string | null>(null);
  const [attemptCounts, setAttemptCounts] = useState<Record<string, number>>({});
  const interact = useInteract(challengeId, sessionId, renderToken);

  useEffect(() => {
    answerRef.current = answer;
  }, [answer, answerRef]);

  // Auto-compute answer when all sources are collected
  const collectedCount = Object.values(sourceResults).filter((r) => r.status === "ok").length;
  const allCollected = collectedCount === pageData.sources.length;

  useEffect(() => {
    if (!allCollected) return;
    const values = Object.values(sourceResults)
      .filter((r) => r.status === "ok")
      .map((r) => r.value!);
    const total = values.reduce((s, v) => s + v, 0);
    const result = pageData.aggregationMethod === "sum"
      ? String(total)
      : (total / values.length).toFixed(2);
    setAnswer(result);
  }, [allCollected, sourceResults, pageData.aggregationMethod]);

  const fetchSource = async (sourceId: string) => {
    setLoadingSource(sourceId);
    const attempt = (attemptCounts[sourceId] ?? 0) + 1;
    setAttemptCounts((prev) => ({ ...prev, [sourceId]: attempt }));
    try {
      // _attempt busts the useInteract cache so retries hit the server
      const result = await interact("fetch", { sourceId, _attempt: attempt }) as SourceResult;
      setSourceResults((prev) => ({ ...prev, [sourceId]: result }));
    } catch (err) {
      setSourceResults((prev) => ({
        ...prev,
        [sourceId]: { status: "unavailable", message: "Request failed. Try again." },
      }));
    } finally {
      setLoadingSource(null);
    }
  };

  return (
    <div>
      {/* Status summary */}
      <div style={{ background: "rgba(26,147,56,0.04)", border: "1px solid rgba(26,147,56,0.2)", borderRadius: 12, padding: 16, marginBottom: 24 }}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs" style={{ color: "#1a9338", textTransform: "uppercase", letterSpacing: "0.05em" }}>Collection Progress</p>
            <p className="text-sm" style={{ color: "rgba(38,38,38,0.7)", marginTop: 4 }}>
              {collectedCount} of {pageData.sources.length} sources collected
              {" "}&middot; Method: {pageData.aggregationMethod}
            </p>
          </div>
          <p className="text-2xl font-bold font-mono" style={{ color: allCollected ? "#1a9338" : "rgba(38,38,38,0.35)" }}>
            {collectedCount}/{pageData.sources.length}
          </p>
        </div>
      </div>

      {/* Source cards grid */}
      <div className="grid grid-cols-1 md:grid-cols-2" style={{ gap: 16, marginBottom: 24 }}>
        {pageData.sources.map((source) => {
          const result = sourceResults[source.id];
          const isLoading = loadingSource === source.id;
          const isOk = result?.status === "ok";
          const isUnavailable = result?.status === "unavailable";

          return (
            <div
              key={source.id}
              className="card-surface"
              style={{
                borderRadius: 12,
                padding: 16,
                border: isOk ? "1px solid rgba(26,147,56,0.3)" : isUnavailable ? "1px solid rgba(220,38,38,0.3)" : "1px solid #e8e8e8",
              }}
              {...testAttr("source-card", source.id)}
            >
              <div className="flex items-start justify-between" style={{ marginBottom: 12 }}>
                <div>
                  <h4 className="font-medium text-sm" style={{ color: "#262626" }} {...testAttr("source-name", source.id)}>{source.name}</h4>
                  <p className="text-xs" style={{ color: "rgba(38,38,38,0.5)", marginTop: 2 }}>{source.description}</p>
                </div>
                <span
                  className="text-xs font-medium"
                  style={{
                    padding: "2px 8px",
                    borderRadius: 99,
                    background: source.isStable ? "rgba(26,147,56,0.1)" : "rgba(250,93,25,0.1)",
                    color: source.isStable ? "#1a9338" : "#fa5d19",
                  }}
                  {...testAttr("source-stability", source.id)}
                >
                  {source.isStable ? "Stable" : "Intermittent"}
                </span>
              </div>

              {/* Result display */}
              {isOk && (
                <div style={{ background: "rgba(26,147,56,0.04)", borderRadius: 8, padding: 12, marginBottom: 12 }} {...testAttr("source-value", source.id)}>
                  <p className="text-xs" style={{ color: "rgba(38,38,38,0.5)" }}>{result.label}</p>
                  <p className="text-lg font-mono font-bold" style={{ color: "#1a9338" }}>{result.value}</p>
                </div>
              )}

              {isUnavailable && !isLoading && (
                <div style={{ background: "rgba(220,38,38,0.04)", borderRadius: 8, padding: 12, marginBottom: 12 }} {...testAttr("source-error", source.id)}>
                  <p className="text-sm" style={{ color: "#dc2626" }}>{result.message}</p>
                  {result.retryAfterMs && (
                    <p className="text-xs" style={{ color: "rgba(38,38,38,0.5)", marginTop: 4 }}>
                      Retry in ~{Math.ceil(result.retryAfterMs / 1000)}s
                    </p>
                  )}
                </div>
              )}

              {/* Action button */}
              {!isOk && (
                <button
                  onClick={() => fetchSource(source.id)}
                  disabled={isLoading}
                  className="text-sm font-medium"
                  style={{
                    width: "100%",
                    padding: "8px 16px",
                    borderRadius: 8,
                    border: "none",
                    cursor: isLoading ? "default" : "pointer",
                    background: isUnavailable ? "rgba(250,93,25,0.1)" : "rgba(250,93,25,0.08)",
                    color: "#fa5d19",
                  }}
                  {...testAttr(isUnavailable ? "retry-btn" : "fetch-btn", source.id)}
                >
                  {isLoading ? (
                    <span className="flex items-center justify-center" style={{ gap: 8 }}>
                      <span className="animate-spin" style={{ display: "inline-block", width: 14, height: 14, borderRadius: "50%", borderBottom: "2px solid #fa5d19" }} />
                      Fetching...
                    </span>
                  ) : isUnavailable ? "Retry" : "Fetch Data"}
                </button>
              )}

              {isOk && (
                <div className="text-xs font-medium" style={{ color: "#1a9338", textAlign: "center" }}>
                  Collected
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Answer input */}
      <div>
        <label className="text-sm" style={{ display: "block", color: "rgba(38,38,38,0.5)", marginBottom: 8 }}>
          {pageData.aggregationMethod === "sum" ? "Sum of All Values" : "Average of All Values"}
        </label>
        <input
          type="text"
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          placeholder={allCollected ? "Computed automatically..." : "Collect all sources first..."}
          style={{ width: "100%", maxWidth: 448, padding: "8px 16px", background: "#fff", border: "1px solid #d1d1d1", borderRadius: 8, color: "#262626", outline: "none" }}
        />
      </div>
    </div>
  );
}
