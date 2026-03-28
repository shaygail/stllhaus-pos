"use client";
import React from "react";

export default function SalesPage() {
  const sales = [
    { id: 1, date: "2026-03-24", customer: "John Doe", total: 120.5, payment: "Cash" },
    { id: 2, date: "2026-03-23", customer: "Jane Smith", total: 89.99, payment: "Bank Transfer" },
    { id: 3, date: "2026-03-22", customer: "Alex Lee", total: 45.0, payment: "Cash" },
  ];

  return (
    <div className="stll-page">
      <div className="stll-page-inner max-w-4xl">
        <h1 className="stll-h1">Sales</h1>
        <div className="stll-card overflow-hidden shadow-none">
          <div className="stll-card-header">
            <p className="text-xs text-stll-muted">Sample data — connect API when ready</p>
          </div>
          <table className="w-full text-sm">
            <thead className="stll-table-thead">
              <tr>
                <th className="px-4 py-3">#</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">Payment</th>
                <th className="px-4 py-3 text-right">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stll-charcoal/10">
              {sales.map((sale) => (
                <tr key={sale.id} className="hover:bg-stll-cream/40 transition-colors">
                  <td className="px-4 py-3 text-stll-muted">#{sale.id}</td>
                  <td className="px-4 py-3 text-stll-charcoal">{sale.date}</td>
                  <td className="px-4 py-3 text-stll-charcoal">{sale.customer}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`text-[10px] font-medium uppercase tracking-wide ${
                        sale.payment === "Cash" ? "text-stll-sage" : "text-stll-muted"
                      }`}
                    >
                      {sale.payment}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right font-medium tabular-nums text-stll-charcoal">
                    ${sale.total.toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
