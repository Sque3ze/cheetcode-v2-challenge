"use client";

import { useState, useEffect, MutableRefObject } from "react";
import { testAttr } from "../../../../lib/test-attrs";

interface CardData {
  id: number;
  name: string;
  category: string;
  price: number;
  sku: string;
  supplier: string;
}

interface ModalInteractionPageData {
  cards: CardData[];
  targetCondition: string;
  targetField: string;
  targetCardName: string;
  targetCategory: string;
}

interface Props {
  pageData: ModalInteractionPageData;
  answerRef: MutableRefObject<string>;
}

export default function ModalInteractionChallenge({ pageData, answerRef }: Props) {
  const [openCard, setOpenCard] = useState<CardData | null>(null);
  const [answer, setAnswer] = useState("");

  useEffect(() => {
    answerRef.current = answer;
  }, [answer, answerRef]);

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

      {/* Modal */}
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
            <dl className="space-y-3">
              <div>
                <dt className="text-sm text-gray-400">Category</dt>
                <dd>{openCard.category}</dd>
              </div>
              <div>
                <dt className="text-sm text-gray-400">Price</dt>
                <dd className="font-mono">${openCard.price.toFixed(2)}</dd>
              </div>
              <div>
                <dt className="text-sm text-gray-400">SKU</dt>
                <dd className="font-mono" {...testAttr('field', 'sku')}>{openCard.sku}</dd>
              </div>
              <div>
                <dt className="text-sm text-gray-400">Supplier</dt>
                <dd {...testAttr('field', 'supplier')}>{openCard.supplier}</dd>
              </div>
            </dl>
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
