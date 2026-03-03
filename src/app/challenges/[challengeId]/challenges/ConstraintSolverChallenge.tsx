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
      <div style={{ marginBottom: 24 }}>
        <h3 className="text-sm font-medium" style={{ color: "rgba(38,38,38,0.5)", marginBottom: 8 }}>Inventory</h3>
        <div
          className="flex overflow-x-auto"
          style={{ gap: 16, paddingBottom: 12, scrollBehavior: "smooth" }}
          {...testAttr('inventory-strip')}
        >
          {pageData.items.map((item) => (
            <div
              key={item.name}
              className="card-surface"
              style={{ flexShrink: 0, width: 224, borderRadius: 12, padding: 16 }}
              {...testAttr('item-card', item.name)}
            >
              <h4 className="font-medium text-sm truncate" style={{ color: "#262626", marginBottom: 8 }}>{item.name}</h4>
              <dl style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 12 }}>
                <div className="flex justify-between">
                  <dt style={{ color: "rgba(38,38,38,0.35)" }}>Category</dt>
                  <dd style={{ color: "rgba(38,38,38,0.7)" }} {...testAttr('item-category')}>{item.category}</dd>
                </div>
                <div className="flex justify-between">
                  <dt style={{ color: "rgba(38,38,38,0.35)" }}>Price</dt>
                  <dd className="font-mono" style={{ color: "rgba(38,38,38,0.7)" }} {...testAttr('item-price')}>${item.price.toFixed(2)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt style={{ color: "rgba(38,38,38,0.35)" }}>Rating</dt>
                  <dd style={{ color: "rgba(38,38,38,0.7)" }} {...testAttr('item-rating')}>{item.rating}</dd>
                </div>
                <div className="flex justify-between">
                  <dt style={{ color: "rgba(38,38,38,0.35)" }}>Supplier</dt>
                  <dd style={{ color: "rgba(38,38,38,0.7)" }} {...testAttr('item-supplier')}>{item.supplier}</dd>
                </div>
                <div className="flex justify-between">
                  <dt style={{ color: "rgba(38,38,38,0.35)" }}>In Stock</dt>
                  <dd {...testAttr('item-stock')}>
                    {item.inStock ? (
                      <span style={{ color: "#1a9338" }}>Yes</span>
                    ) : (
                      <span style={{ color: "#dc2626" }}>No</span>
                    )}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt style={{ color: "rgba(38,38,38,0.35)" }}>Weight</dt>
                  <dd style={{ color: "rgba(38,38,38,0.7)" }} {...testAttr('item-weight')}>{item.weight} kg</dd>
                </div>
              </dl>
            </div>
          ))}
        </div>
      </div>

      {/* Constraint Panels */}
      <div className="grid grid-cols-1 md:grid-cols-3" style={{ gap: 16, marginBottom: 16 }}>
        <div className="card-surface" style={{ borderRadius: 12, padding: 16 }}>
          <h3 className="text-sm font-medium" style={{ color: "#fa5d19", marginBottom: 12 }}>Requirements</h3>
          <ul style={{ display: "flex", flexDirection: "column", gap: 8, listStyle: "none", margin: 0, padding: 0 }} {...testAttr('panel', 'requirements')}>
            {pageData.requirements.map((c, i) => (
              <li key={i} className="text-sm flex items-start" style={{ color: "rgba(38,38,38,0.7)", gap: 8 }} {...testAttr('constraint', String(i))}>
                <span style={{ color: "#fa5d19", marginTop: 2 }}>&#x2022;</span>
                <span>{c.label}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="card-surface" style={{ borderRadius: 12, padding: 16 }}>
          <h3 className="text-sm font-medium" style={{ color: "#b45309", marginBottom: 12 }}>Budget &amp; Quality</h3>
          <ul style={{ display: "flex", flexDirection: "column", gap: 8, listStyle: "none", margin: 0, padding: 0 }} {...testAttr('panel', 'budget')}>
            {pageData.budgetConstraints.map((c, i) => (
              <li key={i} className="text-sm flex items-start" style={{ color: "rgba(38,38,38,0.7)", gap: 8 }} {...testAttr('constraint', String(i))}>
                <span style={{ color: "#b45309", marginTop: 2 }}>&#x2022;</span>
                <span>{c.label}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="card-surface" style={{ borderRadius: 12, padding: 16 }}>
          <h3 className="text-sm font-medium" style={{ color: "#dc2626", marginBottom: 12 }}>Exclusions</h3>
          <ul style={{ display: "flex", flexDirection: "column", gap: 8, listStyle: "none", margin: 0, padding: 0 }} {...testAttr('panel', 'exclusions')}>
            {pageData.exclusions.map((c, i) => (
              <li key={i} className="text-sm flex items-start" style={{ color: "rgba(38,38,38,0.7)", gap: 8 }} {...testAttr('constraint', String(i))}>
                <span style={{ color: "#dc2626", marginTop: 2 }}>&#x2022;</span>
                <span>{c.label}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Advanced Constraints */}
      <div className="relative" style={{ marginBottom: 16 }}>
        <button
          ref={popoverAnchorRef}
          onClick={handleToggleAdvanced}
          className="text-sm"
          style={{ color: "#9061ff", textDecoration: "underline", cursor: "pointer", background: "none", border: "none", padding: 0 }}
          {...testAttr('toggle-advanced')}
        >
          Additional Constraints
        </button>

        {showPopover && (
          <div
            id="constraints-popover"
            className="absolute"
            style={{ left: 0, top: 32, zIndex: 30, background: "#fff", borderRadius: 12, border: "1px solid #d1d1d1", padding: 16, boxShadow: "0 4px 12px rgba(0,0,0,0.1)", minWidth: 288 }}
            {...testAttr('panel', 'advanced')}
          >
            {loadingAdvanced ? (
              <div className="flex items-center" style={{ padding: "8px 0" }}>
                <div className="animate-spin" style={{ width: 16, height: 16, borderRadius: "50%", borderBottom: "2px solid #9061ff" }} />
                <span className="text-sm" style={{ marginLeft: 8, color: "rgba(38,38,38,0.5)" }}>Loading...</span>
              </div>
            ) : (
              <ul style={{ display: "flex", flexDirection: "column", gap: 8, listStyle: "none", margin: 0, padding: 0 }}>
                {advancedConstraints.map((c, i) => (
                  <li key={i} className="text-sm flex items-start" style={{ color: "rgba(38,38,38,0.7)", gap: 8 }} {...testAttr('constraint', String(i))}>
                    <span style={{ color: "#9061ff", marginTop: 2 }}>&#x2022;</span>
                    <span>{c.label}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>

      {/* Optimization note */}
      <div style={{ background: "rgba(0,0,0,0.02)", borderRadius: 12, border: "1px solid #e8e8e8", padding: 12, marginBottom: 24 }}>
        <p className="text-sm" style={{ color: "rgba(38,38,38,0.5)" }} {...testAttr('optimization')}>
          <span className="font-medium" style={{ color: "#b45309" }}>Optimization:</span> {pageData.optimization}
        </p>
      </div>

      {/* Answer input */}
      <div>
        <label className="text-sm" style={{ display: "block", color: "rgba(38,38,38,0.5)", marginBottom: 8 }}>Item Name</label>
        <input
          type="text"
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          placeholder="Enter the item name..."
          style={{ width: "100%", maxWidth: 448, padding: "8px 16px", background: "#fff", border: "1px solid #d1d1d1", borderRadius: 8, color: "#262626", outline: "none" }}
        />
      </div>
    </div>
  );
}
