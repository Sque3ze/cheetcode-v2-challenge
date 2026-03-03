"use client";

import { useState, useEffect, MutableRefObject } from "react";
import { testAttr } from "../../../../lib/test-attrs";
import { useInteract } from "../../../../lib/use-interact";

interface CardData {
  id: number;
  name: string;
  category: string;
  price: number;
}

interface CardDetails {
  sku: string;
  supplier: string;
}

interface ModalInteractionPageData {
  cards: CardData[];
  targetCondition: string;
  targetField: string;
  targetCategory: string;
  modalLoadDelay?: number;
}

interface Props {
  pageData: ModalInteractionPageData;
  answerRef: MutableRefObject<string>;
  sessionId: string;
  challengeId: string;
  renderToken: string;
}

export default function ModalInteractionChallenge({ pageData, answerRef, sessionId, challengeId, renderToken }: Props) {
  const [openCard, setOpenCard] = useState<CardData | null>(null);
  const [cardDetails, setCardDetails] = useState<CardDetails | null>(null);
  const [modalLoaded, setModalLoaded] = useState(false);
  const [modalTab, setModalTab] = useState<"overview" | "details">("overview");
  const [answer, setAnswer] = useState("");
  const [detailsCache, setDetailsCache] = useState<Record<number, CardDetails>>({});
  const interact = useInteract(challengeId, sessionId, renderToken);

  useEffect(() => {
    answerRef.current = answer;
  }, [answer, answerRef]);

  // Fetch card details when modal opens
  useEffect(() => {
    if (!openCard) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- Intentional state reset when modal closes
      setModalLoaded(false);
      setModalTab("overview");
      setCardDetails(null);
      return;
    }

    // Check cache first
    if (detailsCache[openCard.id]) {
      setCardDetails(detailsCache[openCard.id]);
      setModalLoaded(true);
      return;
    }

    // Fetch via interact
    setModalLoaded(false);
    interact("modal", { cardId: openCard.id })
      .then((result) => {
        const details = result as CardDetails;
        if (details) {
          setCardDetails(details);
          setDetailsCache(prev => ({ ...prev, [openCard.id]: details }));
        }
        setModalLoaded(true);
      })
      .catch((err) => {
        console.error("Failed to load card details:", err);
        setModalLoaded(true);
      });
  }, [openCard, interact, detailsCache]);

  return (
    <div>
      {/* Card grid */}
      <div className="grid grid-cols-1 md:grid-cols-3" style={{ gap: 16, marginBottom: 24 }}>
        {pageData.cards.map((card) => (
          <div
            key={card.id}
            className="card-surface"
            style={{ borderRadius: 12, padding: 16 }}
            {...testAttr('card-category', card.category)}
          >
            <h3 className="font-medium" style={{ marginBottom: 4 }}>{card.name}</h3>
            <p className="text-sm" style={{ color: "rgba(38,38,38,0.5)", marginBottom: 4 }} {...testAttr('category-label')}>{card.category}</p>
            <p className="text-sm font-mono" style={{ marginBottom: 12 }} {...testAttr('card-price')}>${card.price.toFixed(2)}</p>
            <button
              onClick={() => setOpenCard(card)}
              className="text-sm"
              style={{ color: "#fa5d19", background: "none", border: "none", padding: 0, cursor: "pointer" }}
              {...testAttr('card-name', card.name)}
            >
              View Details
            </button>
          </div>
        ))}
      </div>

      {/* Modal with async loading + tabs */}
      {openCard && (
        <div
          className="fixed inset-0 flex items-center justify-center z-50"
          style={{ background: "rgba(0,0,0,0.5)" }}
          onClick={() => setOpenCard(null)}
        >
          <div
            className="w-full"
            style={{ background: "#fff", borderRadius: 12, border: "1px solid #e8e8e8", padding: 24, maxWidth: 448, margin: "0 16px" }}
            onClick={(e) => e.stopPropagation()}
            {...testAttr('modal', 'true')}
          >
            <div className="flex justify-between items-start" style={{ marginBottom: 16 }}>
              <h3 className="text-lg font-semibold">{openCard.name}</h3>
              <button
                onClick={() => setOpenCard(null)}
                style={{ color: "rgba(38,38,38,0.5)", background: "none", border: "none", cursor: "pointer", fontSize: 20, lineHeight: 1 }}
              >
                &times;
              </button>
            </div>

            {/* Loading spinner */}
            {!modalLoaded && (
              <div className="flex items-center justify-center" style={{ padding: "32px 0" }} {...testAttr('modal-loading')}>
                <div className="animate-spin" style={{ width: 32, height: 32, borderRadius: "50%", borderBottom: "2px solid #fa5d19" }} />
                <span className="text-sm" style={{ marginLeft: 12, color: "rgba(38,38,38,0.5)" }}>Loading details...</span>
              </div>
            )}

            {/* Modal content with tabs */}
            {modalLoaded && (
              <div>
                {/* Tab bar inside modal */}
                <div className="flex" style={{ borderBottom: "1px solid #e8e8e8", marginBottom: 16 }}>
                  <button
                    onClick={() => setModalTab("overview")}
                    className="text-sm font-medium"
                    style={{
                      padding: "8px 16px",
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      ...(modalTab === "overview"
                        ? { color: "#fa5d19", borderBottom: "2px solid #fa5d19" }
                        : { color: "rgba(38,38,38,0.5)" }),
                    }}
                    {...testAttr('modal-tab', 'overview')}
                  >
                    Overview
                  </button>
                  <button
                    onClick={() => setModalTab("details")}
                    className="text-sm font-medium"
                    style={{
                      padding: "8px 16px",
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      ...(modalTab === "details"
                        ? { color: "#fa5d19", borderBottom: "2px solid #fa5d19" }
                        : { color: "rgba(38,38,38,0.5)" }),
                    }}
                    {...testAttr('modal-tab', 'details')}
                  >
                    Details
                  </button>
                </div>

                {/* Overview tab: category + price */}
                {modalTab === "overview" && (
                  <dl style={{ display: "flex", flexDirection: "column", gap: 12 }} {...testAttr('modal-panel', 'overview')}>
                    <div>
                      <dt className="text-sm" style={{ color: "rgba(38,38,38,0.5)" }}>Category</dt>
                      <dd>{openCard.category}</dd>
                    </div>
                    <div>
                      <dt className="text-sm" style={{ color: "rgba(38,38,38,0.5)" }}>Price</dt>
                      <dd className="font-mono">${openCard.price.toFixed(2)}</dd>
                    </div>
                  </dl>
                )}

                {/* Details tab: SKU + supplier (fetched via interact) */}
                {modalTab === "details" && (
                  <dl style={{ display: "flex", flexDirection: "column", gap: 12 }} {...testAttr('modal-panel', 'details')}>
                    <div>
                      <dt className="text-sm" style={{ color: "rgba(38,38,38,0.5)" }}>SKU</dt>
                      <dd className="font-mono" {...testAttr('field', 'sku')}>{cardDetails?.sku ?? "\u2014"}</dd>
                    </div>
                    <div>
                      <dt className="text-sm" style={{ color: "rgba(38,38,38,0.5)" }}>Supplier</dt>
                      <dd {...testAttr('field', 'supplier')}>{cardDetails?.supplier ?? "\u2014"}</dd>
                    </div>
                  </dl>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Answer input */}
      <div>
        <label className="text-sm" style={{ display: "block", color: "rgba(38,38,38,0.5)", marginBottom: 8 }}>
          Your Answer ({pageData.targetField})
        </label>
        <input
          type="text"
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          placeholder={`Enter the ${pageData.targetField}...`}
          style={{ width: "100%", maxWidth: 448, padding: "8px 16px", background: "#fff", border: "1px solid #d1d1d1", borderRadius: 8, color: "#262626", outline: "none" }}
        />
      </div>
    </div>
  );
}
