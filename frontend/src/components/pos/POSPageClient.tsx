"use client";

import { useEffect, useState } from "react";
import { fetchMenu } from "@/lib/api";
import { MenuItem } from "@/types";
import { useCartStore } from "@/store/cartStore";
import ProductGrid from "@/components/products/ProductGrid";
import CartSummary from "@/components/cart/CartSummary";

export default function POSPageClient() {
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
      <div className="hidden md:flex h-full overflow-hidden bg-stll-cream">
        <div className="flex-1 overflow-y-auto p-6 md:p-8">
          <SectionLabel>Menu</SectionLabel>
          {loading && <Spinner />}
          {error && <ErrorBox msg={error} />}
          {!loading && !error && <ProductGrid items={menu} />}
        </div>
        <div className="w-px bg-stll-charcoal/10 shrink-0" />
        <div className="w-80 xl:w-96 flex flex-col p-6 bg-white border-l border-stll-charcoal/[0.06] overflow-hidden">
          <CartSummary />
        </div>
      </div>

      <div className="flex flex-col md:hidden h-full">
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

        <div className="fixed bottom-0 inset-x-0 z-50 flex bg-white border-t border-stll-charcoal/10">
          <button
            type="button"
            onClick={() => setTab("menu")}
            className={`relative flex-1 flex flex-col items-center justify-center py-3 gap-0.5 text-xs font-medium transition-colors touch-manipulation ${
              tab === "menu" ? "text-stll-charcoal" : "text-stll-muted"
            }`}
          >
            <span className="text-[10px] uppercase tracking-[0.12em]">Menu</span>
            {tab === "menu" && (
              <span className="absolute bottom-0 w-10 h-px bg-stll-accent rounded-full" />
            )}
          </button>

          <button
            type="button"
            onClick={() => setTab("cart")}
            className={`relative flex-1 flex flex-col items-center justify-center py-3 gap-0.5 text-xs font-medium transition-colors touch-manipulation ${
              tab === "cart" ? "text-stll-charcoal" : "text-stll-muted"
            }`}
          >
            <span className="relative text-[10px] uppercase tracking-[0.12em]">
              Cart
              {cartCount > 0 && (
                <span className="absolute -top-2 -right-4 min-w-[16px] h-4 px-1 rounded-full bg-stll-charcoal text-stll-cream text-[9px] font-medium flex items-center justify-center tabular-nums">
                  {cartCount}
                </span>
              )}
            </span>
            {tab === "cart" && (
              <span className="absolute bottom-0 w-10 h-px bg-stll-accent rounded-full" />
            )}
          </button>
        </div>
      </div>
    </>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-[10px] font-medium uppercase tracking-[0.2em] text-stll-muted mb-5">
      {children}
    </h2>
  );
}

function Spinner() {
  return (
    <div className="flex items-center justify-center h-48 text-stll-muted text-sm animate-pulse">
      Loading menu…
    </div>
  );
}

function ErrorBox({ msg }: { msg: string }) {
  return (
    <div className="bg-red-50 border border-red-100 text-red-700 rounded-lg p-4 text-sm">{msg}</div>
  );
}
