"use client";

import { useState, useEffect, MutableRefObject } from "react";
import { testAttr } from "../../../../lib/test-attrs";

interface Product {
  name: string;
  price: number;
  category: string;
  rating: number;
  stock: number;
}

interface DropdownSelectPageData {
  products: Product[];
  condition: string;
  conditionType: string;
}

interface Props {
  pageData: DropdownSelectPageData;
  answerRef: MutableRefObject<string>;
  sessionId?: string;
  challengeId?: string;
  renderToken?: string;
}

export default function DropdownSelectChallenge({ pageData, answerRef }: Props) {
  const [selected, setSelected] = useState("");

  useEffect(() => {
    answerRef.current = selected;
  }, [selected, answerRef]);

  return (
    <div>
      {/* Product cards grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3" style={{ gap: 16, marginBottom: 24 }}>
        {pageData.products.map((product, i) => (
          <div
            key={i}
            className="card-surface"
            style={{ borderRadius: 12, padding: 16 }}
            {...testAttr('product-card', product.name)}
          >
            <h3 className="font-medium" style={{ marginBottom: 8 }}>{product.name}</h3>
            <dl className="text-sm" style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <div className="flex justify-between">
                <dt style={{ color: "rgba(38,38,38,0.35)" }}>Category</dt>
                <dd style={{ color: "rgba(38,38,38,0.7)" }} {...testAttr('card-category')}>{product.category}</dd>
              </div>
              <div className="flex justify-between">
                <dt style={{ color: "rgba(38,38,38,0.35)" }}>Price</dt>
                <dd className="font-mono" style={{ color: "rgba(38,38,38,0.7)" }} {...testAttr('card-price')}>${product.price.toFixed(2)}</dd>
              </div>
              <div className="flex justify-between">
                <dt style={{ color: "rgba(38,38,38,0.35)" }}>Rating</dt>
                <dd style={{ color: "rgba(38,38,38,0.7)" }} {...testAttr('card-rating')}>{product.rating}</dd>
              </div>
              <div className="flex justify-between">
                <dt style={{ color: "rgba(38,38,38,0.35)" }}>Stock</dt>
                <dd style={{ color: "rgba(38,38,38,0.7)" }} {...testAttr('card-stock')}>{product.stock}</dd>
              </div>
            </dl>
          </div>
        ))}
      </div>

      {/* Dropdown */}
      <div>
        <label className="text-sm" style={{ display: "block", color: "rgba(38,38,38,0.5)", marginBottom: 8 }}>
          Select the product with the {pageData.condition}
        </label>
        <select
          value={selected}
          onChange={(e) => setSelected(e.target.value)}
          style={{ width: "100%", maxWidth: 448, padding: "8px 16px", background: "#fff", border: "1px solid #d1d1d1", borderRadius: 8, color: "#262626", outline: "none" }}
        >
          <option value="">-- Select a product --</option>
          {pageData.products.map((product, i) => (
            <option key={i} value={product.name}>
              {product.name}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
