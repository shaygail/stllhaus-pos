"use client";
import { CartItem as CartItemType } from "@/types";
import { useCartStore } from "@/store/cartStore";

export default function CartItem({ item }: { item: CartItemType }) {
  const { increaseQty, decreaseQty, removeItem } = useCartStore();

  return (
    <div className="flex items-center gap-2 py-3 border-b border-beige-200 last:border-0">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-cafe-dark truncate">{item.name}</p>
        <p className="text-xs text-cafe-warm">${item.price.toFixed(2)} ea</p>
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        <button
          onClick={() => decreaseQty(item.id)}
          className="w-9 h-9 rounded-full bg-beige-200 text-cafe-dark font-bold text-lg flex items-center justify-center hover:bg-beige-300 active:scale-90 transition-all touch-manipulation"
        >
          −
        </button>
        <span className="w-6 text-center text-sm font-bold text-cafe-dark">{item.quantity}</span>
        <button
          onClick={() => increaseQty(item.id)}
          className="w-9 h-9 rounded-full bg-cafe-accent text-white font-bold text-lg flex items-center justify-center hover:bg-cafe-warm active:scale-90 transition-all touch-manipulation"
        >
          +
        </button>
      </div>
      <p className="text-sm font-bold text-cafe-dark w-14 text-right shrink-0">
        ${(item.price * item.quantity).toFixed(2)}
      </p>
      <button
        onClick={() => removeItem(item.id)}
        aria-label="Remove item"
        className="w-8 h-8 flex items-center justify-center rounded-full text-red-300 hover:text-red-500 hover:bg-red-50 text-xl leading-none ml-1 touch-manipulation transition-colors"
      >
        ×
      </button>
    </div>
  );
}