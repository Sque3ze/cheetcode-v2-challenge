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
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {pageData.cards.map((card) => (
          <div
            key={card.id}
            className="bg-gray-900 rounded-lg border border-gray-800 p-4"
            {...testAttr('card-category', card.category)}
          >
            <h3 className="font-medium mb-1">{card.name}</h3>
            <p className="text-sm text-gray-400 mb-1" {...testAttr('category-label')}>{card.category}</p>
            <p className="text-sm font-mono mb-3" {...testAttr('card-price')}>${card.price.toFixed(2)}</p>
            <button
              onClick={() => setOpenCard(card)}
              className="text-sm text-blue-400 hover:text-blue-300 transition-colors"
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
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
          onClick={() => setOpenCard(null)}
        >
          <div
            className="bg-gray-900 rounded-lg border border-gray-700 p-6 max-w-md w-full mx-4"
            onClick={(e) => e.stopPropagation()}
            {...testAttr('modal', 'true')}
          >
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-lg font-semibold">{openCard.name}</h3>
              <button
                onClick={() => setOpenCard(null)}
                className="text-gray-400 hover:text-gray-200"
              >
                &times;
              </button>
            </div>

            {/* Loading spinner */}
            {!modalLoaded && (
              <div className="flex items-center justify-center py-8" {...testAttr('modal-loading')}>
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400" />
                <span className="ml-3 text-sm text-gray-400">Loading details...</span>
              </div>
            )}

            {/* Modal content with tabs */}
            {modalLoaded && (
              <div>
                {/* Tab bar inside modal */}
                <div className="flex border-b border-gray-700 mb-4">
                  <button
                    onClick={() => setModalTab("overview")}
                    className={`px-4 py-2 text-sm font-medium transition-colors ${
                      modalTab === "overview"
                        ? "text-white border-b-2 border-blue-500"
                        : "text-gray-400 hover:text-gray-200"
                    }`}
                    {...testAttr('modal-tab', 'overview')}
                  >
                    Overview
                  </button>
                  <button
                    onClick={() => setModalTab("details")}
                    className={`px-4 py-2 text-sm font-medium transition-colors ${
                      modalTab === "details"
                        ? "text-white border-b-2 border-blue-500"
                        : "text-gray-400 hover:text-gray-200"
                    }`}
                    {...testAttr('modal-tab', 'details')}
                  >
                    Details
                  </button>
                </div>

                {/* Overview tab: category + price */}
                {modalTab === "overview" && (
                  <dl className="space-y-3" {...testAttr('modal-panel', 'overview')}>
                    <div>
                      <dt className="text-sm text-gray-400">Category</dt>
                      <dd>{openCard.category}</dd>
                    </div>
                    <div>
                      <dt className="text-sm text-gray-400">Price</dt>
                      <dd className="font-mono">${openCard.price.toFixed(2)}</dd>
                    </div>
                  </dl>
                )}

                {/* Details tab: SKU + supplier (fetched via interact) */}
                {modalTab === "details" && (
                  <dl className="space-y-3" {...testAttr('modal-panel', 'details')}>
                    <div>
                      <dt className="text-sm text-gray-400">SKU</dt>
                      <dd className="font-mono" {...testAttr('field', 'sku')}>{cardDetails?.sku ?? "—"}</dd>
                    </div>
                    <div>
                      <dt className="text-sm text-gray-400">Supplier</dt>
                      <dd {...testAttr('field', 'supplier')}>{cardDetails?.supplier ?? "—"}</dd>
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
        <label className="block text-sm text-gray-400 mb-2">
          Your Answer ({pageData.targetField})
        </label>
        <input
          type="text"
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          placeholder={`Enter the ${pageData.targetField}...`}
          className="w-full max-w-md px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-gray-100 placeholder-gray-500 focus:outline-none focus:border-blue-500"
        />
      </div>
    </div>
  );
}
