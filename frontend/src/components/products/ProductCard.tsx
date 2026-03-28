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
      type="button"
      onClick={() => addItem(item)}
      className="flex flex-col items-center justify-center gap-1 rounded-xl bg-white border border-stll-charcoal/10 hover:border-stll-accent/50 hover:bg-stll-cream/40 active:scale-[0.98] transition-all duration-150 p-3 min-h-[88px] text-center w-full cursor-pointer touch-manipulation select-none"
    >
      <span className="text-sm font-medium text-stll-charcoal leading-snug">{item.name}</span>
      <span className="text-xs font-medium text-stll-muted tabular-nums">${item.price.toFixed(2)}</span>
    </button>
  );
}