"use client";

import { useState, useEffect, MutableRefObject } from "react";
import { testAttr } from "../../../../lib/test-attrs";
import { useInteract } from "../../../../lib/use-interact";

interface SalesRow {
  id: string;
  region: string;
  product: string;
  revenue: number;
  units: number;
  quarter: string;
}

interface CostRow {
  product: string;
  costPerUnit: number;
  shipping: number;
}

interface TaxRow {
  region: string;
  taxRate: number;
}

interface DataDashboardPageData {
  sales: SalesRow[];
  totalSales?: number;
  costs?: CostRow[];
  taxes?: TaxRow[];
  targetProduct: string;
  targetRegion: string;
  targetQuarters: string[];
  quickStatsTotal: number;
  salesPerPage: number;
}

interface Props {
  pageData: DataDashboardPageData;
  answerRef: MutableRefObject<string>;
  sessionId: string;
  challengeId: string;
  renderToken: string;
}

type DashboardTab = "sales" | "costs" | "taxes";

export default function DataDashboardChallenge({ pageData, answerRef, sessionId, challengeId, renderToken }: Props) {
  const [answer, setAnswer] = useState("");
  const [activeTab, setActiveTab] = useState<DashboardTab>("sales");
  const [salesPage, setSalesPage] = useState(0);
  const [allSales, setAllSales] = useState<SalesRow[]>(pageData.sales);
  const [costs, setCosts] = useState<CostRow[]>(pageData.costs ?? []);
  const [taxes, setTaxes] = useState<TaxRow[]>(pageData.taxes ?? []);
  const [loadingTab, setLoadingTab] = useState(false);
  const [loadingPage, setLoadingPage] = useState(false);
  const interact = useInteract(challengeId, sessionId, renderToken);

  const totalSales = pageData.totalSales ?? allSales.length;
  const perPage = pageData.salesPerPage;
  const totalPages = Math.ceil(totalSales / perPage);

  useEffect(() => {
    answerRef.current = answer;
  }, [answer, answerRef]);

  const handleTabChange = async (tab: DashboardTab) => {
    setActiveTab(tab);
    if (tab === "costs" && costs.length === 0) {
      setLoadingTab(true);
      try {
        const result = await interact("tab", { tab: "costs" }) as { costs: CostRow[] };
        if (result?.costs) setCosts(result.costs);
      } catch (err) {
        console.error("Failed to load costs:", err);
      } finally {
        setLoadingTab(false);
      }
    }
    if (tab === "taxes" && taxes.length === 0) {
      setLoadingTab(true);
      try {
        const result = await interact("tab", { tab: "taxes" }) as { taxes: TaxRow[] };
        if (result?.taxes) setTaxes(result.taxes);
      } catch (err) {
        console.error("Failed to load taxes:", err);
      } finally {
        setLoadingTab(false);
      }
    }
  };

  const handleSalesPageChange = async (page: number) => {
    const neededUpTo = (page + 1) * perPage;
    if (allSales.length < neededUpTo && allSales.length < totalSales) {
      setLoadingPage(true);
      try {
        const result = await interact("page", { page }) as { sales: SalesRow[] };
        if (result?.sales?.length) {
          setAllSales(prev => {
            const newSales = [...prev];
            const start = page * perPage;
            for (let i = 0; i < result.sales.length; i++) {
              newSales[start + i] = result.sales[i];
            }
            return newSales;
          });
        }
      } catch (err) {
        console.error("Failed to load sales page:", err);
      } finally {
        setLoadingPage(false);
      }
    }
    setSalesPage(page);
  };

  const salesSlice = allSales.slice(salesPage * perPage, (salesPage + 1) * perPage);

  const tabs: { key: DashboardTab; label: string }[] = [
    { key: "sales", label: "Sales Data" },
    { key: "costs", label: "Product Costs" },
    { key: "taxes", label: "Regional Taxes" },
  ];

  return (
    <div>
      {/* Quick Stats card */}
      <div style={{ background: "rgba(26,147,56,0.04)", border: "1px solid rgba(26,147,56,0.2)", borderRadius: 12, padding: 16, marginBottom: 24 }}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs" style={{ color: "#1a9338", textTransform: "uppercase", letterSpacing: "0.05em" }}>Quick Stats</p>
            <p className="text-sm" style={{ color: "rgba(38,38,38,0.7)", marginTop: 4 }}>
              Total Profit: {pageData.targetProduct} / {pageData.targetRegion}
            </p>
          </div>
          <p className="text-2xl font-bold font-mono" style={{ color: "#1a9338" }} {...testAttr('quick-stats')}>
            ${pageData.quickStatsTotal.toFixed(2)}
          </p>
        </div>
      </div>

      {/* Tab buttons */}
      <div className="flex" style={{ gap: 4, marginBottom: 16, borderBottom: "1px solid #e8e8e8" }}>
        {tabs.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => handleTabChange(key)}
            className="text-sm font-medium"
            style={{
              padding: "8px 16px",
              background: "none",
              border: "none",
              cursor: "pointer",
              ...(activeTab === key
                ? { color: "#fa5d19", borderBottom: "2px solid #fa5d19" }
                : { color: "rgba(38,38,38,0.5)" }),
            }}
            {...testAttr('dashboard-tab', key)}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Sales Tab */}
      {activeTab === "sales" && (
        <div style={{ marginBottom: 24 }}>
          <div className="card-surface overflow-x-auto" style={{ borderRadius: 12, overflow: "hidden" }}>
            <table className="w-full text-sm" {...testAttr('table', 'sales')}>
              <thead>
                <tr style={{ background: "#f3f3f3" }}>
                  <th className="text-left font-medium" style={{ padding: "8px 12px", color: "rgba(38,38,38,0.5)" }}>ID</th>
                  <th className="text-left font-medium" style={{ padding: "8px 12px", color: "rgba(38,38,38,0.5)" }}>Region</th>
                  <th className="text-left font-medium" style={{ padding: "8px 12px", color: "rgba(38,38,38,0.5)" }}>Product</th>
                  <th className="text-right font-medium" style={{ padding: "8px 12px", color: "rgba(38,38,38,0.5)" }}>Revenue</th>
                  <th className="text-right font-medium" style={{ padding: "8px 12px", color: "rgba(38,38,38,0.5)" }}>Units</th>
                  <th className="text-left font-medium" style={{ padding: "8px 12px", color: "rgba(38,38,38,0.5)" }}>Quarter</th>
                </tr>
              </thead>
              <tbody>
                {loadingPage ? (
                  <tr>
                    <td colSpan={6} style={{ padding: "32px 12px", textAlign: "center", color: "rgba(38,38,38,0.5)" }}>
                      <div className="animate-spin" style={{ display: "inline-block", width: 24, height: 24, borderRadius: "50%", borderBottom: "2px solid #fa5d19", marginRight: 8 }} />
                      Loading...
                    </td>
                  </tr>
                ) : (
                  salesSlice.map((row) => (
                    <tr key={row.id} style={{ borderTop: "1px solid #e8e8e8" }} {...testAttr('sale-id', row.id)}>
                      <td className="font-mono text-xs" style={{ padding: "8px 12px" }}>{row.id}</td>
                      <td style={{ padding: "8px 12px" }} {...testAttr('region')}>{row.region}</td>
                      <td style={{ padding: "8px 12px" }} {...testAttr('product')}>{row.product}</td>
                      <td className="text-right font-mono" style={{ padding: "8px 12px" }} {...testAttr('revenue')}>${row.revenue.toFixed(2)}</td>
                      <td className="text-right" style={{ padding: "8px 12px" }} {...testAttr('units')}>{row.units}</td>
                      <td style={{ padding: "8px 12px", color: "rgba(38,38,38,0.5)" }} {...testAttr('quarter')}>{row.quarter}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between" style={{ marginTop: 12 }}>
            <p className="text-xs" style={{ color: "rgba(38,38,38,0.35)" }}>
              Page {salesPage + 1} of {totalPages} ({totalSales} total rows)
            </p>
            <div className="flex" style={{ gap: 8 }}>
              <button
                onClick={() => handleSalesPageChange(Math.max(0, salesPage - 1))}
                disabled={salesPage === 0}
                className="btn-ghost text-sm"
                style={{ padding: "4px 12px", borderRadius: 6 }}
                {...testAttr('page-prev')}
              >
                Previous
              </button>
              <button
                onClick={() => handleSalesPageChange(Math.min(totalPages - 1, salesPage + 1))}
                disabled={salesPage === totalPages - 1}
                className="btn-ghost text-sm"
                style={{ padding: "4px 12px", borderRadius: 6 }}
                {...testAttr('page-next')}
              >
                Next
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Costs Tab */}
      {activeTab === "costs" && (
        <div style={{ marginBottom: 24 }}>
          {loadingTab ? (
            <div className="flex items-center justify-center" style={{ padding: "32px 0" }}>
              <div className="animate-spin" style={{ width: 24, height: 24, borderRadius: "50%", borderBottom: "2px solid #fa5d19" }} />
              <span className="text-sm" style={{ marginLeft: 12, color: "rgba(38,38,38,0.5)" }}>Loading costs...</span>
            </div>
          ) : (
            <div className="card-surface overflow-x-auto" style={{ borderRadius: 12, overflow: "hidden" }}>
              <table className="w-full text-sm" {...testAttr('table', 'costs')}>
                <thead>
                  <tr style={{ background: "#f3f3f3" }}>
                    <th className="text-left font-medium" style={{ padding: "8px 12px", color: "rgba(38,38,38,0.5)" }}>Product</th>
                    <th className="text-right font-medium" style={{ padding: "8px 12px", color: "rgba(38,38,38,0.5)" }}>Cost/Unit</th>
                    <th className="text-right font-medium" style={{ padding: "8px 12px", color: "rgba(38,38,38,0.5)" }}>Shipping</th>
                  </tr>
                </thead>
                <tbody>
                  {costs.map((row) => (
                    <tr key={row.product} style={{ borderTop: "1px solid #e8e8e8" }} {...testAttr('cost-product', row.product)}>
                      <td style={{ padding: "8px 12px" }}>{row.product}</td>
                      <td className="text-right font-mono" style={{ padding: "8px 12px" }} {...testAttr('cost-per-unit')}>${row.costPerUnit.toFixed(2)}</td>
                      <td className="text-right font-mono" style={{ padding: "8px 12px" }} {...testAttr('shipping')}>${row.shipping.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Taxes Tab */}
      {activeTab === "taxes" && (
        <div style={{ marginBottom: 24 }}>
          {loadingTab ? (
            <div className="flex items-center justify-center" style={{ padding: "32px 0" }}>
              <div className="animate-spin" style={{ width: 24, height: 24, borderRadius: "50%", borderBottom: "2px solid #fa5d19" }} />
              <span className="text-sm" style={{ marginLeft: 12, color: "rgba(38,38,38,0.5)" }}>Loading taxes...</span>
            </div>
          ) : (
            <div className="card-surface overflow-x-auto" style={{ borderRadius: 12, overflow: "hidden" }}>
              <table className="w-full text-sm" {...testAttr('table', 'taxes')}>
                <thead>
                  <tr style={{ background: "#f3f3f3" }}>
                    <th className="text-left font-medium" style={{ padding: "8px 12px", color: "rgba(38,38,38,0.5)" }}>Region</th>
                    <th className="text-right font-medium" style={{ padding: "8px 12px", color: "rgba(38,38,38,0.5)" }}>Tax Rate</th>
                  </tr>
                </thead>
                <tbody>
                  {taxes.map((row) => (
                    <tr key={row.region} style={{ borderTop: "1px solid #e8e8e8" }} {...testAttr('tax-region', row.region)}>
                      <td style={{ padding: "8px 12px" }}>{row.region}</td>
                      <td className="text-right font-mono" style={{ padding: "8px 12px" }} {...testAttr('tax-rate')}>{row.taxRate}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Answer input */}
      <div>
        <label className="text-sm" style={{ display: "block", color: "rgba(38,38,38,0.5)", marginBottom: 8 }}>Total Profit</label>
        <input
          type="text"
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          placeholder="Enter the total profit..."
          style={{ width: "100%", maxWidth: 448, padding: "8px 16px", background: "#fff", border: "1px solid #d1d1d1", borderRadius: 8, color: "#262626", outline: "none" }}
        />
      </div>
    </div>
  );
}
