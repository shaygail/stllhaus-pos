"use client";
import { MenuItem } from "@/types";
import ProductCard from "./ProductCard";

interface Props {
  items: MenuItem[];
}

const CATEGORY_ORDER = ["Hot Coffee", "Hot Drinks", "Cold Drinks", "Smoothies", "Food"];

export default function ProductGrid({ items }: Props) {
  const categories = CATEGORY_ORDER.filter((cat) =>
    items.some((i) => i.category === cat)
  );

  return (
    <div className="space-y-6">
      {categories.map((cat) => (
        <div key={cat}>
          <h3 className="text-[11px] font-bold uppercase tracking-widest text-cafe-warm mb-2.5">
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