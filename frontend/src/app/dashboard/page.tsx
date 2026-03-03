"use client";
import { useEffect, useState } from "react";
import { fetchSales, exportSalesUrl, resetSales } from "@/lib/api";
import { SaleResponse } from "@/types";

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white rounded-2xl p-4 border border-beige-200 shadow-sm">
      <p className="text-[11px] text-cafe-warm uppercase tracking-widest font-semibold">{label}</p>
      <p className="text-2xl font-bold text-cafe-dark mt-1">{value}</p>
    </div>
  );
}

export default function DashboardPage() {
  const [sales, setSales] = useState<SaleResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [resetting, setResetting] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);

  const load = () => {
    setLoading(true);
    fetchSales()
      .then(setSales)
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleReset = async () => {
    setResetting(true);
    try {
      await resetSales();
      setSales([]);
    } catch {
      alert("Failed to reset sales. Is the backend running?");
    } finally {
      setResetting(false);
      setConfirmReset(false);
    }
  };

  const total     = sales.reduce((s, r) => s + r.subtotal, 0);
  const cashTotal = sales.filter((r) => r.payment_method === "Cash").reduce((s, r) => s + r.subtotal, 0);
  const bankTotal = sales.filter((r) => r.payment_method === "Bank Transfer").reduce((s, r) => s + r.subtotal, 0);

  return (
    <div className="h-full overflow-y-auto p-6">
      {/* Confirm reset modal */}
      {confirmReset && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-6">
          <div className="bg-white rounded-2xl shadow-xl p-6 max-w-sm w-full space-y-4">
            <h2 className="text-lg font-bold text-cafe-dark">Reset all sales?</h2>
            <p className="text-sm text-cafe-warm">
              This will permanently delete <strong>all {sales.length} transaction{sales.length !== 1 ? "s" : ""}</strong> from the database. This cannot be undone.
            </p>
            <div className="grid grid-cols-2 gap-3 pt-1">
              <button
                onClick={() => setConfirmReset(false)}
                className="py-3 rounded-xl border-2 border-beige-200 text-cafe-dark font-semibold text-sm hover:bg-beige-100 transition-colors touch-manipulation"
              >
                Cancel
              </button>
              <button
                onClick={handleReset}
                disabled={resetting}
                className="py-3 rounded-xl bg-red-500 text-white font-semibold text-sm hover:bg-red-600 active:scale-95 transition-all disabled:opacity-50 touch-manipulation"
              >
                {resetting ? "Deleting…" : "Yes, Reset"}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-cafe-dark">Sales Report</h1>
            <p className="text-sm text-cafe-warm mt-0.5">{sales.length} transaction{sales.length !== 1 ? "s" : ""}</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setConfirmReset(true)}
              className="px-4 py-2 rounded-xl border-2 border-red-200 text-red-500 text-sm font-semibold hover:bg-red-50 transition-colors touch-manipulation"
            >
              🗑 Reset
            </button>
            <a
              href={exportSalesUrl()}
              download
              className="px-4 py-2 rounded-xl bg-cafe-brown text-white text-sm font-semibold hover:bg-cafe-dark transition-colors"
            >
              ↓ Export Excel
            </a>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <StatCard label="Total Revenue"    value={`$${total.toFixed(2)}`} />
          <StatCard label="Cash"             value={`$${cashTotal.toFixed(2)}`} />
          <StatCard label="Bank Transfer"    value={`$${bankTotal.toFixed(2)}`} />
        </div>

        {/* Table */}
        {loading ? (
          <p className="text-cafe-warm text-center py-12 animate-pulse">Loading…</p>
        ) : sales.length === 0 ? (
          <div className="text-center py-20 text-cafe-warm/50">
            <p className="text-5xl mb-3">📋</p>
            <p>No sales recorded yet</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-sm border border-beige-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-beige-100">
                <tr>
                  <th className="text-left px-4 py-3 text-cafe-warm font-semibold">#</th>
                  <th className="text-left px-4 py-3 text-cafe-warm font-semibold">Date &amp; Time</th>
                  <th className="text-left px-4 py-3 text-cafe-warm font-semibold">Items</th>
                  <th className="text-left px-4 py-3 text-cafe-warm font-semibold">Payment</th>
                  <th className="text-right px-4 py-3 text-cafe-warm font-semibold">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-beige-100">
                {sales.map((sale) => (
                  <tr key={sale.id} className="hover:bg-beige-50 transition-colors">
                    <td className="px-4 py-3 text-cafe-warm">#{sale.id}</td>
                    <td className="px-4 py-3 text-cafe-dark whitespace-nowrap">
                      {new Date(sale.date).toLocaleString("en-NZ", {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })}
                    </td>
                    <td className="px-4 py-3 text-cafe-dark">
                      {sale.items.map((i) => `${i.name} ×${i.quantity}`).join(", ")}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                          sale.payment_method === "Cash"
                            ? "bg-green-100 text-green-700"
                            : "bg-blue-100 text-blue-700"
                        }`}
                      >
                        {sale.payment_method}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-cafe-dark">
                      ${sale.subtotal.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}