"use client";
import { CartItem as CartItemType } from "@/types";
import { useCartStore } from "@/store/cartStore";

export default function CartItem({ item }: { item: CartItemType }) {
  const { increaseQty, decreaseQty, removeItem } = useCartStore();

  return (
    <div className="flex items-center gap-2 py-3 border-b border-stll-charcoal/[0.08] last:border-0">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-stll-charcoal truncate">{item.name}</p>
        <p className="text-xs text-stll-muted">${item.price.toFixed(2)} ea</p>
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        <button
          type="button"
          onClick={() => decreaseQty(item.id)}
          className="w-9 h-9 rounded-full border border-stll-charcoal/15 bg-white text-stll-charcoal text-lg leading-none flex items-center justify-center hover:bg-stll-cream active:scale-90 transition-all touch-manipulation"
          aria-label="Decrease quantity"
        >
          −
        </button>
        <span className="w-6 text-center text-sm font-medium text-stll-charcoal">{item.quantity}</span>
        <button
          type="button"
          onClick={() => increaseQty(item.id)}
          className="w-9 h-9 rounded-full bg-stll-charcoal text-stll-cream text-lg leading-none flex items-center justify-center hover:bg-stll-accent hover:text-white active:scale-90 transition-all touch-manipulation"
          aria-label="Increase quantity"
        >
          +
        </button>
      </div>
      <p className="text-sm font-medium text-stll-charcoal w-14 text-right shrink-0 tabular-nums">
        ${(item.price * item.quantity).toFixed(2)}
      </p>
      <button
        type="button"
        onClick={() => removeItem(item.id)}
        aria-label="Remove item"
        className="w-8 h-8 flex items-center justify-center rounded-full text-stll-muted hover:text-red-600 hover:bg-red-50 text-lg leading-none ml-1 touch-manipulation transition-colors"
      >
        ×
      </button>
    </div>
  );
}
