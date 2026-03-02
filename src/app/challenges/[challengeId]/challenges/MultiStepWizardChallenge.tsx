"use client";

import { useState, useEffect, MutableRefObject } from "react";
import { testAttr } from "../../../../lib/test-attrs";
import { useInteract } from "../../../../lib/use-interact";

interface Order {
  id: string;
  customer: string;
  product: string;
  quantity: number;
  unitPrice: number;
  status: string;
}

interface DiscountCode {
  code: string;
  percent: number;
}

interface ShippingOption {
  name: string;
  cost: number;
}

interface MultiStepWizardPageData {
  orders: Order[];
  discountCodes?: DiscountCode[];
  shippingOptions?: ShippingOption[];
  orderCondition: string;
  targetStatus: string;
  discountCondition: string;
  targetShipping: string;
  budgetLimit?: number;
}

interface Props {
  pageData: MultiStepWizardPageData;
  answerRef: MutableRefObject<string>;
  sessionId: string;
  challengeId: string;
  renderToken: string;
}

export default function MultiStepWizardChallenge({ pageData, answerRef, sessionId, challengeId, renderToken }: Props) {
  const [step, setStep] = useState(1);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [selectedDiscount, setSelectedDiscount] = useState<DiscountCode | null>(null);
  const [selectedShipping, setSelectedShipping] = useState<ShippingOption | null>(null);
  const [budgetError, setBudgetError] = useState(false);
  const [answer, setAnswer] = useState("");
  const [discountCodes, setDiscountCodes] = useState<DiscountCode[]>(pageData.discountCodes ?? []);
  const [shippingOptions, setShippingOptions] = useState<ShippingOption[]>(pageData.shippingOptions ?? []);
  const [budgetLimit, setBudgetLimit] = useState<number | undefined>(pageData.budgetLimit);
  const [loadingStep, setLoadingStep] = useState(false);
  const interact = useInteract(challengeId, sessionId, renderToken);

  useEffect(() => {
    answerRef.current = answer;
  }, [answer, answerRef]);

  const goToStep2 = async (order: Order) => {
    setSelectedOrder(order);
    if (discountCodes.length === 0) {
      setLoadingStep(true);
      try {
        const result = await interact("step", { step: 2 }) as { discountCodes: DiscountCode[] };
        if (result?.discountCodes) setDiscountCodes(result.discountCodes);
      } catch (err) {
        console.error("Failed to load step 2:", err);
      } finally {
        setLoadingStep(false);
      }
    }
    setStep(2);
  };

  const handleDiscountSelect = async (dc: DiscountCode) => {
    setSelectedDiscount(dc);
    setBudgetError(false);

    // Fetch step 3 data if needed
    if (shippingOptions.length === 0) {
      setLoadingStep(true);
      try {
        const result = await interact("step", { step: 3 }) as { shippingOptions: ShippingOption[]; budgetLimit: number };
        if (result?.shippingOptions) setShippingOptions(result.shippingOptions);
        if (result?.budgetLimit) setBudgetLimit(result.budgetLimit);
      } catch (err) {
        console.error("Failed to load step 3:", err);
      } finally {
        setLoadingStep(false);
      }
    }

    if (selectedOrder && budgetLimit) {
      const subtotal = selectedOrder.quantity * selectedOrder.unitPrice;
      const discountedSubtotal = subtotal * (1 - dc.percent / 100);
      if (discountedSubtotal > budgetLimit) {
        setBudgetError(true);
        setStep(3);
        return;
      }
    }
    setStep(3);
  };

  // Re-check budget when budgetLimit loads async
  useEffect(() => {
    if (step === 3 && selectedOrder && selectedDiscount && budgetLimit && !budgetError) {
      const subtotal = selectedOrder.quantity * selectedOrder.unitPrice;
      const discountedSubtotal = subtotal * (1 - selectedDiscount.percent / 100);
      if (discountedSubtotal > budgetLimit) {
        setBudgetError(true);
      }
    }
  }, [budgetLimit, step, selectedOrder, selectedDiscount, budgetError]);

  return (
    <div>
      {/* Step indicator */}
      <div className="flex items-center gap-2 mb-6">
        {[1, 2, 3, 4].map((s) => (
          <div key={s} className="flex items-center gap-2">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                step === s
                  ? "bg-blue-500 text-white"
                  : step > s
                    ? "bg-green-500/20 text-green-400 border border-green-500/50"
                    : "bg-gray-800 text-gray-500 border border-gray-700"
              }`}
              {...testAttr('step', String(s))}
            >
              {step > s ? "\u2713" : s}
            </div>
            {s < 4 && <div className="w-8 h-px bg-gray-700" />}
          </div>
        ))}
      </div>

      {/* Step 1: Find the order */}
      {step === 1 && (
        <div>
          <h3 className="text-sm font-medium text-gray-400 mb-3">
            Step 1: Select the order with the <span className="text-white">{pageData.orderCondition}</span>{" "}
            among <span className="text-white font-mono">&quot;{pageData.targetStatus}&quot;</span> orders
          </h3>
          <div className="overflow-x-auto rounded-lg border border-gray-800 mb-4">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-900">
                  <th className="px-4 py-3 text-left text-gray-400 font-medium">Order ID</th>
                  <th className="px-4 py-3 text-left text-gray-400 font-medium">Customer</th>
                  <th className="px-4 py-3 text-left text-gray-400 font-medium">Product</th>
                  <th className="px-4 py-3 text-right text-gray-400 font-medium">Qty</th>
                  <th className="px-4 py-3 text-right text-gray-400 font-medium">Unit Price</th>
                  <th className="px-4 py-3 text-left text-gray-400 font-medium">Status</th>
                  <th className="px-4 py-3 text-center text-gray-400 font-medium">Action</th>
                </tr>
              </thead>
              <tbody>
                {pageData.orders.map((order) => (
                  <tr key={order.id} className="border-t border-gray-800" {...testAttr('order-id', order.id)}>
                    <td className="px-4 py-3 font-mono">{order.id}</td>
                    <td className="px-4 py-3">{order.customer}</td>
                    <td className="px-4 py-3 text-gray-400">{order.product}</td>
                    <td className="px-4 py-3 text-right" {...testAttr('quantity')}>{order.quantity}</td>
                    <td className="px-4 py-3 text-right font-mono" {...testAttr('unit-price')}>${order.unitPrice.toFixed(2)}</td>
                    <td className="px-4 py-3 text-gray-400" {...testAttr('status')}>{order.status}</td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => goToStep2(order)}
                        className="text-sm text-blue-400 hover:text-blue-300"
                        {...testAttr('select-order', order.id)}
                      >
                        Select
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Step 2: Apply discount */}
      {step === 2 && selectedOrder && (
        <div>
          <h3 className="text-sm font-medium text-gray-400 mb-3">
            Step 2: Apply the <span className="text-white">{pageData.discountCondition}</span>
          </h3>
          <div className="bg-gray-900 rounded-lg border border-gray-800 p-4 mb-4">
            <p className="text-sm text-gray-400 mb-1">Selected Order</p>
            <p className="font-mono" {...testAttr('selected-order')}>{selectedOrder.id}</p>
            <p className="text-sm text-gray-400 mt-2">
              {selectedOrder.quantity} × ${selectedOrder.unitPrice.toFixed(2)} = ${(selectedOrder.quantity * selectedOrder.unitPrice).toFixed(2)}
            </p>
          </div>
          {loadingStep ? (
            <div className="flex items-center py-4">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-400" />
              <span className="ml-3 text-sm text-gray-400">Loading discount codes...</span>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
              {discountCodes.map((dc) => (
                <button
                  key={dc.code}
                  onClick={() => handleDiscountSelect(dc)}
                  className="p-4 rounded-lg border bg-gray-900 border-gray-800 hover:border-blue-500 text-left transition-colors"
                  {...testAttr('discount-code', dc.code)}
                >
                  <p className="font-mono font-medium">{dc.code}</p>
                  <p className="text-sm text-gray-400" {...testAttr('discount-percent', String(dc.percent))}>{dc.percent}% off</p>
                </button>
              ))}
            </div>
          )}
          <button onClick={() => setStep(1)} className="text-sm text-gray-500 hover:text-gray-300">
            &larr; Back to Step 1
          </button>
        </div>
      )}

      {/* Step 3: Select shipping */}
      {step === 3 && selectedOrder && selectedDiscount && (
        <div>
          <h3 className="text-sm font-medium text-gray-400 mb-3">
            Step 3: Select <span className="text-white font-mono">&quot;{pageData.targetShipping}&quot;</span> shipping
          </h3>

          {budgetLimit && (
            <div className="bg-gray-900 rounded-lg border border-gray-800 p-4 mb-4">
              <p className="text-sm text-gray-400">
                Budget Limit: <span className="font-mono text-white" {...testAttr('budget-limit')}>${budgetLimit.toFixed(2)}</span>
              </p>
              <p className="text-sm text-gray-400 mt-1">Order: <span className="font-mono text-white">{selectedOrder.id}</span></p>
              <p className="text-sm text-gray-400 mt-1">Discount: <span className="font-mono text-white">{selectedDiscount.code} ({selectedDiscount.percent}%)</span></p>
              <p className="text-sm text-gray-400 mt-1">
                Discounted Subtotal: <span className="font-mono text-white" {...testAttr('discounted-subtotal')}>
                  ${(selectedOrder.quantity * selectedOrder.unitPrice * (1 - selectedDiscount.percent / 100)).toFixed(2)}
                </span>
              </p>
            </div>
          )}

          {budgetError && (
            <div className="bg-red-900/30 border border-red-500/50 rounded-lg p-4 mb-4" {...testAttr('budget-error')}>
              <p className="text-red-400 font-medium">Budget Exceeded!</p>
              <p className="text-sm text-red-300 mt-1">
                The discounted subtotal exceeds the budget limit of ${budgetLimit?.toFixed(2)}. Please go back and select a different discount code.
              </p>
              <button
                onClick={() => { setBudgetError(false); setSelectedDiscount(null); setStep(2); }}
                className="mt-3 px-4 py-2 text-sm bg-red-800/50 text-red-200 rounded hover:bg-red-800 transition-colors"
                {...testAttr('back-to-step2')}
              >
                &larr; Back to Step 2
              </button>
            </div>
          )}

          {!budgetError && (
            <>
              {loadingStep ? (
                <div className="flex items-center py-4">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-400" />
                  <span className="ml-3 text-sm text-gray-400">Loading shipping options...</span>
                </div>
              ) : (
                <div className="space-y-2 mb-4">
                  {shippingOptions.map((opt) => (
                    <button
                      key={opt.name}
                      onClick={() => { setSelectedShipping(opt); setStep(4); }}
                      className="w-full p-4 rounded-lg border bg-gray-900 border-gray-800 hover:border-blue-500 text-left transition-colors flex justify-between items-center"
                      {...testAttr('shipping', opt.name)}
                    >
                      <span className="font-medium">{opt.name}</span>
                      <span className="font-mono text-gray-400" {...testAttr('shipping-cost', String(opt.cost))}>${opt.cost.toFixed(2)}</span>
                    </button>
                  ))}
                </div>
              )}
              <button onClick={() => setStep(2)} className="text-sm text-gray-500 hover:text-gray-300">
                &larr; Back to Step 2
              </button>
            </>
          )}
        </div>
      )}

      {/* Step 4: Confirm and submit */}
      {step === 4 && selectedOrder && selectedDiscount && selectedShipping && (
        <div>
          <h3 className="text-sm font-medium text-gray-400 mb-3">
            Step 4: Calculate the final total and submit
          </h3>
          <div className="bg-gray-900 rounded-lg border border-gray-800 p-4 mb-4">
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-gray-400">Order</dt>
                <dd className="font-mono" {...testAttr('field', 'order-id')}>{selectedOrder.id}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-400">Subtotal</dt>
                <dd className="font-mono" {...testAttr('field', 'subtotal')}>
                  {selectedOrder.quantity} × ${selectedOrder.unitPrice.toFixed(2)} = $
                  {(selectedOrder.quantity * selectedOrder.unitPrice).toFixed(2)}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-400">Discount</dt>
                <dd className="font-mono" {...testAttr('field', 'discount')}>
                  {selectedDiscount.code} ({selectedDiscount.percent}%)
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-400">Shipping</dt>
                <dd className="font-mono" {...testAttr('field', 'shipping')}>
                  {selectedShipping.name} (${selectedShipping.cost.toFixed(2)})
                </dd>
              </div>
            </dl>
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-2">
              Final Total (discounted subtotal + shipping)
            </label>
            <input
              type="text"
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              placeholder="Enter the final total..."
              className="w-full max-w-md px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-gray-100 placeholder-gray-500 focus:outline-none focus:border-blue-500"
            />
          </div>
          <button onClick={() => setStep(3)} className="mt-3 text-sm text-gray-500 hover:text-gray-300">
            &larr; Back to Step 3
          </button>
        </div>
      )}
    </div>
  );
}
