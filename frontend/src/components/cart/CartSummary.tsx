"use client";
import { useState } from "react";
import { useCartStore } from "@/store/cartStore";
import CartItem from "./CartItem";
import NumPad from "./NumPad";
import { submitSale } from "@/lib/api";

type PaymentMethod = "Cash" | "Bank Transfer";

export default function CartSummary() {
  const { items, clearCart, subtotal } = useCartStore();
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("Cash");
  const [cashGiven, setCashGiven] = useState<string>("");
  const [customerName, setCustomerName] = useState<string>("");
  const [discountInput, setDiscountInput] = useState<string>("");
  const [showNumPad, setShowNumPad] = useState(false);
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const itemsTotal = subtotal();
  const discountAmt = Math.min(Math.max(parseFloat(discountInput) || 0, 0), itemsTotal);
  const total = Math.max(itemsTotal - discountAmt, 0);
  const cashGivenNum = parseFloat(cashGiven) || 0;
  const change = cashGivenNum - total;

  const handleCompleteSale = async () => {
    if (items.length === 0) return;
    setLoading(true);
    setSuccessMsg(null);
    setErrorMsg(null);
    try {
      await submitSale({ items, subtotal: itemsTotal, discount: discountAmt || undefined, payment_method: paymentMethod, customer_name: customerName.trim() || undefined });
      setSuccessMsg(`Sale recorded! $${total.toFixed(2)} via ${paymentMethod}`);
      clearCart();
      setCashGiven("");
      setCustomerName("");
      setDiscountInput("");
      setShowNumPad(false);
    } catch {
      setErrorMsg("Failed to record sale. Is the backend running?");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {showNumPad && (
        <NumPad
          value={cashGiven}
          onChange={setCashGiven}
          onClose={() => setShowNumPad(false)}
        />
      )}
      {/* Header */}
      <div className="flex items-center justify-between mb-3 shrink-0">
        <h2 className="text-base font-bold text-cafe-dark">Current Order</h2>
        {items.length > 0 && (
          <button
            onClick={clearCart}
            className="text-sm text-red-400 hover:text-red-600 underline touch-manipulation py-1 px-2"
          >
            Clear all
          </button>
        )}
      </div>

      {/* Customer name */}
      <div className="shrink-0 mb-3">
        <input
          type="text"
          placeholder="Customer name (optional)"
          value={customerName}
          onChange={(e) => setCustomerName(e.target.value)}
          className="w-full border border-beige-200 rounded-xl px-4 py-2.5 text-sm text-cafe-dark placeholder-beige-300 focus:outline-none focus:ring-2 focus:ring-cafe-brown bg-white"
        />
      </div>

      {/* Items list */}
      <div className="flex-1 overflow-y-auto min-h-0">
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-cafe-warm/50 gap-2">
            <span className="text-6xl">☕</span>
            <p className="text-sm">Tap menu items to add</p>
          </div>
        ) : (
          <div>
            {items.map((item) => (
              <CartItem key={item.id} item={item} />
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="shrink-0 border-t border-beige-300 pt-4 mt-3 space-y-3">
        {/* Total */}
        <div className="flex justify-between items-center">
          <span className="text-sm text-cafe-warm font-medium">Total</span>
          <span className="text-3xl font-bold text-cafe-dark">${total.toFixed(2)}</span>
        </div>

        {/* Discount */}
        <div className="flex items-center gap-2">
          <label className="text-sm text-cafe-warm font-medium whitespace-nowrap">Discount</label>
          <div className="relative flex-1">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-cafe-warm text-sm">$</span>
            <input
              type="number" min="0" step="0.01" placeholder="0.00"
              value={discountInput}
              onChange={(e) => setDiscountInput(e.target.value)}
              className="w-full border border-beige-200 rounded-xl pl-7 pr-3 py-2 text-sm text-cafe-dark placeholder-beige-300 focus:outline-none focus:ring-2 focus:ring-cafe-brown bg-white"
            />
          </div>
          {discountAmt > 0 && (
            <button onClick={() => setDiscountInput("")} className="text-xs text-cafe-warm hover:text-red-500 transition-colors">✕</button>
          )}
        </div>
        {discountAmt > 0 && (
          <div className="flex justify-between items-center text-sm">
            <span className="text-cafe-warm">After discount</span>
            <span className="font-bold text-green-700">${total.toFixed(2)}</span>
          </div>
        )}

        {/* Payment method */}
        <div className="grid grid-cols-2 gap-2">
          {(["Cash", "Bank Transfer"] as PaymentMethod[]).map((method) => (
            <button
              key={method}
              onClick={() => { setPaymentMethod(method); setCashGiven(""); }}
              className={`py-4 rounded-xl text-sm font-semibold transition-all touch-manipulation border-2 ${
                paymentMethod === method
                  ? "bg-cafe-brown text-white border-cafe-brown shadow-md"
                  : "bg-white text-cafe-dark border-beige-200"
              }`}
            >
              {method === "Cash" ? "💵 Cash" : "🏦 Transfer"}
            </button>
          ))}
        </div>

        {/* Cash given + change */}
        {paymentMethod === "Cash" && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <label className="text-sm text-cafe-warm font-medium whitespace-nowrap">Cash given</label>
              <button
                onPointerDown={() => setShowNumPad(true)}
                className="relative flex-1 flex items-center justify-between pl-4 pr-4 py-3 rounded-xl border-2 border-beige-200 bg-white text-cafe-dark font-semibold text-lg touch-manipulation active:border-cafe-brown transition-colors text-right"
              >
                <span className="text-cafe-warm font-semibold">$</span>
                <span className={cashGiven ? "text-cafe-dark" : "text-beige-300"}>
                  {cashGiven || "0.00"}
                </span>
              </button>
            </div>
            {cashGiven !== "" && (
              <div className={`flex justify-between items-center px-4 py-3 rounded-xl font-bold text-lg ${
                change >= 0 ? "bg-green-50 text-green-700 border border-green-200" : "bg-red-50 text-red-600 border border-red-200"
              }`}>
                <span>{change >= 0 ? "Change" : "Short by"}</span>
                <span>${Math.abs(change).toFixed(2)}</span>
              </div>
            )}
          </div>
        )}

        {/* Complete Sale */}
        <button
          onClick={handleCompleteSale}
          disabled={items.length === 0 || loading || (paymentMethod === "Cash" && cashGiven !== "" && change < 0)}
          className="w-full py-5 rounded-2xl bg-cafe-brown text-white text-lg font-bold shadow-lg hover:bg-cafe-dark active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed touch-manipulation"
        >
          {loading ? "Processing…" : "✓  Complete Sale"}
        </button>

        {/* Feedback */}
        {successMsg && (
          <p className="text-sm text-green-700 font-medium text-center bg-green-50 border border-green-200 rounded-xl p-3">
            ✓ {successMsg}
          </p>
        )}
        {errorMsg && (
          <p className="text-sm text-red-600 font-medium text-center bg-red-50 border border-red-200 rounded-xl p-3">
            ✗ {errorMsg}
          </p>
        )}
      </div>
    </div>
  );
}