"use client";

import { useState, useEffect, MutableRefObject } from "react";
import { testAttr } from "../../../../lib/test-attrs";
import { useInteract } from "../../../../lib/use-interact";

interface ProductInfo {
  name: string;
  category: string;
  specs: string[];
  vendorProfile: string;
}

interface MarketData {
  avgMarketPrice: number;
  priceRange: { low: number; high: number };
  recentSales: Array<{ price: number; date: string }>;
}

interface BidEntry {
  amount: number;
  result: "accepted" | "rejected" | "error";
  message: string;
}

interface PriceNegotiatorPageData {
  product: ProductInfo;
  minBid: number;
  maxBid: number;
}

interface Props {
  pageData: PriceNegotiatorPageData;
  answerRef: MutableRefObject<string>;
  sessionId: string;
  challengeId: string;
  renderToken: string;
}

export default function PriceNegotiatorChallenge({ pageData, answerRef, sessionId, challengeId, renderToken }: Props) {
  const [answer, setAnswer] = useState("");
  const [bidAmount, setBidAmount] = useState("");
  const [bidHistory, setBidHistory] = useState<BidEntry[]>([]);
  const [marketData, setMarketData] = useState<MarketData | null>(null);
  const [loadingBid, setLoadingBid] = useState(false);
  const [loadingIntel, setLoadingIntel] = useState(false);
  const interact = useInteract(challengeId, sessionId, renderToken);

  useEffect(() => {
    answerRef.current = answer;
  }, [answer, answerRef]);

  const submitBid = async () => {
    const amount = parseInt(bidAmount, 10);
    if (isNaN(amount)) return;
    setLoadingBid(true);
    try {
      const result = await interact("bid", { amount }) as { result: string; message: string };
      setBidHistory((prev) => [
        { amount, result: result.result as BidEntry["result"], message: result.message },
        ...prev,
      ]);
    } catch (err) {
      setBidHistory((prev) => [
        { amount, result: "error", message: "Bid failed" },
        ...prev,
      ]);
    } finally {
      setLoadingBid(false);
      setBidAmount("");
    }
  };

  const fetchMarketIntel = async () => {
    setLoadingIntel(true);
    try {
      const result = await interact("market_intel") as { marketData: MarketData };
      if (result?.marketData) setMarketData(result.marketData);
    } catch (err) {
      console.error("Failed to fetch market intel:", err);
    } finally {
      setLoadingIntel(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !loadingBid) submitBid();
  };

  return (
    <div>
      {/* Product card */}
      <div className="card-surface" style={{ borderRadius: 12, padding: 16, marginBottom: 24 }}>
        <div className="flex items-start justify-between" style={{ marginBottom: 12 }}>
          <div>
            <h3 className="font-medium" style={{ color: "#262626" }} {...testAttr("product-name")}>{pageData.product.name}</h3>
            <p className="text-xs" style={{ color: "rgba(38,38,38,0.5)", marginTop: 2 }}>{pageData.product.category}</p>
          </div>
          <div className="text-right">
            <p className="text-xs" style={{ color: "rgba(38,38,38,0.5)" }}>Budget Range</p>
            <p className="font-mono font-bold" style={{ color: "#262626" }} {...testAttr("bid-range")}>
              ${pageData.minBid} – ${pageData.maxBid}
            </p>
          </div>
        </div>

        <div style={{ marginBottom: 12 }}>
          <p className="text-xs" style={{ color: "rgba(38,38,38,0.5)", marginBottom: 4 }}>Specifications</p>
          <div className="flex flex-wrap" style={{ gap: 6 }}>
            {pageData.product.specs.map((spec, i) => (
              <span
                key={i}
                className="text-xs"
                style={{ padding: "2px 8px", background: "#f3f3f3", borderRadius: 4, color: "rgba(38,38,38,0.7)" }}
                {...testAttr("spec", String(i))}
              >
                {spec}
              </span>
            ))}
          </div>
        </div>

        <p className="text-xs" style={{ color: "rgba(38,38,38,0.5)", fontStyle: "italic" }} {...testAttr("vendor-profile")}>
          {pageData.product.vendorProfile}
        </p>
      </div>

      {/* Market Intelligence section */}
      <div className="card-surface" style={{ borderRadius: 12, padding: 16, marginBottom: 24 }}>
        <div className="flex items-center justify-between" style={{ marginBottom: marketData ? 12 : 0 }}>
          <h4 className="text-sm font-medium" style={{ color: "#9061ff" }}>Market Intelligence</h4>
          {!marketData && (
            <button
              onClick={fetchMarketIntel}
              disabled={loadingIntel}
              className="text-xs font-medium"
              style={{ padding: "4px 12px", borderRadius: 6, border: "1px solid rgba(144,97,255,0.3)", background: "rgba(144,97,255,0.06)", color: "#9061ff", cursor: loadingIntel ? "default" : "pointer" }}
              {...testAttr("market-intel-btn")}
            >
              {loadingIntel ? "Loading..." : "Request Intel"}
            </button>
          )}
        </div>

        {marketData && (
          <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }} {...testAttr("market-data")}>
            <div>
              <p className="text-xs" style={{ color: "rgba(38,38,38,0.5)" }}>Avg Market Price</p>
              <p className="font-mono font-bold text-sm" style={{ color: "#262626" }}>${marketData.avgMarketPrice}</p>
            </div>
            <div>
              <p className="text-xs" style={{ color: "rgba(38,38,38,0.5)" }}>Price Range</p>
              <p className="font-mono font-bold text-sm" style={{ color: "#262626" }}>${marketData.priceRange.low} – ${marketData.priceRange.high}</p>
            </div>
            <div>
              <p className="text-xs" style={{ color: "rgba(38,38,38,0.5)" }}>Recent Sales</p>
              <div className="flex flex-wrap" style={{ gap: 4, marginTop: 2 }}>
                {marketData.recentSales.map((sale, i) => (
                  <span key={i} className="text-xs font-mono" style={{ padding: "1px 6px", background: "#f3f3f3", borderRadius: 3, color: "rgba(38,38,38,0.7)" }}>
                    ${sale.price}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Bid input */}
      <div style={{ marginBottom: 24 }}>
        <h4 className="text-sm font-medium" style={{ color: "rgba(38,38,38,0.5)", marginBottom: 8 }}>Submit Bid</h4>
        <div className="flex" style={{ gap: 8, maxWidth: 448 }}>
          <div style={{ position: "relative", flex: 1 }}>
            <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "rgba(38,38,38,0.35)", fontSize: 14 }}>$</span>
            <input
              type="number"
              value={bidAmount}
              onChange={(e) => setBidAmount(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Enter integer amount..."
              style={{ width: "100%", padding: "8px 16px 8px 24px", background: "#fff", border: "1px solid #d1d1d1", borderRadius: 8, color: "#262626", outline: "none" }}
              {...testAttr("bid-input")}
            />
          </div>
          <button
            onClick={submitBid}
            disabled={loadingBid || !bidAmount}
            className="text-sm font-medium"
            style={{
              padding: "8px 20px",
              borderRadius: 8,
              border: "none",
              background: loadingBid ? "rgba(250,93,25,0.3)" : "#fa5d19",
              color: "#fff",
              cursor: loadingBid || !bidAmount ? "default" : "pointer",
              whiteSpace: "nowrap",
            }}
            {...testAttr("submit-bid")}
          >
            {loadingBid ? "Bidding..." : "Submit Bid"}
          </button>
        </div>
      </div>

      {/* Bid history */}
      {bidHistory.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <h4 className="text-sm font-medium" style={{ color: "rgba(38,38,38,0.5)", marginBottom: 8 }}>Bid History ({bidHistory.length} bids)</h4>
          <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 300, overflowY: "auto" }}>
            {bidHistory.map((bid, i) => (
              <div
                key={i}
                className="flex items-center justify-between text-sm"
                style={{
                  padding: "8px 12px",
                  borderRadius: 8,
                  background: bid.result === "accepted" ? "rgba(26,147,56,0.04)" : bid.result === "rejected" ? "rgba(220,38,38,0.04)" : "rgba(0,0,0,0.02)",
                  border: `1px solid ${bid.result === "accepted" ? "rgba(26,147,56,0.2)" : bid.result === "rejected" ? "rgba(220,38,38,0.2)" : "#e8e8e8"}`,
                }}
                {...testAttr("bid-result", String(i))}
              >
                <div className="flex items-center" style={{ gap: 8 }}>
                  <span
                    className="font-mono font-bold"
                    style={{ color: bid.result === "accepted" ? "#1a9338" : bid.result === "rejected" ? "#dc2626" : "rgba(38,38,38,0.5)" }}
                  >
                    ${bid.amount}
                  </span>
                  <span
                    className="text-xs font-medium"
                    style={{
                      padding: "1px 6px",
                      borderRadius: 4,
                      background: bid.result === "accepted" ? "rgba(26,147,56,0.1)" : bid.result === "rejected" ? "rgba(220,38,38,0.1)" : "#f3f3f3",
                      color: bid.result === "accepted" ? "#1a9338" : bid.result === "rejected" ? "#dc2626" : "rgba(38,38,38,0.5)",
                    }}
                  >
                    {bid.result}
                  </span>
                </div>
                <span className="text-xs" style={{ color: "rgba(38,38,38,0.5)" }}>{bid.message}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Answer input */}
      <div>
        <label className="text-sm" style={{ display: "block", color: "rgba(38,38,38,0.5)", marginBottom: 8 }}>Vendor&apos;s Floor Price (exact minimum)</label>
        <input
          type="text"
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          placeholder="Enter the exact floor price..."
          style={{ width: "100%", maxWidth: 448, padding: "8px 16px", background: "#fff", border: "1px solid #d1d1d1", borderRadius: 8, color: "#262626", outline: "none" }}
        />
      </div>
    </div>
  );
}
