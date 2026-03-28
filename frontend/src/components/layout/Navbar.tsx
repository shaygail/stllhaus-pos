"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";

const NAV = [
  { href: "/",                label: "POS" },
  { href: "/dashboard",      label: "Sales" },
  { href: "/menu-management", label: "Menu" },
  { href: "/order-history",  label: "Bill/Order History" },
  { href: "/pre-orders",     label: "Pre-Orders" },
  { href: "/expenses",       label: "Expenses" },
  { href: "/funds",          label: "Funds" },
  { href: "/tabs",           label: "Tabs" },
  { href: "/inventory",      label: "Inventory" },
  { href: "/assets",         label: "Assets" },
  { href: "/analytics",      label: "Analytics" },
];

export default function Navbar() {
  const pathname = usePathname();
  return (
    <nav className="h-14 bg-white border-b border-stll-charcoal/10 flex items-center justify-between px-4 shrink-0">
      <span className="font-display text-lg font-medium tracking-[0.2em] text-stll-charcoal uppercase">
        STLL Haus
      </span>
      <div className="flex gap-0.5 overflow-x-auto">
        {NAV.map(({ href, label }) => (
          <Link
            key={href}
            href={href}
            className={clsx(
              "px-3 py-2 rounded-md text-xs font-medium transition-colors touch-manipulation whitespace-nowrap",
              pathname === href
                ? "text-stll-charcoal bg-stll-cream"
                : "text-stll-muted hover:text-stll-charcoal"
            )}
          >
            {label}
          </Link>
        ))}
      </div>
    </nav>
  );
}