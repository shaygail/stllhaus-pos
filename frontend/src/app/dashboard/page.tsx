"use client";
import { useEffect, useState } from "react";
import { fetchSales, exportSalesUrl, resetSales, fetchExpenses, fetchBalance, createManualSale, updateSale, deleteSale, fetchMenu } from "@/lib/api";
import { SaleResponse, ExpenseResponse, BalanceSummary, MenuItem } from "@/types";

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white rounded-2xl p-4 border border-beige-200 shadow-sm">
      <p className="text-[11px] text-cafe-warm uppercase tracking-widest font-semibold">{label}</p>
      <p className="text-2xl font-bold text-cafe-dark mt-1">{value}</p>
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
    <div className="h-full overflow-y-auto p-6">
      {/* Edit sale modal */}
      {editSale && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-xl p-6 max-w-sm w-full space-y-4">
            <h2 className="text-lg font-bold text-cafe-dark">Edit Sale #{editSale.id}</h2>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-cafe-warm mb-1">Date *</label>
                <input type="date" className="w-full border border-beige-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cafe-brown" value={editDate} onChange={(e) => setEditDate(e.target.value)} />
              </div>
              <div>
                <label className="block text-xs font-medium text-cafe-warm mb-1">Time *</label>
                <input type="time" className="w-full border border-beige-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cafe-brown" value={editTime} onChange={(e) => setEditTime(e.target.value)} />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-cafe-warm mb-1">Amount *</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-cafe-warm text-sm">$</span>
                <input type="number" min="0" step="0.01" className="w-full border border-beige-300 rounded-lg pl-7 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cafe-brown" value={editAmount} onChange={(e) => setEditAmount(e.target.value)} />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-cafe-warm mb-1">Payment *</label>
              <div className="flex gap-2">
                {(["Cash", "Bank Transfer"] as const).map((p) => (
                  <button key={p} onClick={() => setEditPayment(p)} className={`flex-1 py-2 text-xs font-semibold rounded-xl transition-colors ${editPayment === p ? "bg-cafe-brown text-white" : "bg-beige-100 text-cafe-warm hover:bg-beige-200"}`}>{p}</button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-cafe-warm mb-1">Customer (optional)</label>
              <input className="w-full border border-beige-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cafe-brown" placeholder="e.g. Sarah" value={editCustomer} onChange={(e) => setEditCustomer(e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-medium text-cafe-warm mb-1">Description (optional)</label>
              <input className="w-full border border-beige-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cafe-brown" placeholder="e.g. 2x Matcha Latte" value={editDesc} onChange={(e) => setEditDesc(e.target.value)} />
            </div>
            {editError && <p className="text-xs text-red-600">{editError}</p>}
            <div className="flex gap-3 pt-1">
              <button onClick={() => setEditSale(null)} className="flex-1 py-2.5 text-sm font-semibold bg-beige-100 text-cafe-warm rounded-xl hover:bg-beige-200 transition-colors">Cancel</button>
              <button onClick={handleSaveEditSale} disabled={editSaving} className="flex-1 py-2.5 text-sm font-semibold bg-cafe-brown text-white rounded-xl hover:bg-cafe-dark disabled:opacity-60 transition-colors">{editSaving ? "Saving…" : "Save Changes"}</button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm reset modal */}
      {confirmReset && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-6">
          <div className="bg-white rounded-2xl shadow-xl p-6 max-w-sm w-full space-y-4">
            <h2 className="text-lg font-bold text-cafe-dark">Reset ALL sales?</h2>
            <p className="text-sm text-cafe-warm">
              This will permanently delete <strong>all transactions across all days</strong> from the database. This cannot be undone.
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
                {resetting ? "Deleting\u2026" : "Yes, Reset"}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold text-cafe-dark">Sales Report</h1>
          <div className="flex gap-2">
            <button
                onClick={() => { setShowManual(true); setManualDate(selectedDate); setManualTime("09:00"); setManualError(""); setManualCart({}); setManualCategory("all"); setManualDiscount(""); }}
                className="px-4 py-2 rounded-xl bg-cafe-brown text-white text-sm font-semibold hover:bg-cafe-dark transition-colors"
              >
                + Past Sale
              </button>
              <button
                onClick={() => setConfirmReset(true)}
                className="px-4 py-2 rounded-xl border-2 border-red-200 text-red-500 text-sm font-semibold hover:bg-red-50 transition-colors touch-manipulation"
              >
                🗑 Reset All
              </button>
              <a
                href={exportSalesUrl(selectedDate)}
                download
                className="px-4 py-2 rounded-xl bg-beige-200 text-cafe-dark text-sm font-semibold hover:bg-beige-300 transition-colors"
              >
                ↓ Export
              </a>
            </div>
          </div>

          {/* Manual past-sale entry modal */}
          {showManual && (
            <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 p-4 overflow-y-auto">
              <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl my-4 flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-beige-200">
                  <h2 className="text-lg font-bold text-cafe-dark">Add Past Sale</h2>
                  <button onClick={() => setShowManual(false)} className="text-cafe-warm hover:text-cafe-dark text-xl font-bold">✕</button>
                </div>

                {/* Date / Time / Payment / Customer */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 px-5 pt-4 pb-2">
                  <div>
                    <label className="block text-xs font-medium text-cafe-warm mb-1">Date *</label>
                    <input type="date" className="w-full border border-beige-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cafe-brown" value={manualDate} onChange={(e) => setManualDate(e.target.value)} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-cafe-warm mb-1">Time *</label>
                    <input type="time" className="w-full border border-beige-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cafe-brown" value={manualTime} onChange={(e) => setManualTime(e.target.value)} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-cafe-warm mb-1">Payment *</label>
                    <div className="flex gap-1.5">
                      {(["Cash", "Bank Transfer"] as const).map((p) => (
                        <button key={p} onClick={() => setManualPayment(p)} className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-colors ${manualPayment === p ? "bg-cafe-brown text-white" : "bg-beige-100 text-cafe-warm hover:bg-beige-200"}`}>{p === "Cash" ? "Cash" : "Bank"}</button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-cafe-warm mb-1">Customer (optional)</label>
                    <input className="w-full border border-beige-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cafe-brown" placeholder="e.g. Sarah" value={manualCustomer} onChange={(e) => setManualCustomer(e.target.value)} />
                  </div>
                </div>

                {/* Category filter tabs */}
                <div className="flex gap-2 overflow-x-auto px-5 pt-2 pb-2">
                  {menuCategories.map(cat => (
                    <button key={cat} onClick={() => setManualCategory(cat)} className={`px-3 py-1.5 text-xs font-semibold rounded-full whitespace-nowrap transition-colors ${manualCategory === cat ? "bg-cafe-brown text-white" : "bg-beige-100 text-cafe-warm hover:bg-beige-200"}`}>
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
                        className={`relative rounded-xl border-2 p-3 text-left transition-all ${inCart ? "border-cafe-brown bg-cafe-brown/5" : "border-beige-200 bg-white hover:border-cafe-brown/50 hover:bg-beige-50"} ${item.is_sold_out ? "opacity-40 cursor-not-allowed" : ""}`}
                      >
                        {inCart && (
                          <span className="absolute top-1.5 right-1.5 bg-cafe-brown text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center">{inCart.qty}</span>
                        )}
                        <p className="text-xs font-semibold text-cafe-dark leading-tight pr-4">{item.name}</p>
                        <p className="text-xs text-cafe-warm mt-1">${item.price.toFixed(2)}</p>
                        {item.is_sold_out && <p className="text-[10px] text-red-400 mt-0.5">Sold out</p>}
                      </button>
                    );
                  })}
                  {filteredMenuItems.length === 0 && (
                    <p className="col-span-4 text-center text-sm text-cafe-warm py-6">No items in this category.</p>
                  )}
                </div>

                {/* Cart summary */}
                {manualCartEntries.length > 0 && (
                  <div className="mx-5 mb-3 bg-beige-50 rounded-xl p-3 border border-beige-200">
                    <p className="text-xs font-semibold text-cafe-warm mb-2">Cart</p>
                    <div className="space-y-1.5">
                      {manualCartEntries.map(({ item, qty }) => (
                        <div key={item.id} className="flex items-center gap-2 text-sm">
                          <span className="flex-1 text-cafe-dark text-xs">{item.name}</span>
                          <button onClick={() => removeFromManualCart(item.id)} className="w-6 h-6 rounded-full bg-beige-200 text-cafe-dark text-xs font-bold hover:bg-beige-300 flex items-center justify-center">−</button>
                          <span className="w-5 text-center text-xs font-bold text-cafe-dark">{qty}</span>
                          <button onClick={() => addToManualCart(item)} className="w-6 h-6 rounded-full bg-beige-200 text-cafe-dark text-xs font-bold hover:bg-beige-300 flex items-center justify-center">+</button>
                          <span className="w-16 text-right text-xs text-cafe-warm">${(item.price * qty).toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                    <div className="flex justify-between items-center mt-2 pt-2 border-t border-beige-200 gap-3">
                      <div className="flex items-center gap-2 flex-1">
                        <span className="text-xs text-cafe-warm whitespace-nowrap">Discount $</span>
                        <input
                          type="number" min="0" step="0.01" placeholder="0.00"
                          value={manualDiscount}
                          onChange={(e) => setManualDiscount(e.target.value)}
                          className="flex-1 border border-beige-200 rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-cafe-brown"
                        />
                      </div>
                      <div className="text-right">
                        {manualDiscountAmt > 0 && (
                          <p className="text-[11px] text-cafe-warm line-through">${manualItemsTotal.toFixed(2)}</p>
                        )}
                        <div className="flex items-center gap-1">
                          <span className="text-xs font-bold text-cafe-dark">Total</span>
                          <span className="text-sm font-bold text-cafe-brown">${manualTotal.toFixed(2)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Footer */}
                <div className="px-5 pb-5 space-y-2">
                  {manualError && <p className="text-xs text-red-600">{manualError}</p>}
                  <div className="flex gap-3">
                    <button onClick={() => setShowManual(false)} className="flex-1 py-2.5 text-sm font-semibold bg-beige-100 text-cafe-warm rounded-xl hover:bg-beige-200 transition-colors">Cancel</button>
                    <button onClick={handleManualSave} disabled={manualSaving} className="flex-1 py-2.5 text-sm font-semibold bg-cafe-brown text-white rounded-xl hover:bg-cafe-dark disabled:opacity-60 transition-colors">{manualSaving ? "Saving…" : "Save Sale"}</button>
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
              className={`shrink-0 px-4 py-2 rounded-xl text-sm font-semibold transition-all touch-manipulation border-2 ${
                selectedDate === day.value
                  ? "bg-cafe-brown text-white border-cafe-brown shadow-md"
                  : "bg-white text-cafe-dark border-beige-200 hover:border-cafe-warm"
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
        <p className="text-[11px] font-bold uppercase tracking-widest text-cafe-warm mb-2">Available Funds</p>
        <div className="grid grid-cols-2 gap-3 mb-4">
          <a href="/funds" className="block bg-green-50 border border-green-200 rounded-2xl p-4 shadow-sm hover:bg-green-100 transition-colors">
            <p className="text-[11px] text-green-700 uppercase tracking-widest font-semibold">Cash in Hand</p>
            <p className="text-2xl font-bold text-green-800 mt-1">${balance.cash.toFixed(2)}</p>
          </a>
          <a href="/funds" className="block bg-blue-50 border border-blue-200 rounded-2xl p-4 shadow-sm hover:bg-blue-100 transition-colors">
            <p className="text-[11px] text-blue-700 uppercase tracking-widest font-semibold">Bank Balance</p>
            <p className="text-2xl font-bold text-blue-800 mt-1">${balance.bank.toFixed(2)}</p>
          </a>
        </div>

        {/* Expenses summary strip */}
        {totalExpenses > 0 && (
          <div className="flex items-center justify-between bg-red-50 border border-red-100 rounded-2xl px-4 py-3 mb-5">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-red-600">🧾 Expenses deducted</span>
              <span className="text-xs text-red-400">{expenses.length} item{expenses.length !== 1 ? "s" : ""}</span>
            </div>
            <span className="text-base font-bold text-red-600">−${totalExpenses.toFixed(2)}</span>
          </div>
        )}

        {/* Table */}
        {loading ? (
          <p className="text-cafe-warm text-center py-12 animate-pulse">Loading\u2026</p>
        ) : sales.length === 0 ? (
          <div className="text-center py-20 text-cafe-warm/50">
            <p className="text-5xl mb-3">📋</p>
            <p>No sales for this day</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-sm border border-beige-200 overflow-hidden">
            <div className="px-4 py-3 bg-beige-50 border-b border-beige-200">
              <p className="text-sm text-cafe-warm font-medium">{sales.length} transaction{sales.length !== 1 ? "s" : ""}</p>
            </div>
            <table className="w-full text-sm">
              <thead className="bg-beige-100">
                <tr>
                  <th className="text-left px-4 py-3 text-cafe-warm font-semibold">#</th>
                  <th className="text-left px-4 py-3 text-cafe-warm font-semibold">Time</th>
                  <th className="text-left px-4 py-3 text-cafe-warm font-semibold">Items</th>
                  <th className="text-left px-4 py-3 text-cafe-warm font-semibold">Payment</th>
                  <th className="text-right px-4 py-3 text-cafe-warm font-semibold">Total</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-beige-100">
                {sales.map((sale) => (
                  <tr key={sale.id} className="hover:bg-beige-50 transition-colors">
                    <td className="px-4 py-3 text-cafe-warm">#{sale.id}</td>
                    <td className="px-4 py-3 text-cafe-dark whitespace-nowrap">
                      {new Date(sale.date).toLocaleTimeString("en-NZ", { timeStyle: "short" })}
                    </td>
                    <td className="px-4 py-3 text-cafe-dark">
                      {sale.items.map((i) => `${i.name} ×${i.quantity}`).join(", ")}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                        sale.payment_method === "Cash"
                          ? "bg-green-100 text-green-700"
                          : "bg-blue-100 text-blue-700"
                      }`}>
                        {sale.payment_method}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="font-bold text-cafe-dark">${(sale.subtotal - (sale.discount || 0)).toFixed(2)}</span>
                      {(sale.discount || 0) > 0 && (
                        <span className="block text-[10px] text-orange-500 font-medium">−${sale.discount.toFixed(2)} off</span>
                      )}
                    </td>
                    <td className="px-2 py-3 text-right">
                      <div className="flex gap-1 justify-end">
                        <button
                          onClick={() => openEditSale(sale)}
                          className="text-xs px-2 py-1 rounded-lg bg-beige-100 text-cafe-warm hover:bg-beige-200 transition-colors"
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

