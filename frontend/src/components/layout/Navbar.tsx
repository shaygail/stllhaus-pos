"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";

const NAV = [
  { href: "/",          label: "POS" },
  { href: "/dashboard", label: "Sales" },
];

export default function Navbar() {
  const pathname = usePathname();
  return (
    <nav className="h-14 bg-cafe-brown text-white flex items-center justify-between px-4 shadow-md shrink-0">
      <span className="font-bold text-base tracking-wide">☕ STLL Haus</span>
      <div className="flex gap-1">
        {NAV.map(({ href, label }) => (
          <Link
            key={href}
            href={href}
            className={clsx(
              "px-4 py-2 rounded-lg text-sm font-semibold transition-all touch-manipulation",
              pathname === href
                ? "bg-white text-cafe-brown"
                : "text-white/80 hover:bg-white/20"
            )}
          >
            {label}
          </Link>
        ))}
      </div>
    </nav>
  );
}