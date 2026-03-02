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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        {pageData.products.map((product, i) => (
          <div
            key={i}
            className="bg-gray-900 rounded-lg border border-gray-800 p-4"
            {...testAttr('product-card', product.name)}
          >
            <h3 className="font-medium mb-2">{product.name}</h3>
            <dl className="text-sm space-y-1">
              <div className="flex justify-between">
                <dt className="text-gray-500">Category</dt>
                <dd className="text-gray-300" {...testAttr('card-category')}>{product.category}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">Price</dt>
                <dd className="font-mono text-gray-300" {...testAttr('card-price')}>${product.price.toFixed(2)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">Rating</dt>
                <dd className="text-gray-300" {...testAttr('card-rating')}>{product.rating}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">Stock</dt>
                <dd className="text-gray-300" {...testAttr('card-stock')}>{product.stock}</dd>
              </div>
            </dl>
          </div>
        ))}
      </div>

      {/* Dropdown */}
      <div>
        <label className="block text-sm text-gray-400 mb-2">
          Select the product with the {pageData.condition}
        </label>
        <select
          value={selected}
          onChange={(e) => setSelected(e.target.value)}
          className="w-full max-w-md px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-gray-100 focus:outline-none focus:border-blue-500"
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
