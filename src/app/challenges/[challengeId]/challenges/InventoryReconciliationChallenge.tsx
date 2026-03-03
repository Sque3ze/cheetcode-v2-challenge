"use client";

import { useState, useEffect, MutableRefObject } from "react";
import { testAttr } from "../../../../lib/test-attrs";
import { useInteract } from "../../../../lib/use-interact";

interface ProductInfo {
  id: string;
  name: string;
}

interface SystemProduct {
  productId: string;
  name: string;
  quantity: number;
  status: string;
  location: string;
  price: number;
  lastUpdated: string;
}

interface InventoryReconciliationPageData {
  products: ProductInfo[];
  rules: {
    quantity: string;
    status: string;
    location: string;
    price: string;
  };
  question: string;
  questionParams: Record<string, string | number>;
  locations: string[];
  variantIndex: number;
}

interface Props {
  pageData: InventoryReconciliationPageData;
  answerRef: MutableRefObject<string>;
  sessionId: string;
  challengeId: string;
  renderToken: string;
}

const SYSTEM_NAMES = ["warehouse", "sales", "shipping"] as const;
const SYSTEM_LABELS: Record<string, string> = {
  warehouse: "Warehouse System",
  sales: "Sales System",
  shipping: "Shipping System",
};

export default function InventoryReconciliationChallenge({ pageData, answerRef, sessionId, challengeId, renderToken }: Props) {
  const [answer, setAnswer] = useState("");
  const [systemData, setSystemData] = useState<Record<string, SystemProduct[]>>({});
  const [loadingSystem, setLoadingSystem] = useState<string | null>(null);
  const interact = useInteract(challengeId, sessionId, renderToken);

  useEffect(() => {
    answerRef.current = answer;
  }, [answer, answerRef]);

  const loadSystem = async (system: string) => {
    setLoadingSystem(system);
    try {
      const result = await interact("source", { system }) as { system: string; products: SystemProduct[] };
      if (result?.products) {
        setSystemData((prev) => ({ ...prev, [system]: result.products }));
      }
    } catch (err) {
      console.error("Failed to load system:", err);
    } finally {
      setLoadingSystem(null);
    }
  };

  const loadedCount = Object.keys(systemData).length;
  const allLoaded = loadedCount === SYSTEM_NAMES.length;

  return (
    <div>
      {/* Rules panel */}
      <div style={{ background: "rgba(144,97,255,0.04)", border: "1px solid rgba(144,97,255,0.2)", borderRadius: 12, padding: 16, marginBottom: 24 }}>
        <p className="text-xs font-medium" style={{ color: "#9061ff", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 10 }}>
          Reconciliation Rules
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {Object.entries(pageData.rules).map(([field, rule]) => (
            <div key={field} className="flex" style={{ gap: 8 }} {...testAttr("rule", field)}>
              <span className="text-xs font-mono font-bold" style={{ color: "#262626", minWidth: 70, textTransform: "capitalize" }}>{field}:</span>
              <span className="text-xs" style={{ color: "rgba(38,38,38,0.7)" }}>{rule}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Question */}
      <div className="card-surface" style={{ borderRadius: 12, padding: 16, marginBottom: 24, border: "1px solid rgba(250,93,25,0.2)", background: "rgba(250,93,25,0.03)" }}>
        <p className="text-xs font-medium" style={{ color: "#fa5d19", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>Question</p>
        <p className="text-sm" style={{ color: "#262626" }} {...testAttr("question")}>{pageData.question}</p>
      </div>

      {/* System cards */}
      <div className="flex items-center justify-between" style={{ marginBottom: 12 }}>
        <h4 className="text-sm font-medium" style={{ color: "rgba(38,38,38,0.5)" }}>Data Sources</h4>
        <p className="text-xs" style={{ color: "rgba(38,38,38,0.4)" }}>
          {loadedCount} of {SYSTEM_NAMES.length} loaded
          {allLoaded && <span style={{ color: "#1a9338", marginLeft: 8 }}>All loaded</span>}
        </p>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 24 }}>
        {SYSTEM_NAMES.map((system) => {
          const data = systemData[system];
          const isLoading = loadingSystem === system;

          return (
            <div
              key={system}
              className="card-surface"
              style={{
                borderRadius: 12,
                padding: 16,
                border: data ? "1px solid rgba(26,147,56,0.3)" : "1px solid #e8e8e8",
              }}
              {...testAttr("system-card", system)}
            >
              <div className="flex items-center justify-between" style={{ marginBottom: data ? 12 : 0 }}>
                <div className="flex items-center" style={{ gap: 8 }}>
                  <h5 className="text-sm font-medium" style={{ color: "#262626" }}>{SYSTEM_LABELS[system]}</h5>
                  {data && (
                    <span className="text-xs" style={{ color: "#1a9338", background: "rgba(26,147,56,0.1)", padding: "1px 6px", borderRadius: 4 }}>
                      {data.length} products
                    </span>
                  )}
                </div>
                {!data && (
                  <button
                    onClick={() => loadSystem(system)}
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
                    {...testAttr("load-system-btn", system)}
                  >
                    {isLoading ? "Loading..." : "Load Data"}
                  </button>
                )}
              </div>

              {data && (
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                    <thead>
                      <tr>
                        <th style={{ textAlign: "left", padding: "3px 6px", color: "rgba(38,38,38,0.5)", borderBottom: "1px solid #e8e8e8" }}>Product</th>
                        <th style={{ textAlign: "right", padding: "3px 6px", color: "rgba(38,38,38,0.5)", borderBottom: "1px solid #e8e8e8" }}>Qty</th>
                        <th style={{ textAlign: "left", padding: "3px 6px", color: "rgba(38,38,38,0.5)", borderBottom: "1px solid #e8e8e8" }}>Status</th>
                        <th style={{ textAlign: "left", padding: "3px 6px", color: "rgba(38,38,38,0.5)", borderBottom: "1px solid #e8e8e8" }}>Location</th>
                        <th style={{ textAlign: "right", padding: "3px 6px", color: "rgba(38,38,38,0.5)", borderBottom: "1px solid #e8e8e8" }}>Price</th>
                        <th style={{ textAlign: "left", padding: "3px 6px", color: "rgba(38,38,38,0.5)", borderBottom: "1px solid #e8e8e8" }}>Updated</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.map((product) => (
                        <tr key={product.productId} {...testAttr("product-row", `${system}-${product.productId}`)}>
                          <td className="font-mono" style={{ padding: "3px 6px", color: "#262626", borderBottom: "1px solid #f3f3f3" }}>{product.name}</td>
                          <td className="font-mono" style={{ textAlign: "right", padding: "3px 6px", color: "#262626", borderBottom: "1px solid #f3f3f3" }}>{product.quantity}</td>
                          <td style={{ padding: "3px 6px", borderBottom: "1px solid #f3f3f3" }}>
                            <span style={{
                              padding: "1px 5px",
                              borderRadius: 3,
                              fontSize: 11,
                              background: product.status === "active" ? "rgba(26,147,56,0.1)" : "rgba(220,38,38,0.1)",
                              color: product.status === "active" ? "#1a9338" : "#dc2626",
                            }}>
                              {product.status}
                            </span>
                          </td>
                          <td className="font-mono" style={{ padding: "3px 6px", color: "rgba(38,38,38,0.7)", borderBottom: "1px solid #f3f3f3" }}>{product.location}</td>
                          <td className="font-mono" style={{ textAlign: "right", padding: "3px 6px", color: "#262626", borderBottom: "1px solid #f3f3f3" }}>${product.price.toFixed(2)}</td>
                          <td className="font-mono" style={{ padding: "3px 6px", color: "rgba(38,38,38,0.5)", borderBottom: "1px solid #f3f3f3", fontSize: 10 }}>{product.lastUpdated}</td>
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
          Final Answer
        </label>
        <input
          type="text"
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          placeholder={allLoaded ? "Enter your answer..." : "Load all 3 systems first..."}
          style={{ width: "100%", maxWidth: 448, padding: "8px 16px", background: "#fff", border: "1px solid #d1d1d1", borderRadius: 8, color: "#262626", outline: "none" }}
        />
      </div>
    </div>
  );
}
