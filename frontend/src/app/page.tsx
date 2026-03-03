"use client";
import { useEffect, useState } from "react";
import { fetchMenu } from "@/lib/api";
import { MenuItem } from "@/types";
import { useCartStore } from "@/store/cartStore";
import ProductGrid from "@/components/products/ProductGrid";
import CartSummary from "@/components/cart/CartSummary";

export default function POSPage() {
  const [menu, setMenu] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<"menu" | "cart">("menu");
  const items = useCartStore((s) => s.items);
  const cartCount = items.reduce((n, i) => n + i.quantity, 0);

  useEffect(() => {
    fetchMenu()
      .then(setMenu)
      .catch(() => setError("Could not load menu. Make sure the backend is running on port 8000."))
      .finally(() => setLoading(false));
  }, []);

  return (
    <>
      {/* ── Desktop: side-by-side (md+) ── */}
      <div className="hidden md:flex h-full overflow-hidden">
        <div className="flex-1 overflow-y-auto p-5">
          <SectionLabel>Menu</SectionLabel>
          {loading && <Spinner />}
          {error && <ErrorBox msg={error} />}
          {!loading && !error && <ProductGrid items={menu} />}
        </div>
        <div className="w-px bg-beige-200 shrink-0" />
        <div className="w-80 xl:w-96 flex flex-col p-4 bg-beige-50 overflow-hidden">
          <CartSummary />
        </div>
      </div>

      {/* ── Mobile: full-screen tabs (< md) ── */}
      <div className="flex flex-col md:hidden h-full">
        {/* Tab content */}
        <div className="flex-1 overflow-y-auto">
          {tab === "menu" ? (
            <div className="p-4 pb-24">
              <SectionLabel>Menu</SectionLabel>
              {loading && <Spinner />}
              {error && <ErrorBox msg={error} />}
              {!loading && !error && <ProductGrid items={menu} />}
            </div>
          ) : (
            <div className="p-4 pb-28">
              <CartSummary />
            </div>
          )}
        </div>

        {/* Bottom tab bar */}
        <div className="fixed bottom-0 inset-x-0 z-50 flex bg-white border-t border-beige-200 shadow-[0_-2px_12px_rgba(0,0,0,0.08)]">
          <button
            onClick={() => setTab("menu")}
            className={`flex-1 flex flex-col items-center justify-center py-3 gap-0.5 text-xs font-semibold transition-colors touch-manipulation ${
              tab === "menu" ? "text-cafe-brown" : "text-cafe-warm/60"
            }`}
          >
            <span className="text-xl">☕</span>
            <span>Menu</span>
            {tab === "menu" && <span className="absolute bottom-0 w-12 h-0.5 bg-cafe-brown rounded-t-full" />}
          </button>

          <button
            onClick={() => setTab("cart")}
            className={`flex-1 flex flex-col items-center justify-center py-3 gap-0.5 text-xs font-semibold transition-colors touch-manipulation relative ${
              tab === "cart" ? "text-cafe-brown" : "text-cafe-warm/60"
            }`}
          >
            <span className="text-xl relative">
              🧾
              {cartCount > 0 && (
                <span className="absolute -top-1.5 -right-2.5 bg-cafe-accent text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
                  {cartCount}
                </span>
              )}
            </span>
            <span>Cart{cartCount > 0 ? ` (${cartCount})` : ""}</span>
            {tab === "cart" && <span className="absolute bottom-0 w-12 h-0.5 bg-cafe-brown rounded-t-full" />}
          </button>
        </div>
      </div>
    </>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-[11px] font-bold uppercase tracking-widest text-cafe-warm mb-4">
      {children}
    </h2>
  );
}

function Spinner() {
  return (
    <div className="flex items-center justify-center h-48 text-cafe-warm animate-pulse">
      Loading menu…
    </div>
  );
}

function ErrorBox({ msg }: { msg: string }) {
  return (
    <div className="bg-red-50 border border-red-200 text-red-600 rounded-2xl p-4 text-sm">{msg}</div>
  );
}