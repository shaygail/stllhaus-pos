"use client";
import { useState } from "react";
import { useCartStore } from "@/store/cartStore";
import CartItem from "./CartItem";
import { submitSale } from "@/lib/api";

type PaymentMethod = "Cash" | "Bank Transfer";

export default function CartSummary() {
  const { items, clearCart, subtotal } = useCartStore();
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("Cash");
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const total = subtotal();

  const handleCompleteSale = async () => {
    if (items.length === 0) return;
    setLoading(true);
    setSuccessMsg(null);
    setErrorMsg(null);
    try {
      await submitSale({ items, subtotal: total, payment_method: paymentMethod });
      setSuccessMsg(`Sale recorded! $${total.toFixed(2)} via ${paymentMethod}`);
      clearCart();
    } catch {
      setErrorMsg("Failed to record sale. Is the backend running?");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
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

        {/* Payment method */}
        <div className="grid grid-cols-2 gap-2">
          {(["Cash", "Bank Transfer"] as PaymentMethod[]).map((method) => (
            <button
              key={method}
              onClick={() => setPaymentMethod(method)}
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

        {/* Complete Sale */}
        <button
          onClick={handleCompleteSale}
          disabled={items.length === 0 || loading}
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