"use client";

import { useState, useEffect, useRef, MutableRefObject } from "react";
import { testAttr } from "../../../../lib/test-attrs";
import { useInteract } from "../../../../lib/use-interact";

interface Item {
  name: string;
  category: string;
  price: number;
  rating: number;
  supplier: string;
  inStock: boolean;
  weight: number;
}

interface Constraint {
  field: string;
  operator: string;
  value: string | number | boolean | string[];
  label: string;
}

interface ConstraintSolverPageData {
  items: Item[];
  requirements: Constraint[];
  budgetConstraints: Constraint[];
  exclusions: Constraint[];
  advancedConstraints?: Constraint[];
  optimization: string;
  optimizationField: "price" | "weight";
}

interface Props {
  pageData: ConstraintSolverPageData;
  answerRef: MutableRefObject<string>;
  sessionId: string;
  challengeId: string;
  renderToken: string;
}

export default function ConstraintSolverChallenge({ pageData, answerRef, sessionId, challengeId, renderToken }: Props) {
  const [answer, setAnswer] = useState("");
  const [showPopover, setShowPopover] = useState(false);
  const [advancedConstraints, setAdvancedConstraints] = useState<Constraint[]>(pageData.advancedConstraints ?? []);
  const [loadingAdvanced, setLoadingAdvanced] = useState(false);
  const popoverAnchorRef = useRef<HTMLButtonElement>(null);
  const interact = useInteract(challengeId, sessionId, renderToken);

  useEffect(() => {
    answerRef.current = answer;
  }, [answer, answerRef]);

  // Close popover on outside click
  useEffect(() => {
    if (!showPopover) return;
    const handler = (e: MouseEvent) => {
      if (popoverAnchorRef.current && !popoverAnchorRef.current.contains(e.target as Node)) {
        const popover = document.getElementById("constraints-popover");
        if (popover && !popover.contains(e.target as Node)) {
          setShowPopover(false);
        }
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showPopover]);

  const handleToggleAdvanced = async () => {
    const newState = !showPopover;
    setShowPopover(newState);

    if (newState && advancedConstraints.length === 0) {
      setLoadingAdvanced(true);
      try {
        const result = await interact("accordion") as { advancedConstraints: Constraint[] };
        if (result?.advancedConstraints) setAdvancedConstraints(result.advancedConstraints);
      } catch (err) {
        console.error("Failed to load advanced constraints:", err);
      } finally {
        setLoadingAdvanced(false);
      }
    }
  };

  return (
    <div>
      {/* Inventory */}
      <div className="mb-6">
        <h3 className="text-sm font-medium text-gray-400 mb-2">Inventory</h3>
        <div
          className="flex gap-4 overflow-x-auto pb-3"
          style={{ scrollBehavior: "smooth" }}
          {...testAttr('inventory-strip')}
        >
          {pageData.items.map((item) => (
            <div
              key={item.name}
              className="flex-shrink-0 w-56 bg-gray-900 rounded-lg border border-gray-800 p-4"
              {...testAttr('item-card', item.name)}
            >
              <h4 className="font-medium text-gray-100 mb-2 text-sm truncate">{item.name}</h4>
              <dl className="space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <dt className="text-gray-500">Category</dt>
                  <dd className="text-gray-300" {...testAttr('item-category')}>{item.category}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-500">Price</dt>
                  <dd className="text-gray-300 font-mono" {...testAttr('item-price')}>${item.price.toFixed(2)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-500">Rating</dt>
                  <dd className="text-gray-300" {...testAttr('item-rating')}>{item.rating}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-500">Supplier</dt>
                  <dd className="text-gray-300" {...testAttr('item-supplier')}>{item.supplier}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-500">In Stock</dt>
                  <dd {...testAttr('item-stock')}>
                    {item.inStock ? (
                      <span className="text-green-400">Yes</span>
                    ) : (
                      <span className="text-red-400">No</span>
                    )}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-500">Weight</dt>
                  <dd className="text-gray-300" {...testAttr('item-weight')}>{item.weight} kg</dd>
                </div>
              </dl>
            </div>
          ))}
        </div>
      </div>

      {/* Constraint Panels */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        <div className="bg-gray-900 rounded-lg border border-gray-800 p-4">
          <h3 className="text-sm font-medium text-blue-400 mb-3">Requirements</h3>
          <ul className="space-y-2" {...testAttr('panel', 'requirements')}>
            {pageData.requirements.map((c, i) => (
              <li key={i} className="text-sm text-gray-300 flex items-start gap-2" {...testAttr('constraint', String(i))}>
                <span className="text-blue-400 mt-0.5">&#x2022;</span>
                <span>{c.label}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="bg-gray-900 rounded-lg border border-gray-800 p-4">
          <h3 className="text-sm font-medium text-yellow-400 mb-3">Budget &amp; Quality</h3>
          <ul className="space-y-2" {...testAttr('panel', 'budget')}>
            {pageData.budgetConstraints.map((c, i) => (
              <li key={i} className="text-sm text-gray-300 flex items-start gap-2" {...testAttr('constraint', String(i))}>
                <span className="text-yellow-400 mt-0.5">&#x2022;</span>
                <span>{c.label}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="bg-gray-900 rounded-lg border border-gray-800 p-4">
          <h3 className="text-sm font-medium text-red-400 mb-3">Exclusions</h3>
          <ul className="space-y-2" {...testAttr('panel', 'exclusions')}>
            {pageData.exclusions.map((c, i) => (
              <li key={i} className="text-sm text-gray-300 flex items-start gap-2" {...testAttr('constraint', String(i))}>
                <span className="text-red-400 mt-0.5">&#x2022;</span>
                <span>{c.label}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Advanced Constraints */}
      <div className="mb-4 relative">
        <button
          ref={popoverAnchorRef}
          onClick={handleToggleAdvanced}
          className="text-sm text-purple-400 hover:text-purple-300 underline transition-colors cursor-pointer"
          {...testAttr('toggle-advanced')}
        >
          Additional Constraints
        </button>

        {showPopover && (
          <div
            id="constraints-popover"
            className="absolute left-0 top-8 z-30 bg-gray-900 rounded-lg border border-gray-700 p-4 shadow-xl min-w-72"
            {...testAttr('panel', 'advanced')}
          >
            {loadingAdvanced ? (
              <div className="flex items-center py-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-purple-400" />
                <span className="ml-2 text-sm text-gray-400">Loading...</span>
              </div>
            ) : (
              <ul className="space-y-2">
                {advancedConstraints.map((c, i) => (
                  <li key={i} className="text-sm text-gray-300 flex items-start gap-2" {...testAttr('constraint', String(i))}>
                    <span className="text-purple-400 mt-0.5">&#x2022;</span>
                    <span>{c.label}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>

      {/* Optimization note */}
      <div className="bg-gray-900/50 rounded-lg border border-gray-800 p-3 mb-6">
        <p className="text-sm text-gray-400" {...testAttr('optimization')}>
          <span className="text-amber-400 font-medium">Optimization:</span> {pageData.optimization}
        </p>
      </div>

      {/* Answer input */}
      <div>
        <label className="block text-sm text-gray-400 mb-2">Item Name</label>
        <input
          type="text"
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          placeholder="Enter the item name..."
          className="w-full max-w-md px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-gray-100 placeholder-gray-500 focus:outline-none focus:border-blue-500"
        />
      </div>
    </div>
  );
}
