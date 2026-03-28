"use client";
import { MenuItem } from "@/types";
import ProductCard from "./ProductCard";

interface Props {
  items: MenuItem[];
}

const PINNED_LAST = ["Add Ons", "Sizes"];

function sortCategories(cats: string[]): string[] {
  const pinned = PINNED_LAST.filter((c) => cats.includes(c));
  const rest = cats.filter((c) => !PINNED_LAST.includes(c)).sort();
  return [...rest, ...pinned];
}

export default function ProductGrid({ items }: Props) {
  const raw = Array.from(new Set(items.map((i) => i.category)));
  const categories = sortCategories(raw);

  return (
    <div className="space-y-6">
      {categories.map((cat) => (
        <div key={cat}>
          <h3 className="text-[10px] font-medium uppercase tracking-[0.2em] text-stll-muted mb-3">
            {cat}
          </h3>
          {/* 2 cols on small phones, 3 on larger phones, 4 on tablet/desktop */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 gap-2.5">
            {items
              .filter((i) => i.category === cat)
              .map((item) => (
                <ProductCard key={item.id} item={item} />
              ))}
          </div>
        </div>
      ))}
    </div>
  );
}