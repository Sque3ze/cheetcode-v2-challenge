"use client";

import { useState, useEffect, MutableRefObject } from "react";
import { testAttr } from "../../../../lib/test-attrs";
import { useInteract } from "../../../../lib/use-interact";

interface ProductData {
  name: string;
  unitsSold: number;
  unitPrice: number;
  returnRate: number;
}

interface OfficeInfo {
  id: string;
  name: string;
  region: string;
}

interface FanOutAggregatorPageData {
  offices: OfficeInfo[];
  taxRate: number;
  logisticsFee: number;
  formulaDescription: string;
}

interface Props {
  pageData: FanOutAggregatorPageData;
  answerRef: MutableRefObject<string>;
  sessionId: string;
  challengeId: string;
  renderToken: string;
}

export default function FanOutAggregatorChallenge({ pageData, answerRef, sessionId, challengeId, renderToken }: Props) {
  const [answer, setAnswer] = useState("");
  const [officeData, setOfficeData] = useState<Record<string, { products: ProductData[] }>>({});
  const [loadingOffice, setLoadingOffice] = useState<string | null>(null);
  const interact = useInteract(challengeId, sessionId, renderToken);

  useEffect(() => {
    answerRef.current = answer;
  }, [answer, answerRef]);

  const loadedCount = Object.keys(officeData).length;
  const allLoaded = loadedCount === pageData.offices.length;

  // Auto-compute when all offices are loaded
  useEffect(() => {
    if (!allLoaded) return;
    let grandTotal = 0;
    for (const office of pageData.offices) {
      const data = officeData[office.id];
      if (!data) continue;
      for (const p of data.products) {
        const net = (p.unitsSold * p.unitPrice * (1 - p.returnRate / 100)) - (p.unitsSold * pageData.logisticsFee);
        grandTotal += net;
      }
    }
    const afterTax = grandTotal * (1 - pageData.taxRate / 100);
    setAnswer((Math.round(afterTax * 100) / 100).toFixed(2));
  }, [allLoaded, officeData, pageData]);

  const loadOffice = async (officeId: string) => {
    setLoadingOffice(officeId);
    try {
      const result = await interact("office", { officeId }) as { products: ProductData[] };
      if (result?.products) {
        setOfficeData((prev) => ({ ...prev, [officeId]: result }));
      }
    } catch (err) {
      console.error("Failed to load office:", err);
    } finally {
      setLoadingOffice(null);
    }
  };

  const computeOfficeNet = (products: ProductData[]) => {
    let net = 0;
    for (const p of products) {
      net += (p.unitsSold * p.unitPrice * (1 - p.returnRate / 100)) - (p.unitsSold * pageData.logisticsFee);
    }
    return net;
  };

  return (
    <div>
      <div style={{ background: "rgba(144,97,255,0.04)", border: "1px solid rgba(144,97,255,0.2)", borderRadius: 12, padding: 16, marginBottom: 24 }}>
        <p className="text-xs" style={{ color: "#9061ff", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>Headquarters Parameters</p>
        <div className="flex" style={{ gap: 24, flexWrap: "wrap" }}>
          <div>
            <p className="text-xs" style={{ color: "rgba(38,38,38,0.5)" }}>Tax Rate</p>
            <p className="text-lg font-mono font-bold" style={{ color: "#262626" }} {...testAttr("tax-rate")}>{pageData.taxRate}%</p>
          </div>
          <div>
            <p className="text-xs" style={{ color: "rgba(38,38,38,0.5)" }}>Logistics Fee (per unit)</p>
            <p className="text-lg font-mono font-bold" style={{ color: "#262626" }} {...testAttr("logistics-fee")}>${pageData.logisticsFee.toFixed(2)}</p>
          </div>
          <div style={{ flex: 1, minWidth: 200 }}>
            <p className="text-xs" style={{ color: "rgba(38,38,38,0.5)" }}>Formula</p>
            <p className="text-xs" style={{ color: "rgba(38,38,38,0.7)", marginTop: 4, lineHeight: 1.5 }} {...testAttr("formula")}>{pageData.formulaDescription}</p>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between" style={{ marginBottom: 16 }}>
        <p className="text-sm" style={{ color: "rgba(38,38,38,0.5)" }}>
          {loadedCount} of {pageData.offices.length} offices loaded
        </p>
        {allLoaded && (
          <span className="text-xs font-medium" style={{ color: "#1a9338", background: "rgba(26,147,56,0.1)", padding: "2px 8px", borderRadius: 99 }}>
            All data collected
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2" style={{ gap: 16, marginBottom: 24 }}>
        {pageData.offices.map((office) => {
          const data = officeData[office.id];
          const isLoading = loadingOffice === office.id;
          const isLoaded = !!data;

          return (
            <div
              key={office.id}
              className="card-surface"
              style={{
                borderRadius: 12,
                padding: 16,
                border: isLoaded ? "1px solid rgba(26,147,56,0.3)" : "1px solid #e8e8e8",
              }}
              {...testAttr("office-card", office.id)}
            >
              <div className="flex items-center justify-between" style={{ marginBottom: 12 }}>
                <div>
                  <h4 className="font-medium text-sm" style={{ color: "#262626" }} {...testAttr("office-name", office.id)}>{office.name}</h4>
                  <p className="text-xs" style={{ color: "rgba(38,38,38,0.5)" }}>{office.region}</p>
                </div>
                {isLoaded && (
                  <span className="text-xs font-mono" style={{ color: "#1a9338" }} {...testAttr("office-subtotal", office.id)}>
                    Net: ${computeOfficeNet(data.products).toFixed(2)}
                  </span>
                )}
              </div>

              {isLoaded ? (
                <div className="overflow-x-auto" style={{ borderRadius: 8, overflow: "hidden" }}>
                  <table className="w-full text-sm" {...testAttr("office-products", office.id)}>
                    <thead>
                      <tr style={{ background: "#f3f3f3" }}>
                        <th className="text-left font-medium" style={{ padding: "6px 10px", color: "rgba(38,38,38,0.5)", fontSize: 11 }}>Product</th>
                        <th className="text-right font-medium" style={{ padding: "6px 10px", color: "rgba(38,38,38,0.5)", fontSize: 11 }}>Units</th>
                        <th className="text-right font-medium" style={{ padding: "6px 10px", color: "rgba(38,38,38,0.5)", fontSize: 11 }}>Price</th>
                        <th className="text-right font-medium" style={{ padding: "6px 10px", color: "rgba(38,38,38,0.5)", fontSize: 11 }}>Return %</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.products.map((p) => (
                        <tr key={p.name} style={{ borderTop: "1px solid #e8e8e8" }} {...testAttr("product-row", p.name)}>
                          <td style={{ padding: "6px 10px", fontSize: 12 }}>{p.name}</td>
                          <td className="text-right font-mono" style={{ padding: "6px 10px", fontSize: 12 }} {...testAttr("units-sold")}>{p.unitsSold}</td>
                          <td className="text-right font-mono" style={{ padding: "6px 10px", fontSize: 12 }} {...testAttr("unit-price")}>${p.unitPrice.toFixed(2)}</td>
                          <td className="text-right font-mono" style={{ padding: "6px 10px", fontSize: 12 }} {...testAttr("return-rate")}>{p.returnRate}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <button
                  onClick={() => loadOffice(office.id)}
                  disabled={isLoading}
                  className="text-sm font-medium"
                  style={{
                    width: "100%",
                    padding: "8px 16px",
                    borderRadius: 8,
                    border: "none",
                    cursor: isLoading ? "default" : "pointer",
                    background: "rgba(250,93,25,0.08)",
                    color: "#fa5d19",
                  }}
                  {...testAttr("load-office", office.id)}
                >
                  {isLoading ? (
                    <span className="flex items-center justify-center" style={{ gap: 8 }}>
                      <span className="animate-spin" style={{ display: "inline-block", width: 14, height: 14, borderRadius: "50%", borderBottom: "2px solid #fa5d19" }} />
                      Loading...
                    </span>
                  ) : "Load Data"}
                </button>
              )}
            </div>
          );
        })}
      </div>

      <div>
        <label className="text-sm" style={{ display: "block", color: "rgba(38,38,38,0.5)", marginBottom: 8 }}>Total Net Revenue (after tax)</label>
        <input
          type="text"
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          placeholder={allLoaded ? "Computed automatically..." : "Load all offices first..."}
          style={{ width: "100%", maxWidth: 448, padding: "8px 16px", background: "#fff", border: "1px solid #d1d1d1", borderRadius: 8, color: "#262626", outline: "none" }}
        />
      </div>
    </div>
  );
}
