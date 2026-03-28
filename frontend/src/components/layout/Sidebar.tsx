"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import clsx from "clsx";

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  const pathname = usePathname();
  const active =
    href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);

  return (
    <Link
      href={href}
      className={clsx(
        "block py-2 px-3 text-sm transition-colors rounded-md",
        active
          ? "text-stll-charcoal font-medium bg-stll-cream"
          : "text-stll-muted hover:text-stll-charcoal hover:bg-white/60"
      )}
    >
      {children}
    </Link>
  );
}

function Dropdown({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <li className="mt-1">
      <button
        type="button"
        className="w-full text-left flex items-center justify-between py-2 px-3 text-[11px] font-medium uppercase tracking-[0.14em] text-stll-muted hover:text-stll-charcoal transition-colors rounded-md"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <span>{label}</span>
        <span className="text-stll-charcoal/40 text-[10px]">{open ? "−" : "+"}</span>
      </button>
      {open && <ul className="mt-0.5 ml-1 pl-2 border-l border-stll-charcoal/10 space-y-0.5">{children}</ul>}
    </li>
  );
}

function DropdownItem({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <li>
      <NavLink href={href}>{children}</NavLink>
    </li>
  );
}

const Sidebar: React.FC = () => {
  return (
    <aside className="w-52 lg:w-56 shrink-0 h-full flex flex-col bg-white border-r border-stll-charcoal/10">
      <div className="px-4 py-6 border-b border-stll-charcoal/[0.06]">
        <p className="font-display text-[15px] font-medium tracking-[0.22em] text-stll-charcoal uppercase leading-tight">
          STLL
          <br />
          <span className="text-stll-muted tracking-[0.18em] text-[13px] font-normal">Haus</span>
        </p>
        <p className="mt-3 text-[10px] uppercase tracking-[0.12em] text-stll-muted leading-relaxed">
          Matcha &amp; coffee
        </p>
      </div>
      <nav className="flex-1 overflow-y-auto px-2 py-4">
        <ul className="space-y-0.5">
          <li>
            <NavLink href="/">POS</NavLink>
          </li>
          <li>
            <NavLink href="/dashboard">Sales</NavLink>
          </li>
          <li>
            <NavLink href="/menu-management">Menu</NavLink>
          </li>
          <li>
            <NavLink href="/pre-orders">Pre-orders</NavLink>
          </li>
          <Dropdown label="Accounting">
            <DropdownItem href="/expenses">Expenses</DropdownItem>
            <DropdownItem href="/funds">Funds</DropdownItem>
            <DropdownItem href="/tabs">Tabs</DropdownItem>
          </Dropdown>
          <Dropdown label="Stock">
            <DropdownItem href="/inventory">Inventory</DropdownItem>
            <DropdownItem href="/assets">Assets</DropdownItem>
          </Dropdown>
          <li>
            <NavLink href="/analytics">Analytics</NavLink>
          </li>
        </ul>
      </nav>
    </aside>
  );
};

export default Sidebar;
