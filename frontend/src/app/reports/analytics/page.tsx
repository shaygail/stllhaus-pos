"use client";
import { useEffect, useState } from "react";
import { fetchSales, fetchExpenses } from "@/lib/api";
import { SaleResponse, ExpenseResponse } from "@/types";

function toLocalDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function StatCard({ label, value, sub, color = "default" }: { label: string; value: string; sub?: string; color?: "green" | "red" | "blue" | "default" }) {
  const colors = {
    default: "border-stll-charcoal/10",
    green: "border-l-2 border-l-stll-sage",
    red: "border-l-2 border-l-red-300",
    blue: "border-l-2 border-l-stll-accent",
  };
  return (
    <div className={`stll-card p-4 ${colors[color]}`}>
      <p className="stll-section-title mb-1">{label}</p>
      <p className="text-xl font-medium tabular-nums text-stll-charcoal">{value}</p>
      {sub && <p className="mt-0.5 text-xs text-stll-muted/70">{sub}</p>}
    </div>
  );
}

export default function AnalyticsPage() {
  const [sales, setSales] = useState<SaleResponse[]>([]);
  const [expenses, setExpenses] = useState<ExpenseResponse[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([fetchSales(), fetchExpenses()])
      .then(([s, e]) => { setSales(s); setExpenses(e); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  // ── All-time totals ────────────────────────────────────────────────────────
  const totalRevenue  = sales.reduce((s, r) => s + r.subtotal - (r.discount || 0), 0);
  const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0);
  const netProfit     = totalRevenue - totalExpenses;
  const totalOrders   = sales.length;
  const cashRevenue   = sales.filter((r) => r.payment_method === "Cash").reduce((s, r) => s + r.subtotal - (r.discount || 0), 0);
  const bankRevenue   = sales.filter((r) => r.payment_method === "Bank Transfer").reduce((s, r) => s + r.subtotal - (r.discount || 0), 0);
  const avgOrder      = totalOrders > 0 ? totalRevenue / totalOrders : 0;

  // ── Per-day breakdown ─────────────────────────────────────────────────────
  type DayRow = { date: string; orders: number; revenue: number; expenses: number; net: number };
  const dayMap = new Map<string, DayRow>();

  for (const s of sales) {
    const raw = s.date.endsWith("Z") ? s.date.slice(0, -1) : s.date;
    const key = toLocalDateStr(new Date(raw));
    const row = dayMap.get(key) ?? { date: key, orders: 0, revenue: 0, expenses: 0, net: 0 };
    row.orders++;
    row.revenue = Math.round((row.revenue + s.subtotal - (s.discount || 0)) * 100) / 100;
    dayMap.set(key, row);
  }
  for (const e of expenses) {
    const raw = e.date.endsWith("Z") ? e.date.slice(0, -1) : e.date;
    const key = toLocalDateStr(new Date(raw));
    const row = dayMap.get(key) ?? { date: key, orders: 0, revenue: 0, expenses: 0, net: 0 };
    row.expenses = Math.round((row.expenses + e.amount) * 100) / 100;
    dayMap.set(key, row);
  }
  const dayRows = Array.from(dayMap.values())
    .map((r) => ({ ...r, net: Math.round((r.revenue - r.expenses) * 100) / 100 }))
    .sort((a, b) => b.date.localeCompare(a.date));

  // ── Expense categories ────────────────────────────────────────────────────
  const catMap = new Map<string, number>();
  for (const e of expenses) {
    catMap.set(e.category, Math.round(((catMap.get(e.category) ?? 0) + e.amount) * 100) / 100);
  }
  const catRows = Array.from(catMap.entries()).sort((a, b) => b[1] - a[1]);

  // ── Top items ─────────────────────────────────────────────────────────────
  const itemMap = new Map<string, { qty: number; revenue: number }>();
  for (const s of sales) {
    for (const item of s.items) {
      if (!item.name) continue;
      const prev = itemMap.get(item.name) ?? { qty: 0, revenue: 0 };
      itemMap.set(item.name, {
        qty: prev.qty + (item.quantity ?? 1),
        revenue: Math.round((prev.revenue + item.price * (item.quantity ?? 1)) * 100) / 100,
      });
    }
  }
  const topItems = Array.from(itemMap.entries())
    .map(([name, v]) => ({ name, ...v }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 10);

  if (loading) {
    return (
      <div className="stll-page flex items-center justify-center">
        <p className="animate-pulse text-stll-muted">Loading analytics…</p>
      </div>
    );
  }

  return (
    <div className="stll-page">
      <div className="stll-page-inner max-w-4xl space-y-8">

        <h1 className="stll-h1">Reports</h1>

        <section>
          <p className="stll-section-title">All-time</p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatCard label="Total Revenue"   value={`$${totalRevenue.toFixed(2)}`}  sub={`${totalOrders} orders`} />
            <StatCard label="Total Expenses"  value={`$${totalExpenses.toFixed(2)}`} color="red" />
            <StatCard label="Net Profit"      value={`$${netProfit.toFixed(2)}`}     color={netProfit >= 0 ? "green" : "red"} />
            <StatCard label="Avg Order Value" value={`$${avgOrder.toFixed(2)}`}      color="blue" />
          </div>
        </section>

        {/* ── Payment method split ── */}
        <section>
          <p className="stll-section-title">Payment breakdown</p>
          <div className="grid grid-cols-2 gap-3">
            <div className="stll-card border-l-2 border-l-stll-sage p-4">
              <p className="stll-section-title mb-1">Cash</p>
              <p className="text-xl font-medium tabular-nums text-stll-charcoal">${cashRevenue.toFixed(2)}</p>
              <p className="mt-0.5 text-xs text-stll-muted/70">
                {totalRevenue > 0 ? Math.round((cashRevenue / totalRevenue) * 100) : 0}% of revenue
              </p>
            </div>
            <div className="stll-card border-l-2 border-l-stll-accent p-4">
              <p className="stll-section-title mb-1">Bank transfer</p>
              <p className="text-xl font-medium tabular-nums text-stll-charcoal">${bankRevenue.toFixed(2)}</p>
              <p className="mt-0.5 text-xs text-stll-muted/70">
                {totalRevenue > 0 ? Math.round((bankRevenue / totalRevenue) * 100) : 0}% of revenue
              </p>
            </div>
          </div>
        </section>

        {/* ── Per-day breakdown ── */}
        {dayRows.length > 0 && (
          <section>
            <p className="stll-section-title">Day by day</p>
            <div className="stll-card overflow-hidden shadow-none">
              <table className="w-full text-sm">
                <thead className="stll-table-thead">
                  <tr>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3 text-right">Orders</th>
                    <th className="px-4 py-3 text-right">Revenue</th>
                    <th className="px-4 py-3 text-right">Expenses</th>
                    <th className="px-4 py-3 text-right">Net</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stll-charcoal/10">
                  {dayRows.map((row) => (
                    <tr key={row.date} className="hover:bg-stll-cream/40 transition-colors">
                      <td className="px-4 py-3 text-stll-charcoal font-medium">
                        {new Date(row.date + "T12:00:00").toLocaleDateString("en-NZ", { weekday: "short", day: "numeric", month: "short", year: "numeric" })}
                      </td>
                      <td className="px-4 py-3 text-right text-stll-muted">{row.orders}</td>
                      <td className="px-4 py-3 text-right text-stll-charcoal font-semibold">${row.revenue.toFixed(2)}</td>
                      <td className="px-4 py-3 text-right text-red-500">{row.expenses > 0 ? `−$${row.expenses.toFixed(2)}` : "—"}</td>
                      <td className={`px-4 py-3 text-right font-bold ${row.net >= 0 ? "text-green-600" : "text-red-600"}`}>
                        ${row.net.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="border-t border-stll-charcoal/10 bg-stll-cream/40">
                  <tr>
                    <td className="px-4 py-3 font-bold text-stll-charcoal">Total</td>
                    <td className="px-4 py-3 text-right font-bold text-stll-charcoal">{totalOrders}</td>
                    <td className="px-4 py-3 text-right font-bold text-stll-charcoal">${totalRevenue.toFixed(2)}</td>
                    <td className="px-4 py-3 text-right font-bold text-red-500">{totalExpenses > 0 ? `−$${totalExpenses.toFixed(2)}` : "—"}</td>
                    <td className={`px-4 py-3 text-right font-bold ${netProfit >= 0 ? "text-green-600" : "text-red-600"}`}>${netProfit.toFixed(2)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </section>
        )}

        {/* ── Expense categories ── */}
        {catRows.length > 0 && (
          <section>
            <p className="stll-section-title">Expenses by category</p>
            <div className="stll-card overflow-hidden shadow-none">
              <table className="w-full text-sm">
                <thead className="stll-table-thead">
                  <tr>
                    <th className="px-4 py-3">Category</th>
                    <th className="px-4 py-3 text-right">Total</th>
                    <th className="px-4 py-3 text-right">% of Expenses</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stll-charcoal/10">
                  {catRows.map(([cat, amt]) => (
                    <tr key={cat} className="hover:bg-stll-cream/40">
                      <td className="px-4 py-3 text-stll-charcoal">{cat}</td>
                      <td className="px-4 py-3 text-right font-semibold text-red-500">${amt.toFixed(2)}</td>
                      <td className="px-4 py-3 text-right text-stll-muted">
                        {totalExpenses > 0 ? Math.round((amt / totalExpenses) * 100) : 0}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* ── Expense details ── */}
        {expenses.length > 0 && (
          <section>
            <p className="stll-section-title">Expense records</p>
            <div className="stll-card overflow-hidden shadow-none">
              <table className="w-full text-sm">
                <thead className="stll-table-thead">
                  <tr>
                    <th className="px-4 py-3">Description</th>
                    <th className="px-4 py-3">Category</th>
                    <th className="px-4 py-3">Paid From</th>
                    <th className="px-4 py-3 text-right">Amount</th>
                    <th className="whitespace-nowrap px-4 py-3">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stll-charcoal/10">
                  {[...expenses]
                    .sort((a, b) => b.date.localeCompare(a.date))
                    .map((exp) => {
                      const raw = exp.date.endsWith("Z") ? exp.date.slice(0, -1) : exp.date;
                      const dateLabel = new Date(raw).toLocaleDateString("en-NZ", { day: "numeric", month: "short", year: "numeric" });
                      const paidFrom = exp.paid_from ?? "sales";
                      const CAT_STYLE: Record<string, string> = {
                        Ingredients: "bg-green-100 text-green-700",
                        Packaging:   "bg-blue-100 text-blue-700",
                        Equipment:   "bg-purple-100 text-purple-700",
                        Rent:        "bg-pink-100 text-pink-700",
                        Wages:       "bg-indigo-100 text-indigo-700",
                        Marketing:   "bg-cyan-100 text-cyan-700",
                        Other:       "bg-amber-100 text-amber-700",
                      };
                      return (
                        <tr key={exp.id} className="hover:bg-stll-cream/40 transition-colors">
                          <td className="px-4 py-3 text-stll-charcoal">{exp.description || "—"}</td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${CAT_STYLE[exp.category] ?? "bg-amber-100 text-amber-700"}`}>
                              {exp.category}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${paidFrom === "own" ? "bg-amber-100 text-amber-700" : "bg-green-100 text-green-700"}`}>
                              {paidFrom === "own" ? "👛 Own" : "💰 Sales"}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right font-semibold text-red-500">${exp.amount.toFixed(2)}</td>
                          <td className="px-4 py-3 text-stll-muted text-xs whitespace-nowrap">{dateLabel}</td>
                        </tr>
                      );
                    })}
                </tbody>
                <tfoot className="border-t border-stll-charcoal/10 bg-stll-cream/40">
                  <tr>
                    <td colSpan={3} className="px-4 py-3 font-bold text-stll-charcoal">Total</td>
                    <td className="px-4 py-3 text-right font-bold text-red-500">${totalExpenses.toFixed(2)}</td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </section>
        )}

        {/* ── Top items ── */}
        {topItems.length > 0 && (
          <section>
            <p className="stll-section-title">Top items</p>
            <div className="stll-card overflow-hidden shadow-none">
              <table className="w-full text-sm">
                <thead className="stll-table-thead">
                  <tr>
                    <th className="px-4 py-3">Item</th>
                    <th className="px-4 py-3 text-right">Qty Sold</th>
                    <th className="px-4 py-3 text-right">Revenue</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stll-charcoal/10">
                  {topItems.map((item, i) => (
                    <tr key={item.name} className="hover:bg-stll-cream/40">
                      <td className="px-4 py-3 text-stll-charcoal flex items-center gap-2">
                        <span className="text-xs font-bold text-stll-muted/40 w-5">#{i + 1}</span>
                        {item.name}
                      </td>
                      <td className="px-4 py-3 text-right text-stll-muted">{item.qty}</td>
                      <td className="px-4 py-3 text-right font-semibold text-stll-charcoal">${item.revenue.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {sales.length === 0 && (
          <div className="py-20 text-center text-stll-muted/60">
            <p className="text-sm">No sales data yet.</p>
          </div>
        )}

      </div>
    </div>
  );
}