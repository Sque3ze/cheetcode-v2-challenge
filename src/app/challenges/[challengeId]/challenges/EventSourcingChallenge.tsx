"use client";

import { useState, useEffect, MutableRefObject } from "react";
import { testAttr } from "../../../../lib/test-attrs";
import { useInteract } from "../../../../lib/use-interact";

interface OrderItem {
  itemId: string;
  name: string;
  quantity: number;
  unitPrice: number;
}

interface Discount {
  id: string;
  label: string;
  amount: number;
}

interface Snapshot {
  orderId: string;
  items: OrderItem[];
  discounts: Discount[];
  status: string;
  shippingAddress: string;
  snapshotEventId: number;
  totalEvents: number;
}

interface EventEntry {
  eventId: number;
  type: string;
  timestamp: string;
  payload: Record<string, unknown>;
}

interface EventSourcingPageData {
  snapshot: Snapshot;
  question: string;
  variantIndex: number;
}

interface Props {
  pageData: EventSourcingPageData;
  answerRef: MutableRefObject<string>;
  sessionId: string;
  challengeId: string;
  renderToken: string;
}

const EVENT_TYPE_COLORS: Record<string, { bg: string; color: string }> = {
  item_added: { bg: "rgba(26,147,56,0.1)", color: "#1a9338" },
  item_removed: { bg: "rgba(220,38,38,0.1)", color: "#dc2626" },
  quantity_changed: { bg: "rgba(234,179,8,0.1)", color: "#a16207" },
  discount_applied: { bg: "rgba(144,97,255,0.1)", color: "#9061ff" },
  discount_removed: { bg: "rgba(220,38,38,0.1)", color: "#dc2626" },
  status_changed: { bg: "rgba(59,130,246,0.1)", color: "#2563eb" },
  address_updated: { bg: "rgba(38,38,38,0.08)", color: "rgba(38,38,38,0.7)" },
};

