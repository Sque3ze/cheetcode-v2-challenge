"use client";

import { useState, useEffect, MutableRefObject } from "react";
import { testAttr } from "../../../../lib/test-attrs";
import { useInteract } from "../../../../lib/use-interact";

interface LogEntry {
  traceId: string;
  timestamp: string;
  level: "INFO" | "WARN" | "ERROR";
  message: string;
  errorCode?: string;
}

interface TraceAnalyzerPageData {
  traceId: string;
  services: string[];
  requestSummary: {
    startTime: string;
    method: string;
    path: string;
    status: string;
  };
  variantIndex: number;
}

interface Props {
  pageData: TraceAnalyzerPageData;
  answerRef: MutableRefObject<string>;
  sessionId: string;
  challengeId: string;
  renderToken: string;
}

const LEVEL_STYLES: Record<string, { bg: string; color: string; border: string }> = {
  INFO: { bg: "rgba(38,38,38,0.04)", color: "rgba(38,38,38,0.6)", border: "rgba(38,38,38,0.1)" },
  WARN: { bg: "rgba(234,179,8,0.06)", color: "#a16207", border: "rgba(234,179,8,0.2)" },
  ERROR: { bg: "rgba(220,38,38,0.06)", color: "#dc2626", border: "rgba(220,38,38,0.2)" },
};

