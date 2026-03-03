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
      <div className="flex items-center" style={{ gap: 8, marginBottom: 24 }}>
        {[1, 2, 3, 4].map((s) => (
          <div key={s} className="flex items-center" style={{ gap: 8 }}>
            <div
              className="flex items-center justify-center text-sm font-medium"
              style={{
                width: 32,
                height: 32,
                borderRadius: "50%",
                ...(step === s
                  ? { background: "#fa5d19", color: "#fff" }
                  : step > s
                    ? { background: "rgba(26,147,56,0.08)", color: "#1a9338", border: "1px solid rgba(26,147,56,0.2)" }
                    : { background: "rgba(0,0,0,0.04)", color: "rgba(38,38,38,0.35)", border: "1px solid #d1d1d1" }),
              }}
              {...testAttr('step', String(s))}
            >
              {step > s ? "\u2713" : s}
            </div>
            {s < 4 && <div style={{ width: 32, height: 1, background: "#d1d1d1" }} />}
          </div>
        ))}
      </div>

      {/* Step 1: Find the order */}
      {step === 1 && (
        <div>
          <h3 className="text-sm font-medium" style={{ color: "rgba(38,38,38,0.5)", marginBottom: 12 }}>
            Step 1: Select the order with the <span className="font-medium" style={{ color: "#262626" }}>{pageData.orderCondition}</span>{" "}
            among <span className="font-mono font-medium" style={{ color: "#262626" }}>&quot;{pageData.targetStatus}&quot;</span> orders
          </h3>
          <div className="card-surface overflow-x-auto" style={{ borderRadius: 12, overflow: "hidden", marginBottom: 16 }}>
            <table className="w-full text-sm">
              <thead>
                <tr style={{ background: "#f3f3f3" }}>
                  <th className="text-left font-medium" style={{ padding: "12px 16px", color: "rgba(38,38,38,0.5)" }}>Order ID</th>
                  <th className="text-left font-medium" style={{ padding: "12px 16px", color: "rgba(38,38,38,0.5)" }}>Customer</th>
                  <th className="text-left font-medium" style={{ padding: "12px 16px", color: "rgba(38,38,38,0.5)" }}>Product</th>
                  <th className="text-right font-medium" style={{ padding: "12px 16px", color: "rgba(38,38,38,0.5)" }}>Qty</th>
                  <th className="text-right font-medium" style={{ padding: "12px 16px", color: "rgba(38,38,38,0.5)" }}>Unit Price</th>
                  <th className="text-left font-medium" style={{ padding: "12px 16px", color: "rgba(38,38,38,0.5)" }}>Status</th>
                  <th className="text-center font-medium" style={{ padding: "12px 16px", color: "rgba(38,38,38,0.5)" }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {pageData.orders.map((order) => (
                  <tr key={order.id} style={{ borderTop: "1px solid #e8e8e8" }} {...testAttr('order-id', order.id)}>
                    <td className="font-mono" style={{ padding: "12px 16px" }}>{order.id}</td>
                    <td style={{ padding: "12px 16px" }}>{order.customer}</td>
                    <td style={{ padding: "12px 16px", color: "rgba(38,38,38,0.5)" }}>{order.product}</td>
                    <td className="text-right" style={{ padding: "12px 16px" }} {...testAttr('quantity')}>{order.quantity}</td>
                    <td className="text-right font-mono" style={{ padding: "12px 16px" }} {...testAttr('unit-price')}>${order.unitPrice.toFixed(2)}</td>
                    <td style={{ padding: "12px 16px", color: "rgba(38,38,38,0.5)" }} {...testAttr('status')}>{order.status}</td>
                    <td className="text-center" style={{ padding: "12px 16px" }}>
                      <button
                        onClick={() => goToStep2(order)}
                        className="text-sm"
                        style={{ color: "#fa5d19", background: "none", border: "none", padding: 0, cursor: "pointer" }}
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
          <h3 className="text-sm font-medium" style={{ color: "rgba(38,38,38,0.5)", marginBottom: 12 }}>
            Step 2: Apply the <span className="font-medium" style={{ color: "#262626" }}>{pageData.discountCondition}</span>
          </h3>
          <div className="card-surface" style={{ borderRadius: 12, padding: 16, marginBottom: 16 }}>
            <p className="text-sm" style={{ color: "rgba(38,38,38,0.5)", marginBottom: 4 }}>Selected Order</p>
            <p className="font-mono" {...testAttr('selected-order')}>{selectedOrder.id}</p>
            <p className="text-sm" style={{ color: "rgba(38,38,38,0.5)", marginTop: 8 }}>
              {selectedOrder.quantity} &times; ${selectedOrder.unitPrice.toFixed(2)} = ${(selectedOrder.quantity * selectedOrder.unitPrice).toFixed(2)}
            </p>
          </div>
          {loadingStep ? (
            <div className="flex items-center" style={{ padding: "16px 0" }}>
              <div className="animate-spin" style={{ width: 24, height: 24, borderRadius: "50%", borderBottom: "2px solid #fa5d19" }} />
              <span className="text-sm" style={{ marginLeft: 12, color: "rgba(38,38,38,0.5)" }}>Loading discount codes...</span>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3" style={{ gap: 12, marginBottom: 16 }}>
              {discountCodes.map((dc) => (
                <button
                  key={dc.code}
                  onClick={() => handleDiscountSelect(dc)}
                  className="card-surface text-left"
                  style={{ padding: 16, borderRadius: 12, cursor: "pointer" }}
                  {...testAttr('discount-code', dc.code)}
                >
                  <p className="font-mono font-medium">{dc.code}</p>
                  <p className="text-sm" style={{ color: "rgba(38,38,38,0.5)" }} {...testAttr('discount-percent', String(dc.percent))}>{dc.percent}% off</p>
                </button>
              ))}
            </div>
          )}
          <button onClick={() => setStep(1)} className="text-sm" style={{ color: "rgba(38,38,38,0.35)", background: "none", border: "none", padding: 0, cursor: "pointer" }}>
            &larr; Back to Step 1
          </button>
        </div>
      )}

      {/* Step 3: Select shipping */}
      {step === 3 && selectedOrder && selectedDiscount && (
        <div>
          <h3 className="text-sm font-medium" style={{ color: "rgba(38,38,38,0.5)", marginBottom: 12 }}>
            Step 3: Select <span className="font-mono font-medium" style={{ color: "#262626" }}>&quot;{pageData.targetShipping}&quot;</span> shipping
          </h3>

          {budgetLimit && (
            <div className="card-surface" style={{ borderRadius: 12, padding: 16, marginBottom: 16 }}>
              <p className="text-sm" style={{ color: "rgba(38,38,38,0.5)" }}>
                Budget Limit: <span className="font-mono" style={{ color: "#262626" }} {...testAttr('budget-limit')}>${budgetLimit.toFixed(2)}</span>
              </p>
              <p className="text-sm" style={{ color: "rgba(38,38,38,0.5)", marginTop: 4 }}>Order: <span className="font-mono" style={{ color: "#262626" }}>{selectedOrder.id}</span></p>
              <p className="text-sm" style={{ color: "rgba(38,38,38,0.5)", marginTop: 4 }}>Discount: <span className="font-mono" style={{ color: "#262626" }}>{selectedDiscount.code} ({selectedDiscount.percent}%)</span></p>
              <p className="text-sm" style={{ color: "rgba(38,38,38,0.5)", marginTop: 4 }}>
                Discounted Subtotal: <span className="font-mono" style={{ color: "#262626" }} {...testAttr('discounted-subtotal')}>
                  ${(selectedOrder.quantity * selectedOrder.unitPrice * (1 - selectedDiscount.percent / 100)).toFixed(2)}
                </span>
              </p>
            </div>
          )}

          {budgetError && (
            <div style={{ background: "rgba(220,38,38,0.08)", border: "1px solid rgba(220,38,38,0.3)", borderRadius: 12, padding: 16, marginBottom: 16 }} {...testAttr('budget-error')}>
              <p className="font-medium" style={{ color: "#dc2626" }}>Budget Exceeded!</p>
              <p className="text-sm" style={{ color: "#dc2626", marginTop: 4 }}>
                The discounted subtotal exceeds the budget limit of ${budgetLimit?.toFixed(2)}. Please go back and select a different discount code.
              </p>
              <button
                onClick={() => { setBudgetError(false); setSelectedDiscount(null); setStep(2); }}
                className="text-sm"
                style={{ marginTop: 12, padding: "8px 16px", background: "rgba(220,38,38,0.08)", color: "#dc2626", borderRadius: 8, border: "none", cursor: "pointer" }}
                {...testAttr('back-to-step2')}
              >
                &larr; Back to Step 2
              </button>
            </div>
          )}

          {!budgetError && (
            <>
              {loadingStep ? (
                <div className="flex items-center" style={{ padding: "16px 0" }}>
                  <div className="animate-spin" style={{ width: 24, height: 24, borderRadius: "50%", borderBottom: "2px solid #fa5d19" }} />
                  <span className="text-sm" style={{ marginLeft: 12, color: "rgba(38,38,38,0.5)" }}>Loading shipping options...</span>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
                  {shippingOptions.map((opt) => (
                    <button
                      key={opt.name}
                      onClick={() => { setSelectedShipping(opt); setStep(4); }}
                      className="card-surface w-full flex justify-between items-center text-left"
                      style={{ padding: 16, borderRadius: 12, cursor: "pointer" }}
                      {...testAttr('shipping', opt.name)}
                    >
                      <span className="font-medium">{opt.name}</span>
                      <span className="font-mono" style={{ color: "rgba(38,38,38,0.5)" }} {...testAttr('shipping-cost', String(opt.cost))}>${opt.cost.toFixed(2)}</span>
                    </button>
                  ))}
                </div>
              )}
              <button onClick={() => setStep(2)} className="text-sm" style={{ color: "rgba(38,38,38,0.35)", background: "none", border: "none", padding: 0, cursor: "pointer" }}>
                &larr; Back to Step 2
              </button>
            </>
          )}
        </div>
      )}

      {/* Step 4: Confirm and submit */}
      {step === 4 && selectedOrder && selectedDiscount && selectedShipping && (
        <div>
          <h3 className="text-sm font-medium" style={{ color: "rgba(38,38,38,0.5)", marginBottom: 12 }}>
            Step 4: Calculate the final total and submit
          </h3>
          <div className="card-surface" style={{ borderRadius: 12, padding: 16, marginBottom: 16 }}>
            <dl className="text-sm" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <div className="flex justify-between">
                <dt style={{ color: "rgba(38,38,38,0.5)" }}>Order</dt>
                <dd className="font-mono" {...testAttr('field', 'order-id')}>{selectedOrder.id}</dd>
              </div>
              <div className="flex justify-between">
                <dt style={{ color: "rgba(38,38,38,0.5)" }}>Subtotal</dt>
                <dd className="font-mono" {...testAttr('field', 'subtotal')}>
                  {selectedOrder.quantity} &times; ${selectedOrder.unitPrice.toFixed(2)} = $
                  {(selectedOrder.quantity * selectedOrder.unitPrice).toFixed(2)}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt style={{ color: "rgba(38,38,38,0.5)" }}>Discount</dt>
                <dd className="font-mono" {...testAttr('field', 'discount')}>
                  {selectedDiscount.code} ({selectedDiscount.percent}%)
                </dd>
              </div>
              <div className="flex justify-between">
                <dt style={{ color: "rgba(38,38,38,0.5)" }}>Shipping</dt>
                <dd className="font-mono" {...testAttr('field', 'shipping')}>
                  {selectedShipping.name} (${selectedShipping.cost.toFixed(2)})
                </dd>
              </div>
            </dl>
          </div>
          <div>
            <label className="text-sm" style={{ display: "block", color: "rgba(38,38,38,0.5)", marginBottom: 8 }}>
              Final Total (discounted subtotal + shipping)
            </label>
            <input
              type="text"
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              placeholder="Enter the final total..."
              style={{ width: "100%", maxWidth: 448, padding: "8px 16px", background: "#fff", border: "1px solid #d1d1d1", borderRadius: 8, color: "#262626", outline: "none" }}
            />
          </div>
          <button onClick={() => setStep(3)} className="text-sm" style={{ marginTop: 12, color: "rgba(38,38,38,0.35)", background: "none", border: "none", padding: 0, cursor: "pointer" }}>
            &larr; Back to Step 3
          </button>
        </div>
      )}
    </div>
  );
}
