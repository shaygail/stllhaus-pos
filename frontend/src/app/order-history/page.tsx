"use client";
import { useEffect, useState } from "react";
import { fetchSales } from "@/lib/api";
import { SaleResponse } from "@/types";

export default function OrderHistoryPage() {
  const [sales, setSales] = useState<SaleResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedDate, setSelectedDate] = useState(() => {
    const d = new Date();
    return d.toISOString().slice(0, 10);
  });

  useEffect(() => {
    setLoading(true);
    fetchSales(selectedDate)
      .then(setSales)
      .catch(() => setError("Could not load orders. Is the backend running?"))
      .finally(() => setLoading(false));
  }, [selectedDate]);

  return (
    <div className="stll-page">
      <div className="stll-page-inner max-w-2xl pb-20">
      <h1 className="stll-h1">Order history</h1>
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <label className="text-[10px] font-medium uppercase tracking-[0.16em] text-stll-muted">Date</label>
        <input
          type="date"
          className="stll-input max-w-[200px]"
          value={selectedDate}
          onChange={e => setSelectedDate(e.target.value)}
        />
      </div>
      {loading ? (
        <p className="text-stll-muted">Loading…</p>
      ) : error ? (
        <p className="text-red-600">{error}</p>
      ) : sales.length === 0 ? (
        <p className="text-stll-muted">No orders for this date.</p>
      ) : (
        <div className="space-y-4">
          {sales.map(order => (
            <div key={order.id} className="stll-card p-4 print:border-black print:bg-white">
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs text-stll-muted">Order #{order.id}</span>
                <span className="text-xs text-stll-muted">{new Date(order.date).toLocaleString()}</span>
              </div>
              <div className="mb-2">
                <ul className="text-sm">
                  {order.items.map((item, idx) => (
                    <li key={idx} className="flex justify-between">
                      <span>{item.name} x{item.quantity ?? 1}</span>
                      <span>${(item.price * (item.quantity ?? 1)).toFixed(2)}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="flex justify-between border-t border-dashed border-stll-accent/30 pt-2 mt-2 text-sm font-semibold">
                <span>Total</span>
                <span>${order.subtotal.toFixed(2)}</span>
              </div>
              {order.discount ? (
                <div className="flex justify-between text-xs text-stll-muted">
                  <span>Discount</span>
                  <span>- ${order.discount.toFixed(2)}</span>
                </div>
              ) : null}
              <div className="flex justify-between text-xs text-stll-muted">
                <span>Payment</span>
                <span>{order.payment_method}</span>
              </div>
              <button
                type="button"
                className="stll-btn-primary mt-4 w-full print:hidden"
                onClick={() => window.print()}
              >
                Print
              </button>
            </div>
          ))}
        </div>
      )}
      </div>
    </div>
  );
}
