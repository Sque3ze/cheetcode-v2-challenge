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
      <div className="bg-gradient-to-r from-emerald-900/30 to-teal-900/30 rounded-xl border border-emerald-500/30 p-4 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-emerald-400 uppercase tracking-wider">Quick Stats</p>
            <p className="text-sm text-gray-300 mt-1">
              Total Profit: {pageData.targetProduct} / {pageData.targetRegion}
            </p>
          </div>
          <p className="text-2xl font-bold font-mono text-emerald-300" {...testAttr('quick-stats')}>
            ${pageData.quickStatsTotal.toFixed(2)}
          </p>
        </div>
      </div>

      {/* Tab buttons */}
      <div className="flex gap-1 mb-4 border-b border-gray-800">
        {tabs.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => handleTabChange(key)}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === key
                ? "text-blue-400 border-b-2 border-blue-400"
                : "text-gray-500 hover:text-gray-300"
            }`}
            {...testAttr('dashboard-tab', key)}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Sales Tab */}
      {activeTab === "sales" && (
        <div className="mb-6">
          <div className="overflow-x-auto rounded-lg border border-gray-800">
            <table className="w-full text-sm" {...testAttr('table', 'sales')}>
              <thead>
                <tr className="bg-gray-900">
                  <th className="px-3 py-2 text-left text-gray-400 font-medium">ID</th>
                  <th className="px-3 py-2 text-left text-gray-400 font-medium">Region</th>
                  <th className="px-3 py-2 text-left text-gray-400 font-medium">Product</th>
                  <th className="px-3 py-2 text-right text-gray-400 font-medium">Revenue</th>
                  <th className="px-3 py-2 text-right text-gray-400 font-medium">Units</th>
                  <th className="px-3 py-2 text-left text-gray-400 font-medium">Quarter</th>
                </tr>
              </thead>
              <tbody>
                {loadingPage ? (
                  <tr>
                    <td colSpan={6} className="px-3 py-8 text-center text-gray-400">
                      <div className="animate-spin inline-block rounded-full h-6 w-6 border-b-2 border-blue-400 mr-2" />
                      Loading...
                    </td>
                  </tr>
                ) : (
                  salesSlice.map((row) => (
                    <tr key={row.id} className="border-t border-gray-800" {...testAttr('sale-id', row.id)}>
                      <td className="px-3 py-2 font-mono text-xs">{row.id}</td>
                      <td className="px-3 py-2" {...testAttr('region')}>{row.region}</td>
                      <td className="px-3 py-2" {...testAttr('product')}>{row.product}</td>
                      <td className="px-3 py-2 text-right font-mono" {...testAttr('revenue')}>${row.revenue.toFixed(2)}</td>
                      <td className="px-3 py-2 text-right" {...testAttr('units')}>{row.units}</td>
                      <td className="px-3 py-2 text-gray-400" {...testAttr('quarter')}>{row.quarter}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between mt-3">
            <p className="text-xs text-gray-500">
              Page {salesPage + 1} of {totalPages} ({totalSales} total rows)
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => handleSalesPageChange(Math.max(0, salesPage - 1))}
                disabled={salesPage === 0}
                className="px-3 py-1 text-sm bg-gray-800 rounded disabled:opacity-30 hover:bg-gray-700 transition-colors"
                {...testAttr('page-prev')}
              >
                Previous
              </button>
              <button
                onClick={() => handleSalesPageChange(Math.min(totalPages - 1, salesPage + 1))}
                disabled={salesPage === totalPages - 1}
                className="px-3 py-1 text-sm bg-gray-800 rounded disabled:opacity-30 hover:bg-gray-700 transition-colors"
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
        <div className="mb-6">
          {loadingTab ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-400" />
              <span className="ml-3 text-sm text-gray-400">Loading costs...</span>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-gray-800">
              <table className="w-full text-sm" {...testAttr('table', 'costs')}>
                <thead>
                  <tr className="bg-gray-900">
                    <th className="px-3 py-2 text-left text-gray-400 font-medium">Product</th>
                    <th className="px-3 py-2 text-right text-gray-400 font-medium">Cost/Unit</th>
                    <th className="px-3 py-2 text-right text-gray-400 font-medium">Shipping</th>
                  </tr>
                </thead>
                <tbody>
                  {costs.map((row) => (
                    <tr key={row.product} className="border-t border-gray-800" {...testAttr('cost-product', row.product)}>
                      <td className="px-3 py-2">{row.product}</td>
                      <td className="px-3 py-2 text-right font-mono" {...testAttr('cost-per-unit')}>${row.costPerUnit.toFixed(2)}</td>
                      <td className="px-3 py-2 text-right font-mono" {...testAttr('shipping')}>${row.shipping.toFixed(2)}</td>
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
        <div className="mb-6">
          {loadingTab ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-400" />
              <span className="ml-3 text-sm text-gray-400">Loading taxes...</span>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-gray-800">
              <table className="w-full text-sm" {...testAttr('table', 'taxes')}>
                <thead>
                  <tr className="bg-gray-900">
                    <th className="px-3 py-2 text-left text-gray-400 font-medium">Region</th>
                    <th className="px-3 py-2 text-right text-gray-400 font-medium">Tax Rate</th>
                  </tr>
                </thead>
                <tbody>
                  {taxes.map((row) => (
                    <tr key={row.region} className="border-t border-gray-800" {...testAttr('tax-region', row.region)}>
                      <td className="px-3 py-2">{row.region}</td>
                      <td className="px-3 py-2 text-right font-mono" {...testAttr('tax-rate')}>{row.taxRate}%</td>
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
        <label className="block text-sm text-gray-400 mb-2">Total Profit</label>
        <input
          type="text"
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          placeholder="Enter the total profit..."
          className="w-full max-w-md px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-gray-100 placeholder-gray-500 focus:outline-none focus:border-blue-500"
        />
      </div>
    </div>
  );
}