export default function EventSourcingChallenge({ pageData, answerRef, sessionId, challengeId, renderToken }: Props) {
  const [answer, setAnswer] = useState("");
  const [eventPages, setEventPages] = useState<Record<number, EventEntry[]>>({});
  const [loadingPage, setLoadingPage] = useState<number | null>(null);
  const interact = useInteract(challengeId, sessionId, renderToken);

  useEffect(() => {
    answerRef.current = answer;
  }, [answer, answerRef]);

  const loadEvents = async (page: number) => {
    setLoadingPage(page);
    try {
      const result = await interact("events", { page }) as { page: number; totalPages: number; events: EventEntry[] };
      if (result?.events) {
        setEventPages((prev) => ({ ...prev, [page]: result.events }));
      }
    } catch (err) {
      console.error("Failed to load events:", err);
    } finally {
      setLoadingPage(null);
    }
  };

  const { snapshot } = pageData;
  const remainingEvents = snapshot.totalEvents - snapshot.snapshotEventId;
  const totalPages = Math.ceil(remainingEvents / 4);
  const loadedPages = Object.keys(eventPages).length;
  const allEventsLoaded = loadedPages === totalPages;

  // Collect all loaded events sorted by eventId
  const allEvents = Object.values(eventPages)
    .flat()
    .sort((a, b) => a.eventId - b.eventId);

  return (
    <div>
      {/* Stale snapshot warning */}
      <div style={{ background: "rgba(234,179,8,0.06)", border: "1px solid rgba(234,179,8,0.3)", borderRadius: 12, padding: 16, marginBottom: 24 }}>
        <div className="flex items-center" style={{ gap: 8, marginBottom: 12 }}>
          <p className="text-xs font-bold" style={{ color: "#a16207", textTransform: "uppercase", letterSpacing: "0.05em" }}>
            Stale Snapshot
          </p>
          <span className="text-xs" style={{ padding: "1px 6px", borderRadius: 4, background: "rgba(234,179,8,0.15)", color: "#a16207" }}>
            As of event #{snapshot.snapshotEventId} — {remainingEvents} events pending
          </span>
        </div>

        {/* Order info */}
        <div className="flex" style={{ gap: 16, marginBottom: 12, flexWrap: "wrap" }}>
          <div>
            <p className="text-xs" style={{ color: "rgba(38,38,38,0.5)" }}>Order ID</p>
            <p className="font-mono font-bold text-sm" style={{ color: "#262626" }} {...testAttr("order-id")}>{snapshot.orderId}</p>
          </div>
          <div>
            <p className="text-xs" style={{ color: "rgba(38,38,38,0.5)" }}>Status</p>
            <p className="font-mono font-bold text-sm" style={{ color: "#262626" }} {...testAttr("snapshot-status")}>{snapshot.status}</p>
          </div>
          <div>
            <p className="text-xs" style={{ color: "rgba(38,38,38,0.5)" }}>Address</p>
            <p className="text-xs" style={{ color: "rgba(38,38,38,0.7)" }}>{snapshot.shippingAddress}</p>
          </div>
        </div>

        {/* Items table */}
        <p className="text-xs font-medium" style={{ color: "rgba(38,38,38,0.5)", marginBottom: 6 }}>Items ({snapshot.items.length})</p>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, marginBottom: 12 }}>
          <thead>
            <tr>
              <th style={{ textAlign: "left", padding: "3px 6px", color: "rgba(38,38,38,0.5)", borderBottom: "1px solid rgba(234,179,8,0.2)" }}>ID</th>
              <th style={{ textAlign: "left", padding: "3px 6px", color: "rgba(38,38,38,0.5)", borderBottom: "1px solid rgba(234,179,8,0.2)" }}>Name</th>
              <th style={{ textAlign: "right", padding: "3px 6px", color: "rgba(38,38,38,0.5)", borderBottom: "1px solid rgba(234,179,8,0.2)" }}>Qty</th>
              <th style={{ textAlign: "right", padding: "3px 6px", color: "rgba(38,38,38,0.5)", borderBottom: "1px solid rgba(234,179,8,0.2)" }}>Unit Price</th>
              <th style={{ textAlign: "right", padding: "3px 6px", color: "rgba(38,38,38,0.5)", borderBottom: "1px solid rgba(234,179,8,0.2)" }}>Line Total</th>
            </tr>
          </thead>
          <tbody>
            {snapshot.items.map((item) => (
              <tr key={item.itemId} {...testAttr("snapshot-item", item.itemId)}>
                <td className="font-mono" style={{ padding: "3px 6px", color: "rgba(38,38,38,0.5)", borderBottom: "1px solid #f3f3f3" }}>{item.itemId}</td>
                <td style={{ padding: "3px 6px", color: "#262626", borderBottom: "1px solid #f3f3f3" }}>{item.name}</td>
                <td className="font-mono" style={{ textAlign: "right", padding: "3px 6px", color: "#262626", borderBottom: "1px solid #f3f3f3" }}>{item.quantity}</td>
                <td className="font-mono" style={{ textAlign: "right", padding: "3px 6px", color: "#262626", borderBottom: "1px solid #f3f3f3" }}>${item.unitPrice.toFixed(2)}</td>
                <td className="font-mono" style={{ textAlign: "right", padding: "3px 6px", color: "#262626", borderBottom: "1px solid #f3f3f3" }}>${(item.quantity * item.unitPrice).toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Discounts */}
        {snapshot.discounts.length > 0 && (
          <>
            <p className="text-xs font-medium" style={{ color: "rgba(38,38,38,0.5)", marginBottom: 6 }}>Discounts ({snapshot.discounts.length})</p>
            <div className="flex flex-wrap" style={{ gap: 6, marginBottom: 12 }}>
              {snapshot.discounts.map((d) => (
                <span key={d.id} className="text-xs font-mono" style={{ padding: "2px 8px", background: "rgba(144,97,255,0.08)", borderRadius: 4, color: "#9061ff" }} {...testAttr("snapshot-discount", d.id)}>
                  {d.label}: -${d.amount.toFixed(2)}
                </span>
              ))}
            </div>
          </>
        )}

        {/* Snapshot totals */}
        <div className="flex" style={{ gap: 16 }}>
          <div>
            <p className="text-xs" style={{ color: "rgba(38,38,38,0.5)" }}>Snapshot Subtotal</p>
            <p className="font-mono font-bold" style={{ color: "#262626" }} {...testAttr("snapshot-subtotal")}>
              ${snapshot.items.reduce((sum, i) => sum + i.quantity * i.unitPrice, 0).toFixed(2)}
            </p>
          </div>
          <div>
            <p className="text-xs" style={{ color: "rgba(38,38,38,0.5)" }}>Snapshot Total</p>
            <p className="font-mono font-bold" style={{ color: "#262626" }} {...testAttr("snapshot-total")}>
              ${(snapshot.items.reduce((sum, i) => sum + i.quantity * i.unitPrice, 0) - snapshot.discounts.reduce((sum, d) => sum + d.amount, 0)).toFixed(2)}
            </p>
          </div>
        </div>
      </div>

      {/* Question */}
      <div className="card-surface" style={{ borderRadius: 12, padding: 16, marginBottom: 24, border: "1px solid rgba(250,93,25,0.2)", background: "rgba(250,93,25,0.03)" }}>
        <p className="text-xs font-medium" style={{ color: "#fa5d19", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>Question</p>
        <p className="text-sm" style={{ color: "#262626" }} {...testAttr("question")}>{pageData.question}</p>
      </div>

      {/* Event log loader */}
      <div className="flex items-center justify-between" style={{ marginBottom: 12 }}>
        <h4 className="text-sm font-medium" style={{ color: "rgba(38,38,38,0.5)" }}>Event Log</h4>
        <p className="text-xs" style={{ color: "rgba(38,38,38,0.4)" }}>
          {loadedPages} of {totalPages} pages loaded
          {allEventsLoaded && <span style={{ color: "#1a9338", marginLeft: 8 }}>All events loaded</span>}
        </p>
      </div>

      {/* Page load buttons */}
      <div className="flex" style={{ gap: 8, marginBottom: 16 }}>
        {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
          const isLoaded = !!eventPages[page];
          const isLoading = loadingPage === page;
          return (
            <button
              key={page}
              onClick={() => !isLoaded && loadEvents(page)}
              disabled={isLoaded || isLoading}
              className="text-xs font-medium"
              style={{
                padding: "6px 16px",
                borderRadius: 6,
                border: "none",
                background: isLoaded ? "rgba(26,147,56,0.08)" : "rgba(250,93,25,0.08)",
                color: isLoaded ? "#1a9338" : "#fa5d19",
                cursor: isLoaded || isLoading ? "default" : "pointer",
              }}
              {...testAttr("load-events-btn", String(page))}
            >
              {isLoading ? "Loading..." : isLoaded ? `Page ${page} Loaded` : `Load Page ${page}`}
            </button>
          );
        })}
      </div>

      {/* Event list */}
      {allEvents.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 24 }}>
          {allEvents.map((event) => {
            const colors = EVENT_TYPE_COLORS[event.type] ?? { bg: "rgba(38,38,38,0.05)", color: "rgba(38,38,38,0.6)" };
            return (
              <div
                key={event.eventId}
                className="flex items-start"
                style={{
                  padding: "8px 12px",
                  borderRadius: 8,
                  background: colors.bg,
                  border: `1px solid ${colors.color}20`,
                  gap: 10,
                }}
                {...testAttr("event", String(event.eventId))}
              >
                <span className="font-mono text-xs" style={{ color: "rgba(38,38,38,0.4)", minWidth: 24 }}>#{event.eventId}</span>
                <span className="text-xs font-bold" style={{ color: colors.color, minWidth: 130 }}>{event.type}</span>
                <span className="text-xs font-mono" style={{ color: "rgba(38,38,38,0.7)", flex: 1 }}>
                  {Object.entries(event.payload).map(([k, v]) => `${k}: ${JSON.stringify(v)}`).join(", ")}
                </span>
                <span className="text-xs font-mono" style={{ color: "rgba(38,38,38,0.4)", whiteSpace: "nowrap" }}>
                  {event.timestamp.split("T")[1]?.replace("Z", "")}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {/* Answer input */}
      <div>
        <label className="text-sm" style={{ display: "block", color: "rgba(38,38,38,0.5)", marginBottom: 8 }}>
          Final Answer
        </label>
        <input
          type="text"
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          placeholder={allEventsLoaded ? "Enter your answer..." : "Load all event pages first..."}
          style={{ width: "100%", maxWidth: 448, padding: "8px 16px", background: "#fff", border: "1px solid #d1d1d1", borderRadius: 8, color: "#262626", outline: "none" }}
        />
      </div>
    </div>
  );
}
