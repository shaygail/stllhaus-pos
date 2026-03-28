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
      await submitSale({
        items,
        subtotal: itemsTotal,
        discount: discountAmt || undefined,
        payment_method: paymentMethod,
        customer_name: customerName.trim() || undefined,
      });
      setSuccessMsg(`Recorded $${total.toFixed(2)} · ${paymentMethod}`);
      clearCart();
      setCashGiven("");
      setCustomerName("");
      setDiscountInput("");
      setShowNumPad(false);
    } catch {
      setErrorMsg("Could not record sale. Is the backend running?");
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
      <div className="flex items-center justify-between mb-4 shrink-0">
        <h2 className="text-[10px] font-medium uppercase tracking-[0.2em] text-stll-muted">Current order</h2>
        {items.length > 0 && (
          <button
            type="button"
            onClick={clearCart}
            className="text-xs text-stll-muted hover:text-red-600 touch-manipulation py-1 px-1"
          >
            Clear
          </button>
        )}
      </div>

      <div className="shrink-0 mb-4">
        <input
          type="text"
          placeholder="Customer (optional)"
          value={customerName}
          onChange={(e) => setCustomerName(e.target.value)}
          className="w-full border border-stll-charcoal/10 rounded-lg px-3 py-2.5 text-sm text-stll-charcoal placeholder-stll-muted/70 focus:outline-none focus:border-stll-accent/60 bg-stll-cream/30"
        />
      </div>

      <div className="flex-1 overflow-y-auto min-h-0">
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-stll-muted/60 gap-2 text-center px-2">
            <p className="text-xs uppercase tracking-[0.14em]">Empty</p>
            <p className="text-sm text-stll-muted">Tap items on the menu to add.</p>
          </div>
        ) : (
          <div>
            {items.map((item) => (
              <CartItem key={item.id} item={item} />
            ))}
          </div>
        )}
      </div>

      <div className="shrink-0 border-t border-stll-charcoal/10 pt-4 mt-2 space-y-3">
        <div className="flex justify-between items-baseline">
          <span className="text-xs uppercase tracking-[0.12em] text-stll-muted">Total</span>
          <span className="text-2xl font-medium text-stll-charcoal tabular-nums">${total.toFixed(2)}</span>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-xs text-stll-muted whitespace-nowrap">Discount</label>
          <div className="relative flex-1">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-stll-muted text-sm">$</span>
            <input
              type="number"
              min="0"
              step="0.01"
              placeholder="0.00"
              value={discountInput}
              onChange={(e) => setDiscountInput(e.target.value)}
              className="w-full border border-stll-charcoal/10 rounded-lg pl-7 pr-3 py-2 text-sm text-stll-charcoal placeholder-stll-muted/50 focus:outline-none focus:border-stll-accent/60 bg-white"
            />
          </div>
          {discountAmt > 0 && (
            <button
              type="button"
              onClick={() => setDiscountInput("")}
              className="text-xs text-stll-muted hover:text-red-600 transition-colors px-1"
              aria-label="Clear discount"
            >
              ×
            </button>
          )}
        </div>
        {discountAmt > 0 && (
          <div className="flex justify-between items-center text-sm">
            <span className="text-stll-muted text-xs">After discount</span>
            <span className="font-medium text-stll-charcoal tabular-nums">${total.toFixed(2)}</span>
          </div>
        )}

        <div className="grid grid-cols-2 gap-2">
          {(["Cash", "Bank Transfer"] as PaymentMethod[]).map((method) => (
            <button
              type="button"
              key={method}
              onClick={() => {
                setPaymentMethod(method);
                setCashGiven("");
              }}
              className={`py-3 rounded-lg text-xs font-medium uppercase tracking-wide transition-colors touch-manipulation border ${
                paymentMethod === method
                  ? "border-stll-charcoal bg-stll-charcoal text-stll-cream"
                  : "border-stll-charcoal/15 bg-white text-stll-muted hover:border-stll-charcoal/25 hover:text-stll-charcoal"
              }`}
            >
              {method === "Cash" ? "Cash" : "Transfer"}
            </button>
          ))}
        </div>

        {paymentMethod === "Cash" && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <label className="text-xs text-stll-muted whitespace-nowrap">Cash given</label>
              <button
                type="button"
                onPointerDown={() => setShowNumPad(true)}
                className="relative flex-1 flex items-center justify-between pl-3 pr-3 py-2.5 rounded-lg border border-stll-charcoal/10 bg-white text-stll-charcoal font-medium text-base touch-manipulation hover:border-stll-charcoal/20 transition-colors text-right tabular-nums"
              >
                <span className="text-stll-muted text-sm">$</span>
                <span className={cashGiven ? "text-stll-charcoal" : "text-stll-muted/40"}>
                  {cashGiven || "0.00"}
                </span>
              </button>
            </div>
            {cashGiven !== "" && (
              <div
                className={`flex justify-between items-center px-3 py-2.5 rounded-lg text-sm font-medium tabular-nums ${
                  change >= 0
                    ? "bg-stll-sage/15 text-stll-charcoal border border-stll-sage/25"
                    : "bg-red-50 text-red-700 border border-red-100"
                }`}
              >
                <span>{change >= 0 ? "Change" : "Short"}</span>
                <span>${Math.abs(change).toFixed(2)}</span>
              </div>
            )}
          </div>
        )}

        <button
          type="button"
          onClick={handleCompleteSale}
          disabled={
            items.length === 0 ||
            loading ||
            (paymentMethod === "Cash" && cashGiven !== "" && change < 0)
          }
          className="w-full py-4 rounded-lg bg-stll-charcoal text-stll-cream text-sm font-medium uppercase tracking-[0.12em] hover:bg-stll-accent transition-colors disabled:opacity-35 disabled:cursor-not-allowed touch-manipulation"
        >
          {loading ? "Saving…" : "Complete sale"}
        </button>

        {successMsg && (
          <p className="text-xs text-stll-charcoal text-center bg-stll-sage/10 border border-stll-sage/20 rounded-lg py-2.5 px-3">
            {successMsg}
          </p>
        )}
        {errorMsg && (
          <p className="text-xs text-red-700 text-center bg-red-50 border border-red-100 rounded-lg py-2.5 px-3">
            {errorMsg}
          </p>
        )}
      </div>
    </div>
  );
}
