"use client";

import { useState, useEffect, MutableRefObject } from "react";
import { testAttr } from "../../../../lib/test-attrs";
import { useInteract } from "../../../../lib/use-interact";

interface ConfigDebuggerPageData {
  resolvedConfig: Record<string, string | number | boolean>;
  flaggedKey: string;
  expectedBehavior: string;
  layerNames: string[];
  variantIndex: number;
}

interface Props {
  pageData: ConfigDebuggerPageData;
  answerRef: MutableRefObject<string>;
  sessionId: string;
  challengeId: string;
  renderToken: string;
}

export default function ConfigDebuggerChallenge({ pageData, answerRef, sessionId, challengeId, renderToken }: Props) {
  const [answer, setAnswer] = useState("");
  const [layers, setLayers] = useState<Record<string, Record<string, string | number | boolean>>>({});
  const [loadingLayer, setLoadingLayer] = useState<string | null>(null);
  const interact = useInteract(challengeId, sessionId, renderToken);

  useEffect(() => {
    answerRef.current = answer;
  }, [answer, answerRef]);

  const loadLayer = async (name: string) => {
    setLoadingLayer(name);
    try {
      const result = await interact("layer", { name }) as { name: string; config: Record<string, string | number | boolean> };
      if (result?.config) {
        setLayers((prev) => ({ ...prev, [name]: result.config }));
      }
    } catch (err) {
      console.error("Failed to load layer:", err);
    } finally {
      setLoadingLayer(null);
    }
  };

  const loadedCount = Object.keys(layers).length;

  return (
    <div>
      {/* Resolved config with flagged key */}
      <div className="card-surface" style={{ borderRadius: 12, padding: 16, marginBottom: 24 }}>
        <div className="flex items-center justify-between" style={{ marginBottom: 12 }}>
          <h3 className="text-sm font-medium" style={{ color: "#9061ff", textTransform: "uppercase", letterSpacing: "0.05em" }}>
            Resolved Configuration
          </h3>
          <span className="text-xs" style={{ color: "rgba(38,38,38,0.5)" }}>
            {Object.keys(pageData.resolvedConfig).length} keys
          </span>
        </div>

        <p className="text-xs" style={{ color: "#dc2626", marginBottom: 12, padding: "6px 10px", background: "rgba(220,38,38,0.04)", border: "1px solid rgba(220,38,38,0.2)", borderRadius: 6 }} {...testAttr("expected-behavior")}>
          {pageData.expectedBehavior}
        </p>

        <div style={{ maxHeight: 320, overflowY: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th className="text-xs" style={{ textAlign: "left", padding: "4px 8px", color: "rgba(38,38,38,0.5)", borderBottom: "1px solid #e8e8e8" }}>Key</th>
                <th className="text-xs" style={{ textAlign: "left", padding: "4px 8px", color: "rgba(38,38,38,0.5)", borderBottom: "1px solid #e8e8e8" }}>Value</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(pageData.resolvedConfig).map(([key, value]) => {
                const isFlagged = key === pageData.flaggedKey;
                return (
                  <tr
                    key={key}
                    style={{
                      background: isFlagged ? "rgba(220,38,38,0.06)" : "transparent",
                    }}
                    {...testAttr("config-row", key)}
                  >
                    <td className="text-sm font-mono" style={{ padding: "4px 8px", color: isFlagged ? "#dc2626" : "#262626", borderBottom: "1px solid #f3f3f3", fontWeight: isFlagged ? 600 : 400 }}>
                      {key} {isFlagged && <span className="text-xs" style={{ color: "#dc2626", marginLeft: 4 }}>BUG</span>}
                    </td>
                    <td className="text-sm font-mono" style={{ padding: "4px 8px", color: isFlagged ? "#dc2626" : "rgba(38,38,38,0.7)", borderBottom: "1px solid #f3f3f3", fontWeight: isFlagged ? 600 : 400 }}>
                      {JSON.stringify(value)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Layer panels */}
      <div className="flex items-center justify-between" style={{ marginBottom: 12 }}>
        <h4 className="text-sm font-medium" style={{ color: "rgba(38,38,38,0.5)" }}>Config Layers</h4>
        <p className="text-xs" style={{ color: "rgba(38,38,38,0.4)" }}>
          {loadedCount} of {pageData.layerNames.length} loaded
        </p>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 24 }}>
        {pageData.layerNames.map((name) => {
          const layerData = layers[name];
          const isLoading = loadingLayer === name;

          return (
            <div
              key={name}
              className="card-surface"
              style={{
                borderRadius: 12,
                padding: 16,
                border: layerData ? "1px solid rgba(26,147,56,0.3)" : "1px solid #e8e8e8",
              }}
              {...testAttr("layer-card", name)}
            >
              <div className="flex items-center justify-between" style={{ marginBottom: layerData ? 12 : 0 }}>
                <div className="flex items-center" style={{ gap: 8 }}>
                  <h5 className="text-sm font-medium" style={{ color: "#262626" }}>{name}</h5>
                  {layerData && (
                    <span className="text-xs" style={{ color: "#1a9338", background: "rgba(26,147,56,0.1)", padding: "1px 6px", borderRadius: 4 }}>
                      {Object.keys(layerData).length} keys
                    </span>
                  )}
                </div>
                {!layerData && (
                  <button
                    onClick={() => loadLayer(name)}
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
                    {...testAttr("load-layer-btn", name)}
                  >
                    {isLoading ? "Loading..." : "Load Layer"}
                  </button>
                )}
              </div>

              {layerData && (
                <div style={{ maxHeight: 200, overflowY: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <tbody>
                      {Object.entries(layerData).map(([key, value]) => (
                        <tr key={key} {...testAttr("layer-row", `${name}-${key}`)}>
                          <td className="text-xs font-mono" style={{ padding: "3px 8px", color: "#262626", borderBottom: "1px solid #f3f3f3" }}>{key}</td>
                          <td className="text-xs font-mono" style={{ padding: "3px 8px", color: "rgba(38,38,38,0.7)", borderBottom: "1px solid #f3f3f3" }}>{JSON.stringify(value)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Answer input */}
      <div>
        <label className="text-sm" style={{ display: "block", color: "rgba(38,38,38,0.5)", marginBottom: 8 }}>
          Answer (format: layer:key:correctValue)
        </label>
        <input
          type="text"
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          placeholder='e.g. "production:database_pool_size:10"'
          style={{ width: "100%", maxWidth: 448, padding: "8px 16px", background: "#fff", border: "1px solid #d1d1d1", borderRadius: 8, color: "#262626", outline: "none" }}
        />
      </div>
    </div>
  );
}
