"use client";
import { useEffect, useState } from "react";
import { fetchSales, fetchExpenses } from "@/lib/api";
import { SaleResponse, ExpenseResponse } from "@/types";

function toLocalDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function StatCard({ label, value, sub, color = "default" }: { label: string; value: string; sub?: string; color?: "green" | "red" | "blue" | "default" }) {
  const colors = {
    default: "bg-white border-beige-200 text-cafe-dark",
    green:   "bg-green-50 border-green-200 text-green-800",
    red:     "bg-red-50 border-red-200 text-red-700",
    blue:    "bg-blue-50 border-blue-200 text-blue-800",
  };
  return (
    <div className={`rounded-2xl p-4 border shadow-sm ${colors[color]}`}>
      <p className="text-[11px] uppercase tracking-widest font-semibold opacity-60">{label}</p>
      <p className="text-2xl font-bold mt-1">{value}</p>
      {sub && <p className="text-xs mt-0.5 opacity-50">{sub}</p>}
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
      <div className="h-full flex items-center justify-center">
        <p className="text-cafe-warm animate-pulse">Loading analytics…</p>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="max-w-4xl mx-auto space-y-8">

        <h1 className="text-2xl font-bold text-cafe-dark">Analytics &amp; Summary</h1>

        {/* ── All-time headline cards ── */}
        <section>
          <p className="text-[11px] font-bold uppercase tracking-widest text-cafe-warm mb-3">All-Time</p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatCard label="Total Revenue"   value={`$${totalRevenue.toFixed(2)}`}  sub={`${totalOrders} orders`} />
            <StatCard label="Total Expenses"  value={`$${totalExpenses.toFixed(2)}`} color="red" />
            <StatCard label="Net Profit"      value={`$${netProfit.toFixed(2)}`}     color={netProfit >= 0 ? "green" : "red"} />
            <StatCard label="Avg Order Value" value={`$${avgOrder.toFixed(2)}`}      color="blue" />
          </div>
        </section>

        {/* ── Payment method split ── */}
        <section>
          <p className="text-[11px] font-bold uppercase tracking-widest text-cafe-warm mb-3">Payment Breakdown</p>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white rounded-2xl border border-beige-200 p-4 shadow-sm">
              <p className="text-[11px] text-cafe-warm uppercase tracking-widest font-semibold">Cash</p>
              <p className="text-2xl font-bold text-cafe-dark mt-1">${cashRevenue.toFixed(2)}</p>
              <p className="text-xs text-cafe-warm/60 mt-0.5">
                {totalRevenue > 0 ? Math.round((cashRevenue / totalRevenue) * 100) : 0}% of revenue
              </p>
            </div>
            <div className="bg-white rounded-2xl border border-beige-200 p-4 shadow-sm">
              <p className="text-[11px] text-cafe-warm uppercase tracking-widest font-semibold">Bank Transfer</p>
              <p className="text-2xl font-bold text-cafe-dark mt-1">${bankRevenue.toFixed(2)}</p>
              <p className="text-xs text-cafe-warm/60 mt-0.5">
                {totalRevenue > 0 ? Math.round((bankRevenue / totalRevenue) * 100) : 0}% of revenue
              </p>
            </div>
          </div>
        </section>

        {/* ── Per-day breakdown ── */}
        {dayRows.length > 0 && (
          <section>
            <p className="text-[11px] font-bold uppercase tracking-widest text-cafe-warm mb-3">Day-by-Day</p>
            <div className="bg-white rounded-2xl border border-beige-200 shadow-sm overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-beige-100">
                  <tr>
                    <th className="text-left px-4 py-3 text-cafe-warm font-semibold">Date</th>
                    <th className="text-right px-4 py-3 text-cafe-warm font-semibold">Orders</th>
                    <th className="text-right px-4 py-3 text-cafe-warm font-semibold">Revenue</th>
                    <th className="text-right px-4 py-3 text-cafe-warm font-semibold">Expenses</th>
                    <th className="text-right px-4 py-3 text-cafe-warm font-semibold">Net</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-beige-100">
                  {dayRows.map((row) => (
                    <tr key={row.date} className="hover:bg-beige-50 transition-colors">
                      <td className="px-4 py-3 text-cafe-dark font-medium">
                        {new Date(row.date + "T12:00:00").toLocaleDateString("en-NZ", { weekday: "short", day: "numeric", month: "short", year: "numeric" })}
                      </td>
                      <td className="px-4 py-3 text-right text-cafe-warm">{row.orders}</td>
                      <td className="px-4 py-3 text-right text-cafe-dark font-semibold">${row.revenue.toFixed(2)}</td>
                      <td className="px-4 py-3 text-right text-red-500">{row.expenses > 0 ? `−$${row.expenses.toFixed(2)}` : "—"}</td>
                      <td className={`px-4 py-3 text-right font-bold ${row.net >= 0 ? "text-green-600" : "text-red-600"}`}>
                        ${row.net.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-beige-50 border-t-2 border-beige-200">
                  <tr>
                    <td className="px-4 py-3 font-bold text-cafe-dark">Total</td>
                    <td className="px-4 py-3 text-right font-bold text-cafe-dark">{totalOrders}</td>
                    <td className="px-4 py-3 text-right font-bold text-cafe-dark">${totalRevenue.toFixed(2)}</td>
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
            <p className="text-[11px] font-bold uppercase tracking-widest text-cafe-warm mb-3">Expenses by Category</p>
            <div className="bg-white rounded-2xl border border-beige-200 shadow-sm overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-beige-100">
                  <tr>
                    <th className="text-left px-4 py-3 text-cafe-warm font-semibold">Category</th>
                    <th className="text-right px-4 py-3 text-cafe-warm font-semibold">Total</th>
                    <th className="text-right px-4 py-3 text-cafe-warm font-semibold">% of Expenses</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-beige-100">
                  {catRows.map(([cat, amt]) => (
                    <tr key={cat} className="hover:bg-beige-50">
                      <td className="px-4 py-3 text-cafe-dark">{cat}</td>
                      <td className="px-4 py-3 text-right font-semibold text-red-500">${amt.toFixed(2)}</td>
                      <td className="px-4 py-3 text-right text-cafe-warm">
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
            <p className="text-[11px] font-bold uppercase tracking-widest text-cafe-warm mb-3">Expense Records</p>
            <div className="bg-white rounded-2xl border border-beige-200 shadow-sm overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-beige-100">
                  <tr>
                    <th className="text-left px-4 py-3 text-cafe-warm font-semibold">Description</th>
                    <th className="text-left px-4 py-3 text-cafe-warm font-semibold">Category</th>
                    <th className="text-left px-4 py-3 text-cafe-warm font-semibold">Paid From</th>
                    <th className="text-right px-4 py-3 text-cafe-warm font-semibold">Amount</th>
                    <th className="text-left px-4 py-3 text-cafe-warm font-semibold whitespace-nowrap">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-beige-100">
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
                        <tr key={exp.id} className="hover:bg-beige-50 transition-colors">
                          <td className="px-4 py-3 text-cafe-dark">{exp.description || "—"}</td>
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
                          <td className="px-4 py-3 text-cafe-warm text-xs whitespace-nowrap">{dateLabel}</td>
                        </tr>
                      );
                    })}
                </tbody>
                <tfoot className="bg-beige-50 border-t-2 border-beige-200">
                  <tr>
                    <td colSpan={3} className="px-4 py-3 font-bold text-cafe-dark">Total</td>
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
            <p className="text-[11px] font-bold uppercase tracking-widest text-cafe-warm mb-3">Top Items</p>
            <div className="bg-white rounded-2xl border border-beige-200 shadow-sm overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-beige-100">
                  <tr>
                    <th className="text-left px-4 py-3 text-cafe-warm font-semibold">Item</th>
                    <th className="text-right px-4 py-3 text-cafe-warm font-semibold">Qty Sold</th>
                    <th className="text-right px-4 py-3 text-cafe-warm font-semibold">Revenue</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-beige-100">
                  {topItems.map((item, i) => (
                    <tr key={item.name} className="hover:bg-beige-50">
                      <td className="px-4 py-3 text-cafe-dark flex items-center gap-2">
                        <span className="text-xs font-bold text-cafe-warm/40 w-5">#{i + 1}</span>
                        {item.name}
                      </td>
                      <td className="px-4 py-3 text-right text-cafe-warm">{item.qty}</td>
                      <td className="px-4 py-3 text-right font-semibold text-cafe-dark">${item.revenue.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {sales.length === 0 && (
          <div className="text-center py-20 text-cafe-warm/50">
            <p className="text-5xl mb-3">📊</p>
            <p>No sales data yet</p>
          </div>
        )}

      </div>
    </div>
  );
}