export default function TraceAnalyzerChallenge({ pageData, answerRef, sessionId, challengeId, renderToken }: Props) {
  const [answer, setAnswer] = useState("");
  const [serviceLogs, setServiceLogs] = useState<Record<string, LogEntry[]>>({});
  const [loadingService, setLoadingService] = useState<string | null>(null);
  const interact = useInteract(challengeId, sessionId, renderToken);

  useEffect(() => {
    answerRef.current = answer;
  }, [answer, answerRef]);

  const loadLogs = async (service: string) => {
    setLoadingService(service);
    try {
      const result = await interact("logs", { service }) as { service: string; entries: LogEntry[] };
      if (result?.entries) {
        setServiceLogs((prev) => ({ ...prev, [service]: result.entries }));
      }
    } catch (err) {
      console.error("Failed to load logs:", err);
    } finally {
      setLoadingService(null);
    }
  };

  const loadedCount = Object.keys(serviceLogs).length;

  return (
    <div>
      <div style={{ background: "rgba(220,38,38,0.04)", border: "1px solid rgba(220,38,38,0.2)", borderRadius: 12, padding: 16, marginBottom: 24 }}>
        <div className="flex items-center" style={{ gap: 8, marginBottom: 12 }}>
          <p className="text-xs font-medium" style={{ color: "#dc2626", textTransform: "uppercase", letterSpacing: "0.05em" }}>
            Failed Request
          </p>
          <span className="text-xs font-bold" style={{ padding: "1px 6px", borderRadius: 4, background: "rgba(220,38,38,0.1)", color: "#dc2626" }}>
            {pageData.requestSummary.status}
          </span>
        </div>

        <div className="flex" style={{ gap: 24, flexWrap: "wrap" }}>
          <div>
            <p className="text-xs" style={{ color: "rgba(38,38,38,0.5)" }}>Trace ID</p>
            <p className="font-mono font-bold text-sm" style={{ color: "#262626" }} {...testAttr("trace-id")}>{pageData.traceId}</p>
          </div>
          <div>
            <p className="text-xs" style={{ color: "rgba(38,38,38,0.5)" }}>Method</p>
            <p className="font-mono font-bold text-sm" style={{ color: "#262626" }}>{pageData.requestSummary.method}</p>
          </div>
          <div>
            <p className="text-xs" style={{ color: "rgba(38,38,38,0.5)" }}>Path</p>
            <p className="font-mono font-bold text-sm" style={{ color: "#262626" }}>{pageData.requestSummary.path}</p>
          </div>
          <div>
            <p className="text-xs" style={{ color: "rgba(38,38,38,0.5)" }}>Start Time</p>
            <p className="font-mono text-sm" style={{ color: "rgba(38,38,38,0.7)" }}>{pageData.requestSummary.startTime}</p>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between" style={{ marginBottom: 12 }}>
        <h4 className="text-sm font-medium" style={{ color: "rgba(38,38,38,0.5)" }}>Service Logs</h4>
        <p className="text-xs" style={{ color: "rgba(38,38,38,0.4)" }}>
          {loadedCount} of {pageData.services.length} loaded
        </p>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 24 }}>
        {pageData.services.map((service) => {
          const logs = serviceLogs[service];
          const isLoading = loadingService === service;

          return (
            <div
              key={service}
              className="card-surface"
              style={{
                borderRadius: 12,
                padding: 16,
                border: logs ? "1px solid rgba(26,147,56,0.3)" : "1px solid #e8e8e8",
              }}
              {...testAttr("service-card", service)}
            >
              <div className="flex items-center justify-between" style={{ marginBottom: logs ? 12 : 0 }}>
                <div className="flex items-center" style={{ gap: 8 }}>
                  <h5 className="text-sm font-medium" style={{ color: "#262626" }}>{service}</h5>
                  {logs && (
                    <span className="text-xs" style={{ color: "#1a9338", background: "rgba(26,147,56,0.1)", padding: "1px 6px", borderRadius: 4 }}>
                      {logs.length} entries
                    </span>
                  )}
                </div>
                {!logs && (
                  <button
                    onClick={() => loadLogs(service)}
                    disabled={isLoading}
                    className="text-xs font-medium"
                    style={{
                      padding: "4px 12px",
                      borderRadius: 6,
                      border: "none",
                      background: "rgba(250,93,25,0.08)",
                      color: "#fa5d19",
                      cursor: isLoading ? "default" : "pointer",
                    }}
                    {...testAttr("load-logs-btn", service)}
                  >
                    {isLoading ? "Loading..." : "Load Logs"}
                  </button>
                )}
              </div>

              {logs && (
                <div style={{ maxHeight: 280, overflowY: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
                    <thead>
                      <tr>
                        <th style={{ textAlign: "left", padding: "3px 6px", color: "rgba(38,38,38,0.5)", borderBottom: "1px solid #e8e8e8", whiteSpace: "nowrap" }}>Trace ID</th>
                        <th style={{ textAlign: "left", padding: "3px 6px", color: "rgba(38,38,38,0.5)", borderBottom: "1px solid #e8e8e8", whiteSpace: "nowrap" }}>Time</th>
                        <th style={{ textAlign: "center", padding: "3px 6px", color: "rgba(38,38,38,0.5)", borderBottom: "1px solid #e8e8e8" }}>Level</th>
                        <th style={{ textAlign: "left", padding: "3px 6px", color: "rgba(38,38,38,0.5)", borderBottom: "1px solid #e8e8e8" }}>Message</th>
                      </tr>
                    </thead>
                    <tbody>
                      {logs.map((entry, i) => {
                        const style = LEVEL_STYLES[entry.level];
                        const isTarget = entry.traceId === pageData.traceId;
                        return (
                          <tr
                            key={i}
                            style={{ background: isTarget ? "rgba(144,97,255,0.04)" : "transparent" }}
                            {...testAttr("log-entry", `${service}-${i}`)}
                          >
                            <td className="font-mono" style={{
                              padding: "3px 6px",
                              color: isTarget ? "#9061ff" : "rgba(38,38,38,0.5)",
                              borderBottom: "1px solid #f3f3f3",
                              whiteSpace: "nowrap",
                              fontWeight: isTarget ? 600 : 400,
                            }}>
                              {entry.traceId}
                            </td>
                            <td className="font-mono" style={{ padding: "3px 6px", color: "rgba(38,38,38,0.5)", borderBottom: "1px solid #f3f3f3", whiteSpace: "nowrap" }}>
                              {entry.timestamp.split("T")[1]?.replace("Z", "")}
                            </td>
                            <td style={{ padding: "3px 6px", borderBottom: "1px solid #f3f3f3", textAlign: "center" }}>
                              <span style={{
                                padding: "1px 4px",
                                borderRadius: 3,
                                fontSize: 10,
                                fontWeight: 600,
                                background: style.bg,
                                color: style.color,
                                border: `1px solid ${style.border}`,
                              }}>
                                {entry.level}
                              </span>
                            </td>
                            <td style={{
                              padding: "3px 6px",
                              color: entry.level === "ERROR" ? "#dc2626" : "#262626",
                              borderBottom: "1px solid #f3f3f3",
                              fontWeight: entry.level === "ERROR" ? 500 : 400,
                            }}>
                              {entry.message}
                              {entry.errorCode && (
                                <span className="font-mono font-bold" style={{ marginLeft: 6, color: "#dc2626" }}>
                                  [{entry.errorCode}]
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div>
        <label className="text-sm" style={{ display: "block", color: "rgba(38,38,38,0.5)", marginBottom: 8 }}>
          Answer (format: ServiceName:ERROR_CODE)
        </label>
        <input
          type="text"
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          placeholder='e.g. "Payment Service:ERR_INSUFFICIENT_FUNDS"'
          style={{ width: "100%", maxWidth: 448, padding: "8px 16px", background: "#fff", border: "1px solid #d1d1d1", borderRadius: 8, color: "#262626", outline: "none" }}
        />
      </div>
    </div>
  );
}
