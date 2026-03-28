"use client";
import { useEffect, useState } from "react";
import { fetchSales, exportSalesUrl, resetSales, fetchExpenses, fetchBalance, createManualSale, updateSale, deleteSale, fetchMenu } from "@/lib/api";
import { SaleResponse, ExpenseResponse, BalanceSummary, MenuItem } from "@/types";

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="stll-card p-4">
      <p className="stll-section-title mb-1">{label}</p>
      <p className="text-xl font-medium tabular-nums text-stll-charcoal">{value}</p>
    </div>
  );
}

function toLocalDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function getLast30Days(): { label: string; value: string }[] {
  const days = [];
  for (let i = 0; i < 30; i++) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const value = toLocalDateStr(d); // Use LOCAL date so tabs match NZ dates
    const label =
      i === 0 ? "Today" :
      i === 1 ? "Yesterday" :
      d.toLocaleDateString("en-NZ", { weekday: "short", day: "numeric", month: "short" });
    days.push({ label, value });
  }
  return days;
}

export default function DashboardPage() {
  const days = getLast30Days();
  const [selectedDate, setSelectedDate] = useState(days[0].value);
  const [sales, setSales] = useState<SaleResponse[]>([]);
  const [expenses, setExpenses] = useState<ExpenseResponse[]>([]);
  const [balance, setBalance] = useState<BalanceSummary>({ cash: 0, bank: 0 });
  const [loading, setLoading] = useState(true);
  const [resetting, setResetting] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);

  // Manual entry form
  const [showManual, setShowManual] = useState(false);
  const [manualDate, setManualDate] = useState("");
  const [manualTime, setManualTime] = useState("");
  const [manualPayment, setManualPayment] = useState<"Cash" | "Bank Transfer">("Cash");
  const [manualCustomer, setManualCustomer] = useState("");
  const [manualDiscount, setManualDiscount] = useState("");
  const [manualError, setManualError] = useState("");
  const [manualSaving, setManualSaving] = useState(false);
  // Menu picker state for manual sale
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [manualCart, setManualCart] = useState<Record<string, { item: MenuItem; qty: number }>>({});
  const [manualCategory, setManualCategory] = useState("all");

  // Edit sale state
  const [editSale, setEditSale] = useState<SaleResponse | null>(null);
  const [editDate, setEditDate] = useState("");
  const [editTime, setEditTime] = useState("");
  const [editAmount, setEditAmount] = useState("");
  const [editPayment, setEditPayment] = useState<"Cash" | "Bank Transfer">("Cash");
  const [editCustomer, setEditCustomer] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editError, setEditError] = useState("");
  const [editSaving, setEditSaving] = useState(false);

  const load = (date: string) => {
    setLoading(true);
    Promise.all([fetchSales(date), fetchExpenses(date), fetchBalance()])
      .then(([s, e, b]) => { setSales(s); setExpenses(e); setBalance(b); })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(selectedDate); }, [selectedDate]);

  useEffect(() => { fetchMenu().then(setMenuItems).catch(console.error); }, []);

  const addToManualCart = (item: MenuItem) => {
    setManualCart(prev => ({ ...prev, [item.id]: { item, qty: (prev[item.id]?.qty ?? 0) + 1 } }));
  };

  const removeFromManualCart = (itemId: string) => {
    setManualCart(prev => {
      const cur = prev[itemId];
      if (!cur) return prev;
      if (cur.qty <= 1) { const { [itemId]: _, ...rest } = prev; return rest; }
      return { ...prev, [itemId]: { ...cur, qty: cur.qty - 1 } };
    });
  };

  const manualCartEntries = Object.values(manualCart);
  const manualItemsTotal = manualCartEntries.reduce((s, { item, qty }) => s + item.price * qty, 0);
  const manualDiscountAmt = Math.min(Math.max(parseFloat(manualDiscount) || 0, 0), manualItemsTotal);
  const manualTotal = Math.max(manualItemsTotal - manualDiscountAmt, 0);
  const menuCategories = ["all", ...Array.from(new Set(menuItems.filter(i => !i.is_hidden).map(i => i.category)))];
  const filteredMenuItems = manualCategory === "all"
    ? menuItems.filter(i => !i.is_hidden)
    : menuItems.filter(i => !i.is_hidden && i.category === manualCategory);

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

  const handleManualSave = async () => {
    if (!manualDate) { setManualError("Select a date."); return; }
    if (!manualTime) { setManualError("Select a time."); return; }
    if (manualCartEntries.length === 0) { setManualError("Add at least one item."); return; }
    setManualError(""); setManualSaving(true);
    try {
      const localDT = `${manualDate}T${manualTime}:00`;
      await createManualSale({
        date: localDT,
        subtotal: Math.round(manualItemsTotal * 100) / 100,
        discount: manualDiscountAmt > 0 ? Math.round(manualDiscountAmt * 100) / 100 : undefined,
        payment_method: manualPayment,
        customer_name: manualCustomer.trim() || undefined,
        items: manualCartEntries.map(({ item, qty }) => ({ id: item.id, name: item.name, price: item.price, quantity: qty })),
      });
      setManualCart({}); setManualTime(""); setManualCustomer(""); setManualDiscount("");
      setShowManual(false);
      load(selectedDate);
    } catch {
      setManualError("Failed to save. Try again.");
    } finally {
      setManualSaving(false);
    }
  };

  const handleDeleteSale = async (sale: SaleResponse) => {
    const label = sale.items.length > 0 ? sale.items[0].name : `$${sale.subtotal.toFixed(2)}`;
    if (!confirm(`Delete "${label}"?`)) return;
    await deleteSale(sale.id).catch(console.error);
    load(selectedDate);
  };

  const openEditSale = (sale: SaleResponse) => {
    // Dates stored as local time (no Z suffix) — parse directly as local
    const raw = sale.date.endsWith("Z") ? sale.date.slice(0, -1) : sale.date;
    const d = new Date(raw);
    const dateStr = toLocalDateStr(d);
    const timeStr = `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
    const desc = sale.items.length === 1 ? sale.items[0].name : sale.items.map((i) => `${i.name} ×${i.quantity}`).join(", ");
    setEditSale(sale);
    setEditDate(dateStr);
    setEditTime(timeStr);
    setEditAmount(sale.subtotal.toFixed(2));
    setEditPayment(sale.payment_method as "Cash" | "Bank Transfer");
    setEditCustomer(sale.customer_name ?? "");
    setEditDesc(desc);
    setEditError("");
  };

  const handleSaveEditSale = async () => {
    if (!editSale) return;
    const parsed = parseFloat(editAmount);
    if (!editDate) { setEditError("Select a date."); return; }
    if (!editTime) { setEditError("Select a time."); return; }
    if (!editAmount || isNaN(parsed) || parsed <= 0) { setEditError("Enter a valid amount."); return; }
    setEditError(""); setEditSaving(true);
    try {
      // Send local datetime string directly — no UTC conversion
      const localDT = `${editDate}T${editTime}:00`;
      const newDate = editDate; // local date key for tab navigation
      await updateSale(editSale.id, {
        date: localDT,
        subtotal: parsed,
        payment_method: editPayment,
        customer_name: editCustomer.trim() || undefined,
        description: editDesc.trim() || undefined,
      });
      setEditSale(null);
      // Navigate to the date the edited sale now lives on so it's visible
      if (newDate !== selectedDate) {
        setSelectedDate(newDate); // useEffect will trigger load
      } else {
        load(newDate); // same tab — force reload directly
      }
    } catch {
      setEditError("Failed to save. Try again.");
    } finally {
      setEditSaving(false);
    }
  };

  const total     = sales.reduce((s, r) => s + r.subtotal - (r.discount || 0), 0);
  const cashTotal = sales.filter((r) => r.payment_method === "Cash").reduce((s, r) => s + r.subtotal - (r.discount || 0), 0);
  const bankTotal = sales.filter((r) => r.payment_method === "Bank Transfer").reduce((s, r) => s + r.subtotal - (r.discount || 0), 0);
  const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0);
  const netProfit = total - totalExpenses;

  return (
    <div className="stll-page">
      {/* Edit sale modal */}
      {editSale && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="stll-card w-full max-w-sm space-y-4 p-6 shadow-sm">
            <h2 className="text-base font-medium text-stll-charcoal">Edit sale #{editSale.id}</h2>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-stll-muted mb-1">Date *</label>
                <input type="date" className="w-full border border-stll-light rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stll-accent" value={editDate} onChange={(e) => setEditDate(e.target.value)} />
              </div>
              <div>
                <label className="block text-xs font-medium text-stll-muted mb-1">Time *</label>
                <input type="time" className="w-full border border-stll-light rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stll-accent" value={editTime} onChange={(e) => setEditTime(e.target.value)} />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-stll-muted mb-1">Amount *</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-stll-muted text-sm">$</span>
                <input type="number" min="0" step="0.01" className="w-full border border-stll-light rounded-lg pl-7 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stll-accent" value={editAmount} onChange={(e) => setEditAmount(e.target.value)} />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-stll-muted mb-1">Payment *</label>
              <div className="flex gap-2">
                {(["Cash", "Bank Transfer"] as const).map((p) => (
                  <button key={p} onClick={() => setEditPayment(p)} className={`flex-1 py-2 text-xs font-semibold rounded-xl transition-colors ${editPayment === p ? "bg-stll-accent text-white" : "bg-stll-light text-stll-muted hover:bg-stll-cream"}`}>{p}</button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-stll-muted mb-1">Customer (optional)</label>
              <input className="w-full border border-stll-light rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stll-accent" placeholder="e.g. Sarah" value={editCustomer} onChange={(e) => setEditCustomer(e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-medium text-stll-muted mb-1">Description (optional)</label>
              <input className="w-full border border-stll-light rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stll-accent" placeholder="e.g. 2x Matcha Latte" value={editDesc} onChange={(e) => setEditDesc(e.target.value)} />
            </div>
            {editError && <p className="text-xs text-red-600">{editError}</p>}
            <div className="flex gap-3 pt-1">
              <button onClick={() => setEditSale(null)} className="flex-1 py-2.5 text-sm font-semibold bg-stll-light text-stll-muted rounded-xl hover:bg-stll-cream transition-colors">Cancel</button>
              <button onClick={handleSaveEditSale} disabled={editSaving} className="flex-1 py-2.5 text-sm font-semibold bg-stll-accent text-white rounded-xl hover:bg-stll-charcoal hover:text-white disabled:opacity-60 transition-colors">{editSaving ? "Saving…" : "Save Changes"}</button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm reset modal */}
      {confirmReset && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-6">
          <div className="stll-card w-full max-w-sm space-y-4 p-6 shadow-sm">
            <h2 className="text-base font-medium text-stll-charcoal">Reset all sales?</h2>
            <p className="text-sm text-stll-muted">
              This will permanently delete <strong>all transactions across all days</strong> from the database. This cannot be undone.
            </p>
            <div className="grid grid-cols-2 gap-3 pt-1">
              <button
                type="button"
                onClick={() => setConfirmReset(false)}
                className="stll-btn-secondary w-full py-3 touch-manipulation sm:w-auto"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleReset}
                disabled={resetting}
                className="w-full rounded-lg bg-red-600 py-3 text-sm font-medium text-white transition-colors hover:bg-red-700 disabled:opacity-50 touch-manipulation sm:w-auto"
              >
                {resetting ? "Deleting…" : "Yes, Reset"}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="stll-page-inner max-w-4xl">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <h1 className="stll-h1 mb-0">Sales</h1>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                setShowManual(true);
                setManualDate(selectedDate);
                setManualTime("09:00");
                setManualError("");
                setManualCart({});
                setManualCategory("all");
                setManualDiscount("");
              }}
              className="stll-btn-secondary text-xs uppercase tracking-wide"
            >
              Past sale
            </button>
            <button
              type="button"
              onClick={() => setConfirmReset(true)}
              className="rounded-lg border border-red-200 px-4 py-2 text-xs font-medium uppercase tracking-wide text-red-600 transition-colors hover:bg-red-50 touch-manipulation"
            >
              Reset all
            </button>
            <a
              href={exportSalesUrl(selectedDate)}
              download
              className="stll-btn-primary text-xs uppercase tracking-wide"
            >
              Export
            </a>
          </div>
        </div>

          {/* Manual past-sale entry modal */}
          {showManual && (
            <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 p-4 overflow-y-auto">
              <div className="bg-white rounded-lg shadow-sm w-full max-w-2xl my-4 flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-stll-charcoal/10">
                  <h2 className="text-lg font-bold text-stll-charcoal">Add Past Sale</h2>
                  <button onClick={() => setShowManual(false)} className="text-stll-muted hover:text-stll-charcoal text-xl font-bold">✕</button>
                </div>

                {/* Date / Time / Payment / Customer */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 px-5 pt-4 pb-2">
                  <div>
                    <label className="block text-xs font-medium text-stll-muted mb-1">Date *</label>
                    <input type="date" className="w-full border border-stll-charcoal/15 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stll-accent/50" value={manualDate} onChange={(e) => setManualDate(e.target.value)} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-stll-muted mb-1">Time *</label>
                    <input type="time" className="w-full border border-stll-charcoal/15 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stll-accent/50" value={manualTime} onChange={(e) => setManualTime(e.target.value)} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-stll-muted mb-1">Payment *</label>
                    <div className="flex gap-1.5">
                      {(["Cash", "Bank Transfer"] as const).map((p) => (
                        <button key={p} onClick={() => setManualPayment(p)} className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-colors ${manualPayment === p ? "bg-stll-charcoal text-white" : "bg-stll-cream/60 text-stll-muted hover:bg-stll-cream"}`}>{p === "Cash" ? "Cash" : "Bank"}</button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-stll-muted mb-1">Customer (optional)</label>
                    <input className="w-full border border-stll-charcoal/15 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stll-accent/50" placeholder="e.g. Sarah" value={manualCustomer} onChange={(e) => setManualCustomer(e.target.value)} />
                  </div>
                </div>

                {/* Category filter tabs */}
                <div className="flex gap-2 overflow-x-auto px-5 pt-2 pb-2">
                  {menuCategories.map(cat => (
                    <button key={cat} onClick={() => setManualCategory(cat)} className={`px-3 py-1.5 text-xs font-semibold rounded-full whitespace-nowrap transition-colors ${manualCategory === cat ? "bg-stll-charcoal text-white" : "bg-stll-cream/60 text-stll-muted hover:bg-stll-cream"}`}>
                      {cat === "all" ? "All" : cat}
                    </button>
                  ))}
                </div>

                {/* Item grid */}
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 px-5 pb-3 max-h-60 overflow-y-auto">
                  {filteredMenuItems.map(item => {
                    const inCart = manualCart[item.id];
                    return (
                      <button
                        key={item.id}
                        onClick={() => !item.is_sold_out && addToManualCart(item)}
                        disabled={item.is_sold_out}
                        className={`relative rounded-xl border-2 p-3 text-left transition-all ${inCart ? "border-stll-charcoal bg-stll-charcoal/5" : "border-stll-charcoal/10 bg-white hover:border-stll-charcoal/50 hover:bg-stll-cream/50"} ${item.is_sold_out ? "opacity-40 cursor-not-allowed" : ""}`}
                      >
                        {inCart && (
                          <span className="absolute top-1.5 right-1.5 bg-stll-charcoal text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center">{inCart.qty}</span>
                        )}
                        <p className="text-xs font-semibold text-stll-charcoal leading-tight pr-4">{item.name}</p>
                        <p className="text-xs text-stll-muted mt-1">${item.price.toFixed(2)}</p>
                        {item.is_sold_out && <p className="text-[10px] text-red-400 mt-0.5">Sold out</p>}
                      </button>
                    );
                  })}
                  {filteredMenuItems.length === 0 && (
                    <p className="col-span-4 text-center text-sm text-stll-muted py-6">No items in this category.</p>
                  )}
                </div>

                {/* Cart summary */}
                {manualCartEntries.length > 0 && (
                  <div className="mx-5 mb-3 bg-stll-cream/50 rounded-xl p-3 border border-stll-charcoal/10">
                    <p className="text-xs font-semibold text-stll-muted mb-2">Cart</p>
                    <div className="space-y-1.5">
                      {manualCartEntries.map(({ item, qty }) => (
                        <div key={item.id} className="flex items-center gap-2 text-sm">
                          <span className="flex-1 text-stll-charcoal text-xs">{item.name}</span>
                          <button onClick={() => removeFromManualCart(item.id)} className="w-6 h-6 rounded-full bg-stll-cream text-stll-charcoal text-xs font-bold hover:bg-stll-light flex items-center justify-center">−</button>
                          <span className="w-5 text-center text-xs font-bold text-stll-charcoal">{qty}</span>
                          <button onClick={() => addToManualCart(item)} className="w-6 h-6 rounded-full bg-stll-cream text-stll-charcoal text-xs font-bold hover:bg-stll-light flex items-center justify-center">+</button>
                          <span className="w-16 text-right text-xs text-stll-muted">${(item.price * qty).toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                    <div className="flex justify-between items-center mt-2 pt-2 border-t border-stll-charcoal/10 gap-3">
                      <div className="flex items-center gap-2 flex-1">
                        <span className="text-xs text-stll-muted whitespace-nowrap">Discount $</span>
                        <input
                          type="number" min="0" step="0.01" placeholder="0.00"
                          value={manualDiscount}
                          onChange={(e) => setManualDiscount(e.target.value)}
                          className="flex-1 border border-stll-charcoal/10 rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-stll-accent/50"
                        />
                      </div>
                      <div className="text-right">
                        {manualDiscountAmt > 0 && (
                          <p className="text-[11px] text-stll-muted line-through">${manualItemsTotal.toFixed(2)}</p>
                        )}
                        <div className="flex items-center gap-1">
                          <span className="text-xs font-bold text-stll-charcoal">Total</span>
                          <span className="text-sm font-bold text-stll-accent">${manualTotal.toFixed(2)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Footer */}
                <div className="px-5 pb-5 space-y-2">
                  {manualError && <p className="text-xs text-red-600">{manualError}</p>}
                  <div className="flex gap-3">
                    <button onClick={() => setShowManual(false)} className="flex-1 py-2.5 text-sm font-semibold bg-stll-cream/60 text-stll-muted rounded-xl hover:bg-stll-cream transition-colors">Cancel</button>
                    <button onClick={handleManualSave} disabled={manualSaving} className="flex-1 py-2.5 text-sm font-semibold bg-stll-charcoal text-white rounded-xl hover:bg-stll-accent disabled:opacity-60 transition-colors">{manualSaving ? "Saving…" : "Save Sale"}</button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 7-day tabs */}
          <div className="flex gap-2 overflow-x-auto pb-2 mb-5 scrollbar-hide">
            {days.map((day) => (
            <button
              key={day.value}
              onClick={() => setSelectedDate(day.value)}
              className={`shrink-0 rounded-lg border px-4 py-2 text-sm font-medium transition-colors touch-manipulation ${
                selectedDate === day.value
                  ? "border-stll-charcoal bg-stll-charcoal text-stll-cream"
                  : "border-stll-charcoal/15 bg-white text-stll-muted hover:border-stll-charcoal/25 hover:text-stll-charcoal"
              }`}
            >
              {day.label}
            </button>
          ))}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <StatCard label="Total Revenue"  value={`$${total.toFixed(2)}`} />
          <StatCard label="Net Profit"     value={`$${netProfit.toFixed(2)}`} />
          <StatCard label="Cash"           value={`$${cashTotal.toFixed(2)}`} />
          <StatCard label="Bank Transfer"  value={`$${bankTotal.toFixed(2)}`} />
        </div>

        {/* Available Funds */}
        <p className="stll-section-title">Available funds</p>
        <div className="mb-4 grid grid-cols-2 gap-3">
          <a
            href="/funds"
            className="stll-card block border-l-2 border-l-stll-sage p-4 transition-colors hover:bg-stll-cream/30"
          >
            <p className="stll-section-title mb-1">Cash</p>
            <p className="text-xl font-medium tabular-nums text-stll-charcoal">${balance.cash.toFixed(2)}</p>
          </a>
          <a
            href="/funds"
            className="stll-card block border-l-2 border-l-stll-accent p-4 transition-colors hover:bg-stll-cream/30"
          >
            <p className="stll-section-title mb-1">Bank</p>
            <p className="text-xl font-medium tabular-nums text-stll-charcoal">${balance.bank.toFixed(2)}</p>
          </a>
        </div>

        {/* Expenses summary strip */}
        {totalExpenses > 0 && (
          <div className="mb-5 flex items-center justify-between rounded-lg border border-red-100 bg-red-50/80 px-4 py-3">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-red-800">Expenses</span>
              <span className="text-xs text-red-600/80">
                {expenses.length} item{expenses.length !== 1 ? "s" : ""}
              </span>
            </div>
            <span className="text-base font-medium tabular-nums text-red-800">−${totalExpenses.toFixed(2)}</span>
          </div>
        )}

        {/* Table */}
        {loading ? (
          <p className="text-stll-muted text-center py-12 animate-pulse">Loading…</p>
        ) : sales.length === 0 ? (
          <div className="py-20 text-center text-stll-muted/60">
            <p className="text-sm">No sales for this day.</p>
          </div>
        ) : (
          <div className="stll-card overflow-hidden shadow-none">
            <div className="stll-card-header">
              <p className="text-xs text-stll-muted">
                {sales.length} transaction{sales.length !== 1 ? "s" : ""}
              </p>
            </div>
            <table className="w-full text-sm">
              <thead className="stll-table-thead">
                <tr>
                  <th className="px-4 py-3">#</th>
                  <th className="px-4 py-3">Time</th>
                  <th className="px-4 py-3">Items</th>
                  <th className="px-4 py-3">Payment</th>
                  <th className="px-4 py-3 text-right">Total</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stll-charcoal/10">
                {sales.map((sale) => (
                  <tr key={sale.id} className="hover:bg-stll-cream/50 transition-colors">
                    <td className="px-4 py-3 text-stll-muted">#{sale.id}</td>
                    <td className="px-4 py-3 text-stll-charcoal whitespace-nowrap">
                      {new Date(sale.date).toLocaleTimeString("en-NZ", { timeStyle: "short" })}
                    </td>
                    <td className="px-4 py-3 text-stll-charcoal">
                      {sale.items.map((i) => `${i.name} ×${i.quantity}`).join(", ")}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`text-[10px] font-medium uppercase tracking-wide ${
                          sale.payment_method === "Cash" ? "text-stll-sage" : "text-stll-muted"
                        }`}
                      >
                        {sale.payment_method}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="font-bold text-stll-charcoal">${(sale.subtotal - (sale.discount || 0)).toFixed(2)}</span>
                      {(sale.discount || 0) > 0 && (
                        <span className="block text-[10px] text-orange-500 font-medium">−${sale.discount.toFixed(2)} off</span>
                      )}
                    </td>
                    <td className="px-2 py-3 text-right">
                      <div className="flex gap-1 justify-end">
                        <button
                          onClick={() => openEditSale(sale)}
                          className="text-xs px-2 py-1 rounded-lg bg-stll-cream/60 text-stll-muted hover:bg-stll-cream transition-colors"
                          title="Edit sale"
                        >✏</button>
                        <button
                          onClick={() => handleDeleteSale(sale)}
                          className="text-xs px-2 py-1 rounded-lg bg-red-50 text-red-400 hover:bg-red-100 transition-colors"
                          title="Delete sale"
                        >🗑</button>
                      </div>
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
