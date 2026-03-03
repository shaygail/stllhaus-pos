"use client";
import { MenuItem } from "@/types";
import { useCartStore } from "@/store/cartStore";

interface Props {
  item: MenuItem;
}

export default function ProductCard({ item }: Props) {
  const addItem = useCartStore((s) => s.addItem);

  return (
    <button
      onClick={() => addItem(item)}
      className="flex flex-col items-center justify-center gap-1.5 rounded-2xl bg-white border-2 border-beige-200 shadow-sm hover:shadow-md hover:border-cafe-accent active:scale-95 active:bg-beige-100 transition-all duration-150 p-3 min-h-[90px] text-center w-full cursor-pointer touch-manipulation select-none"
    >
      <span className="text-sm font-semibold text-cafe-dark leading-tight">{item.name}</span>
      <span className="text-xs font-bold text-cafe-accent">${item.price.toFixed(2)}</span>
    </button>
  );
}