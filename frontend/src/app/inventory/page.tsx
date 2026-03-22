"use client";
import { useEffect, useState } from "react";
import { fetchInventory, createInventoryItem, updateInventoryItem, deleteInventoryItem, adjustInventoryItem, fetchExpenses, deleteExpense, updateExpense, fetchStockHistory } from "@/lib/api";
import { InventoryResponse, ExpenseResponse, StockLogEntry } from "@/types";

const CATEGORIES = ["Dairy", "Coffee", "Syrups & Flavours", "Packaging", "Cleaning", "Other"];
const UNITS = ["pcs", "kg", "g", "L", "mL", "cartons", "bags", "boxes", "bottles", "jars"];
const EXPENSE_CATS = new Set(["Ingredients", "Packaging", "Equipment", "Other"]);
const CAT_STYLE: Record<string, string> = {
  Ingredients: "bg-green-100 text-green-700",
  Packaging:   "bg-blue-100 text-blue-700",
  Equipment:   "bg-purple-100 text-purple-700",
  Other:       "bg-amber-100 text-amber-700",
};

const INV_TO_EXP: Record<string, string> = {
  Dairy: "Ingredients", Coffee: "Ingredients", "Syrups & Flavours": "Ingredients",
  Packaging: "Packaging", Equipment: "Equipment", Cleaning: "Other", Other: "Other",
};

function toLocalDateInputStr(isoStr: string): string {
  const raw = isoStr.endsWith("Z") ? isoStr.slice(0, -1) : isoStr;
  const d = new Date(raw);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function formatDate(isoStr: string): string {
  const raw = isoStr.endsWith("Z") ? isoStr.slice(0, -1) : isoStr;
  return new Date(raw).toLocaleDateString("en-NZ", { day: "numeric", month: "short", year: "numeric" });
}

const BLANK_FORM = {
  name: "", category: "Dairy", quantity: "", unit: "cartons",
  cost_per_unit: "", date_purchased: "", notes: "",
};

export default function InventoryPage() {
  const [items, setItems] = useState<InventoryResponse[]>([]);
  const [expenses, setExpenses] = useState<ExpenseResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterCat, setFilterCat] = useState("all");
  const [activeTab, setActiveTab] = useState<"stock" | "expenses" | "history">("stock");

  // History tab
  const [historyLogs, setHistoryLogs] = useState<StockLogEntry[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Add form
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ ...BLANK_FORM });
  const [logAsExpense, setLogAsExpense] = useState(true);
  const [addPaidFrom, setAddPaidFrom] = useState<"sales" | "own">("sales");
  const [addError, setAddError] = useState("");
  const [addSaving, setAddSaving] = useState(false);

  // Edit modal
  const [editItem, setEditItem] = useState<InventoryResponse | null>(null);
  const [editForm, setEditForm] = useState({ ...BLANK_FORM });
  const [editError, setEditError] = useState("");
  const [editSaving, setEditSaving] = useState(false);

  // Expense edit modal
  const [editExpense, setEditExpense] = useState<ExpenseResponse | null>(null);
  const [expForm, setExpForm] = useState({ description: "", category: "Ingredients", amount: "", date: "", time: "", paid_from: "sales" as "sales" | "own" });
  const [expSaving, setExpSaving] = useState(false);
  const [expError, setExpError] = useState("");

  // Adjust (use / restock) inline
  const [adjustItem, setAdjustItem] = useState<{ id: number; mode: "use" | "restock" } | null>(null);
  const [adjustQty, setAdjustQty] = useState("");
  const [adjustDate, setAdjustDate] = useState("");
  const [adjustSaving, setAdjustSaving] = useState(false);
  const [adjustError, setAdjustError] = useState("");

  const load = () => {
    setLoading(true);
    Promise.all([fetchInventory(), fetchExpenses(), fetchStockHistory()])
      .then(([inv, exp, logs]) => {
        // Exclude Equipment from inventory - it's managed separately in Assets
        const stockItems = inv.filter(i => i.category !== "Equipment");
        setItems(stockItems);
        setExpenses(exp.filter(e => EXPENSE_CATS.has(e.category)));
        setHistoryLogs(logs);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  useEffect(() => {
    if (activeTab === "history") {
      setHistoryLoading(true);
      fetchStockHistory().then(logs => { setHistoryLogs(logs); setHistoryLoading(false); }).catch(console.error);
    }
  }, [activeTab]);

  // Compute total spent per item by matching expense descriptions to item names
  // Expense descriptions are auto-formatted as: "{qty} {unit} of {item name}"
  const spentMap = new Map<number, number>();
  const boughtMap = new Map<number, number>();
  for (const item of items) {
    const key = ` of ${item.name.toLowerCase()}`;
    const matching = expenses.filter(e => e.description.toLowerCase().includes(key));
    const total = matching.reduce((s, e) => s + e.amount, 0);
    if (total > 0) spentMap.set(item.id, total);
    // Parse qty from description: "{qty} {unit} of {name}"
    const totalBought = matching.reduce((s, e) => {
      const qty = parseFloat(e.description.trim().split(/\s+/)[0]);
      return s + (isNaN(qty) ? 0 : qty);
    }, 0);
    if (totalBought > 0) boughtMap.set(item.id, totalBought);
  }

  const todayStr = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
  };

  const hasCost = parseFloat(form.cost_per_unit) > 0;
  const totalCost = hasCost && parseFloat(form.quantity) > 0
    ? parseFloat(form.cost_per_unit) * parseFloat(form.quantity) : null;

  const handleAdd = async () => {
    if (!form.name.trim()) { setAddError("Enter item name."); return; }
    const qty = parseFloat(form.quantity);
    if (isNaN(qty) || qty <= 0) { setAddError("Enter a valid quantity."); return; }
    setAddError(""); setAddSaving(true);
    try {
      await createInventoryItem({
        name: form.name.trim(),
        category: form.category,
        quantity: qty,
        unit: form.unit,
        cost_per_unit: form.cost_per_unit ? parseFloat(form.cost_per_unit) : undefined,
        date_purchased: form.date_purchased ? `${form.date_purchased}T12:00:00` : undefined,
        notes: form.notes.trim() || undefined,
        log_as_expense: hasCost ? logAsExpense : false,
        paid_from: addPaidFrom,
      });
      setForm({ ...BLANK_FORM, date_purchased: todayStr() });
      setShowAdd(false);
      load();
    } catch {
      setAddError("Failed to save. Try again.");
    } finally {
      setAddSaving(false);
    }
  };

  const openQuickAdd = (item: InventoryResponse) => {
    setForm({
      name: item.name,
      category: item.category,
      quantity: "",
      unit: item.unit,
      cost_per_unit: item.cost_per_unit != null ? String(item.cost_per_unit) : "",
      date_purchased: todayStr(),
      notes: "",
    });
    setLogAsExpense(true);
    setAddPaidFrom("sales");
    setAddError("");
    setShowAdd(true);
    setTimeout(() => document.getElementById("add-stock-form")?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
  };

  const openEdit = (item: InventoryResponse) => {
    setEditItem(item);
    setEditForm({
      name: item.name,
      category: item.category,
      quantity: String(item.quantity),
      unit: item.unit,
      cost_per_unit: item.cost_per_unit != null ? String(item.cost_per_unit) : "",
      date_purchased: toLocalDateInputStr(item.date_purchased),
      notes: item.notes ?? "",
    });
    setEditError("");
  };

  const handleEdit = async () => {
    if (!editItem) return;
    if (!editForm.name.trim()) { setEditError("Enter item name."); return; }
    const qty = parseFloat(editForm.quantity);
    if (isNaN(qty) || qty <= 0) { setEditError("Enter a valid quantity."); return; }
    setEditError(""); setEditSaving(true);
    try {
      await updateInventoryItem(editItem.id, {
        name: editForm.name.trim(),
        category: editForm.category,
        quantity: qty,
        unit: editForm.unit,
        cost_per_unit: editForm.cost_per_unit ? parseFloat(editForm.cost_per_unit) : null,
        notes: editForm.notes.trim() || "",
      });
      setEditItem(null);
      load();
    } catch {
      setEditError("Failed to save. Try again.");
    } finally {
      setEditSaving(false);
    }
  };

  const handleDelete = async (item: InventoryResponse) => {
    if (!confirm(`Delete "${item.name}" (${item.quantity} ${item.unit})?`)) return;
    await deleteInventoryItem(item.id).catch(console.error);
    load();
  };

  const handleDeleteExpense = async (exp: ExpenseResponse) => {
    if (!confirm(`Delete expense "${exp.description}" ($${exp.amount.toFixed(2)})?`)) return;
    await deleteExpense(exp.id).catch(console.error);
    load();
  };

  const openEditExpense = (exp: ExpenseResponse) => {
    const raw = exp.date.endsWith("Z") ? exp.date.slice(0, -1) : exp.date;
    const d = new Date(raw);
    const dateStr = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
    const timeStr = `${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")}`;
    setExpForm({ description: exp.description, category: exp.category, amount: String(exp.amount), date: dateStr, time: timeStr, paid_from: (exp.paid_from ?? "sales") as "sales" | "own" });
    setExpError("");
    setEditExpense(exp);
  };

  const handleSaveExpense = async () => {
    const amt = parseFloat(expForm.amount);
    if (isNaN(amt) || amt <= 0) { setExpError("Enter a valid amount."); return; }
    if (!expForm.description.trim()) { setExpError("Description is required."); return; }
    setExpSaving(true); setExpError("");
    try {
      const updated = await updateExpense(editExpense!.id, {
        amount: amt,
        category: expForm.category,
        description: expForm.description.trim(),
        date: `${expForm.date}T${expForm.time}:00`,
        paid_from: expForm.paid_from,
      });
      setExpenses(prev => prev.map(e => e.id === updated.id ? updated : e));
      setEditExpense(null);
    } catch {
      setExpError("Failed to save. Try again.");
    } finally {
      setExpSaving(false);
    }
  };

  const openAdjust = (item: InventoryResponse, mode: "use" | "restock") => {
    setAdjustItem({ id: item.id, mode });
    setAdjustQty("");
    setAdjustDate(todayStr());
    setAdjustError("");
  };

  const handleAdjust = async () => {
    if (!adjustItem) return;
    const qty = parseFloat(adjustQty);
    if (isNaN(qty) || qty <= 0) { setAdjustError("Enter a number greater than 0."); return; }
    setAdjustSaving(true); setAdjustError("");
    try {
      const delta = adjustItem.mode === "use" ? -qty : qty;
      const updated = await adjustInventoryItem(adjustItem.id, delta, adjustItem.mode === "restock" ? adjustDate : undefined);
      setItems(prev => prev.map(i => i.id === updated.id ? updated : i));
      setAdjustItem(null);
    } catch (e: unknown) {
      setAdjustError(e instanceof Error ? e.message : "Failed to update stock.");
    } finally {
      setAdjustSaving(false);
    }
  };

  const quickRestock = async (itemId: number, qty: number) => {
    setAdjustSaving(true);
    try {
      const updated = await adjustInventoryItem(itemId, qty, todayStr());
      setItems(prev => prev.map(i => i.id === updated.id ? updated : i));
    } catch (e: unknown) {
      console.error(e instanceof Error ? e.message : "Failed to update stock.");
    } finally {
      setAdjustSaving(false);
    }
  };

  const stockCategories = ["all", ...Array.from(new Set(items.map(i => i.category))).sort()];
  const filtered = filterCat === "all" ? items : items.filter(i => i.category === filterCat);
  const totalValue = items.reduce((s, i) => s + (i.cost_per_unit != null ? i.cost_per_unit * i.quantity : 0), 0);
  const totalExpenseValue = expenses.reduce((s, e) => s + e.amount, 0);
  const categoryCounts = new Map<string, number>();
  items.forEach(i => categoryCounts.set(i.category, (categoryCounts.get(i.category) ?? 0) + 1));

  const exportToCSV = () => {
    const headers = ["Item Name", "Category", "Quantity", "Unit", "Cost per Unit", "Total Value", "Date Purchased", "Notes"];
    const rows = items.map(item => [
      item.name,
      item.category,
      item.quantity,
      item.unit,
      item.cost_per_unit ?? "",
      ((item.cost_per_unit ?? 0) * item.quantity).toFixed(2),
      formatDate(item.date_purchased),
      item.notes ?? "",
    ]);
    
    const csvContent = [
      headers.join(","),
      `"INVENTORY REPORT","","","","","","","${new Date().toLocaleDateString()}"`,
      "",
      ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(",")),
      "",
      `"Total Stock Value","","","","","$${totalValue.toFixed(2)}","",""`
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `inventory_${new Date().toISOString().slice(0, 10)}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="h-full overflow-y-auto p-6">
      {/* Expense edit modal */}
      {editExpense && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-xl p-6 max-w-sm w-full space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-cafe-dark">Edit Expense</h2>
              <button onClick={() => setEditExpense(null)} className="text-cafe-warm hover:text-cafe-dark text-xl font-bold">✕</button>
            </div>
            <div>
              <label className="block text-xs font-medium text-cafe-warm mb-1">Description</label>
              <input className="w-full border border-beige-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cafe-brown" value={expForm.description} onChange={e => setExpForm(f => ({...f, description: e.target.value}))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-cafe-warm mb-1">Category</label>
                <select className="w-full border border-beige-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cafe-brown bg-white" value={expForm.category} onChange={e => setExpForm(f => ({...f, category: e.target.value}))}>
                  {["Ingredients","Packaging","Equipment","Other"].map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-cafe-warm mb-1">Amount ($)</label>
                <input type="number" min="0.01" step="0.01" className="w-full border border-beige-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cafe-brown" value={expForm.amount} onChange={e => setExpForm(f => ({...f, amount: e.target.value}))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-cafe-warm mb-1">Date</label>
                <input type="date" className="w-full border border-beige-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cafe-brown" value={expForm.date} onChange={e => setExpForm(f => ({...f, date: e.target.value}))} />
              </div>
              <div>
                <label className="block text-xs font-medium text-cafe-warm mb-1">Time</label>
                <input type="time" className="w-full border border-beige-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cafe-brown" value={expForm.time} onChange={e => setExpForm(f => ({...f, time: e.target.value}))} />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-cafe-warm mb-1">Paid From</label>
              <div className="flex gap-2">
                <button type="button" onClick={() => setExpForm(f => ({...f, paid_from: "sales"}))} className={`flex-1 py-1.5 rounded-xl text-xs font-semibold border-2 transition-all ${expForm.paid_from === "sales" ? "bg-cafe-brown text-white border-cafe-brown" : "bg-white text-cafe-dark border-beige-200"}` }>💰 Sales</button>
                <button type="button" onClick={() => setExpForm(f => ({...f, paid_from: "own"}))} className={`flex-1 py-1.5 rounded-xl text-xs font-semibold border-2 transition-all ${expForm.paid_from === "own" ? "bg-amber-500 text-white border-amber-500" : "bg-white text-cafe-dark border-beige-200"}`}>👛 Own</button>
              </div>
            </div>
            {expError && <p className="text-xs text-red-600">{expError}</p>}
            <div className="flex gap-3 pt-1">
              <button onClick={() => setEditExpense(null)} className="flex-1 py-2.5 text-sm font-semibold bg-beige-100 text-cafe-warm rounded-xl hover:bg-beige-200 transition-colors">Cancel</button>
              <button onClick={handleSaveExpense} disabled={expSaving} className="flex-1 py-2.5 text-sm font-semibold bg-cafe-brown text-white rounded-xl hover:bg-cafe-dark disabled:opacity-60 transition-colors">{expSaving ? "Saving…" : "Save"}</button>
            </div>
          </div>
        </div>
      )}

      {/* Edit modal */}
      {editItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-xl p-6 max-w-sm w-full space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-cafe-dark">Edit Item</h2>
              <button onClick={() => setEditItem(null)} className="text-cafe-warm hover:text-cafe-dark text-xl font-bold">✕</button>
            </div>
            <FormFields form={editForm} setForm={setEditForm} />
            {editError && <p className="text-xs text-red-600">{editError}</p>}
            <div className="flex gap-3 pt-1">
              <button onClick={() => setEditItem(null)} className="flex-1 py-2.5 text-sm font-semibold bg-beige-100 text-cafe-warm rounded-xl hover:bg-beige-200 transition-colors">Cancel</button>
              <button onClick={handleEdit} disabled={editSaving} className="flex-1 py-2.5 text-sm font-semibold bg-cafe-brown text-white rounded-xl hover:bg-cafe-dark disabled:opacity-60 transition-colors">{editSaving ? "Saving…" : "Save"}</button>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <h1 className="text-2xl font-bold text-cafe-dark">Inventory</h1>
          <div className="flex gap-2">
            <button
              onClick={exportToCSV}
              className="px-4 py-2 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-colors"
            >
              ⬇ Export CSV
            </button>
            <button
              onClick={() => { setShowAdd(v => !v); setForm({ ...BLANK_FORM, date_purchased: todayStr() }); setAddError(""); setLogAsExpense(true); setAddPaidFrom("sales"); }}
              className="px-4 py-2 rounded-xl bg-cafe-brown text-white text-sm font-semibold hover:bg-cafe-dark transition-colors"
            >
              + Add Stock
            </button>
          </div>
        </div>

        {/* Add form */}
        {showAdd && (
          <div id="add-stock-form" className="bg-white rounded-2xl border border-beige-200 shadow-sm p-5 mb-5 space-y-3">
            <h2 className="font-semibold text-cafe-dark">Add Stock Purchase</h2>
            <FormFields form={form} setForm={setForm} />
            {hasCost && (
              <div className="space-y-2">
                <label className="flex items-center gap-3 cursor-pointer bg-green-50 border border-green-200 rounded-xl px-4 py-3 select-none">
                  <input type="checkbox" checked={logAsExpense} onChange={e => setLogAsExpense(e.target.checked)} className="w-4 h-4 accent-cafe-brown" />
                  <div>
                    <p className="text-sm font-semibold text-green-800">
                      Also log as expense{totalCost != null && <span className="ml-1 text-green-600">(${totalCost.toFixed(2)})</span>}
                    </p>
                    <p className="text-xs text-green-600">Adds to Expenses › {INV_TO_EXP[form.category] ?? "Other"}</p>
                  </div>
                </label>
                {logAsExpense && (
                  <div>
                    <p className="text-xs font-medium text-cafe-warm mb-1">Paid From</p>
                    <div className="flex gap-2">
                      <button type="button" onClick={() => setAddPaidFrom("sales")} className={`flex-1 py-1.5 rounded-xl text-xs font-semibold border-2 transition-all ${
                        addPaidFrom === "sales" ? "bg-cafe-brown text-white border-cafe-brown" : "bg-white text-cafe-dark border-beige-200 hover:border-cafe-warm"
                      }`}>💰 Sales Money</button>
                      <button type="button" onClick={() => setAddPaidFrom("own")} className={`flex-1 py-1.5 rounded-xl text-xs font-semibold border-2 transition-all ${
                        addPaidFrom === "own" ? "bg-amber-500 text-white border-amber-500" : "bg-white text-cafe-dark border-beige-200 hover:border-cafe-warm"
                      }`}>👛 Own Money</button>
                    </div>
                  </div>
                )}
              </div>
            )}
            {addError && <p className="text-xs text-red-600">{addError}</p>}
            <div className="flex gap-3">
              <button onClick={() => setShowAdd(false)} className="flex-1 py-2.5 text-sm font-semibold bg-beige-100 text-cafe-warm rounded-xl hover:bg-beige-200 transition-colors">Cancel</button>
              <button onClick={handleAdd} disabled={addSaving} className="flex-1 py-2.5 text-sm font-semibold bg-cafe-brown text-white rounded-xl hover:bg-cafe-dark disabled:opacity-60 transition-colors">{addSaving ? "Saving…" : "Save"}</button>
            </div>
          </div>
        )}

        {/* Summary cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
          <div className="bg-white rounded-2xl p-4 border border-beige-200 shadow-sm">
            <p className="text-[11px] text-cafe-warm uppercase tracking-widest font-semibold">Stock Items</p>
            <p className="text-2xl font-bold text-cafe-dark mt-1">{items.length}</p>
          </div>
          <div className="bg-white rounded-2xl p-4 border border-beige-200 shadow-sm">
            <p className="text-[11px] text-cafe-warm uppercase tracking-widest font-semibold">Stock Value</p>
            <p className="text-2xl font-bold text-cafe-dark mt-1">${totalValue.toFixed(2)}</p>
          </div>
          <div className="bg-white rounded-2xl p-4 border border-beige-200 shadow-sm">
            <p className="text-[11px] text-cafe-warm uppercase tracking-widest font-semibold">Expense Records</p>
            <p className="text-2xl font-bold text-cafe-dark mt-1">{expenses.length}</p>
          </div>
          <div className="bg-white rounded-2xl p-4 border border-beige-200 shadow-sm">
            <p className="text-[11px] text-cafe-warm uppercase tracking-widest font-semibold">Total Spent</p>
            <p className="text-2xl font-bold text-cafe-dark mt-1">${totalExpenseValue.toFixed(2)}</p>
          </div>
        </div>

        {/* Tab switcher */}
        <div className="flex gap-2 mb-4">
          {(["stock", "expenses", "history"] as const).map(t => (
            <button key={t} onClick={() => setActiveTab(t)} className={`px-4 py-2 text-sm font-semibold rounded-xl transition-colors ${activeTab === t ? "bg-cafe-brown text-white" : "bg-white border border-beige-200 text-cafe-warm hover:border-cafe-brown/50"}`}>
              {t === "stock" ? "📦 Stock" : t === "expenses" ? "🧾 Expense Records" : "📊 History"}
            </button>
          ))}
        </div>

        {loading ? (
          <p className="text-cafe-warm text-center py-12 animate-pulse">Loading…</p>
        ) : activeTab === "stock" ? (
          <>
            <div className="flex gap-2 overflow-x-auto pb-2 mb-4">
              {stockCategories.map(cat => (
                <button key={cat} onClick={() => setFilterCat(cat)} className={`shrink-0 px-3 py-1.5 text-xs font-semibold rounded-full transition-colors ${filterCat === cat ? "bg-cafe-brown text-white" : "bg-white border border-beige-200 text-cafe-warm hover:border-cafe-brown/50"}`}>
                  {cat === "all" ? `All (${items.length})` : `${cat} (${categoryCounts.get(cat) ?? 0})`}
                </button>
              ))}
            </div>
            {filtered.length === 0 ? (
              <div className="text-center py-20 text-cafe-warm/50">
                <p className="text-5xl mb-3">📦</p>
                <p>{filterCat === "all" ? "No stock recorded yet" : `No items in ${filterCat}`}</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {filtered.map(item => {
                  const isAdjusting = adjustItem?.id === item.id;
                  const isLow = item.quantity > 0 && item.quantity <= 2;
                  const isOut = item.quantity <= 0;
                  const totalBought = boughtMap.get(item.id) ?? 0;
                  const totalSpent = spentMap.get(item.id) ?? 0;
                  const totalUsed = totalBought > 0 ? Math.max(0, totalBought - item.quantity) : 0;
                  const qtyDisplay = item.quantity % 1 === 0 ? String(item.quantity) : item.quantity.toFixed(2);

                  return (
                    <div key={item.id} className={`bg-white rounded-2xl border shadow-sm flex flex-col transition-all ${isOut ? "border-red-200" : isLow ? "border-amber-200" : "border-beige-200"}`}>
                      {/* Card header */}
                      <div className={`px-4 pt-4 pb-3 rounded-t-2xl ${isOut ? "bg-red-50/60" : isLow ? "bg-amber-50/40" : ""}`}>
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="font-bold text-cafe-dark text-base leading-tight truncate">{item.name}</p>
                            {item.notes && <p className="text-[11px] text-cafe-warm mt-0.5 truncate">{item.notes}</p>}
                          </div>
                          {isOut
                            ? <span className="shrink-0 text-[10px] font-bold text-red-600 bg-red-100 px-2 py-0.5 rounded-full">OUT</span>
                            : isLow
                            ? <span className="shrink-0 text-[10px] font-bold text-amber-600 bg-amber-100 px-2 py-0.5 rounded-full">LOW</span>
                            : <span className="shrink-0 text-[10px] font-semibold text-green-700 bg-green-100 px-2 py-0.5 rounded-full">OK</span>}
                        </div>
                        <div className="flex items-center gap-2 mt-2">
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-beige-100 text-cafe-warm">{item.category}</span>
                          <span className="text-[10px] text-cafe-warm/60">restocked {formatDate(item.date_purchased)}</span>
                        </div>
                      </div>

                      {/* Qty + stats */}
                      <div className="px-4 py-3 flex items-center gap-4 border-t border-beige-100">
                        <div className="text-center">
                          <p className={`text-3xl font-black leading-none ${isOut ? "text-red-500" : isLow ? "text-amber-500" : "text-cafe-dark"}`}>{qtyDisplay}</p>
                          <p className="text-[10px] text-cafe-warm mt-0.5">{item.unit} in stock</p>
                        </div>
                        <div className="flex-1 grid grid-cols-3 gap-2 text-center border-l border-beige-100 pl-4">
                          <div>
                            <p className="text-xs font-bold text-blue-700">{totalBought > 0 ? (totalBought % 1 === 0 ? totalBought : totalBought.toFixed(1)) : "—"}</p>
                            <p className="text-[9px] text-cafe-warm/70 uppercase tracking-wide">Bought</p>
                          </div>
                          <div>
                            <p className="text-xs font-bold text-orange-600">{totalUsed > 0 ? (totalUsed % 1 === 0 ? totalUsed : totalUsed.toFixed(1)) : "—"}</p>
                            <p className="text-[9px] text-cafe-warm/70 uppercase tracking-wide">Used</p>
                          </div>
                          <div>
                            <p className="text-xs font-bold text-cafe-dark">{totalSpent > 0 ? `$${totalSpent.toFixed(0)}` : "—"}</p>
                            <p className="text-[9px] text-cafe-warm/70 uppercase tracking-wide">Spent</p>
                          </div>
                        </div>
                      </div>

                      {/* Adjust inline panel */}
                      {isAdjusting && (
                        <div className={`px-4 py-3 border-t ${adjustItem!.mode === "use" ? "bg-amber-50 border-amber-100" : "bg-green-50 border-green-100"}`}>
                          <p className="text-xs font-semibold text-cafe-dark mb-2">
                            {adjustItem!.mode === "use" ? `⬇ How many ${item.unit} used?` : `⬆ How many ${item.unit} restocked?`}
                          </p>
                          <div className="flex flex-wrap gap-2 items-center">
                            {adjustItem!.mode === "restock" && (
                              <input type="date" value={adjustDate} max={todayStr()} onChange={e => setAdjustDate(e.target.value)} className="border border-beige-300 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-cafe-brown bg-white" />
                            )}
                            <input
                              autoFocus
                              type="number" min="0.01" step="any"
                              placeholder={`qty in ${item.unit}`}
                              value={adjustQty}
                              onChange={e => setAdjustQty(e.target.value)}
                              onKeyDown={e => { if (e.key === "Enter") handleAdjust(); if (e.key === "Escape") setAdjustItem(null); }}
                              className="w-28 border border-beige-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-cafe-brown bg-white"
                            />
                            <button onClick={handleAdjust} disabled={adjustSaving} className={`px-3 py-1.5 text-xs font-semibold rounded-lg text-white disabled:opacity-60 transition-colors ${adjustItem!.mode === "use" ? "bg-amber-500 hover:bg-amber-600" : "bg-green-600 hover:bg-green-700"}`}>{adjustSaving ? "…" : "Confirm"}</button>
                            <button onClick={() => setAdjustItem(null)} className="px-2 py-1.5 text-xs rounded-lg bg-white border border-beige-200 text-cafe-warm hover:bg-beige-50 transition-colors">Cancel</button>
                          </div>
                          {adjustError && <p className="text-xs text-red-600 mt-1">{adjustError}</p>}
                        </div>
                      )}

                      {/* Quick restock buttons */}
                      {!isAdjusting && (
                        <div className="px-4 py-2 border-t border-beige-100 grid grid-cols-4 gap-1.5">
                          <button
                            onClick={() => quickRestock(item.id, 1)}
                            disabled={adjustSaving}
                            className="py-1.5 text-xs font-semibold rounded-lg bg-green-100 text-green-700 hover:bg-green-200 disabled:opacity-60 transition-colors"
                            title="Add 1 unit"
                          >+1</button>
                          <button
                            onClick={() => quickRestock(item.id, 5)}
                            disabled={adjustSaving}
                            className="py-1.5 text-xs font-semibold rounded-lg bg-green-100 text-green-700 hover:bg-green-200 disabled:opacity-60 transition-colors"
                            title="Add 5 units"
                          >+5</button>
                          <button
                            onClick={() => quickRestock(item.id, 10)}
                            disabled={adjustSaving}
                            className="py-1.5 text-xs font-semibold rounded-lg bg-green-100 text-green-700 hover:bg-green-200 disabled:opacity-60 transition-colors"
                            title="Add 10 units"
                          >+10</button>
                          <button
                            onClick={() => openAdjust(item, "restock")}
                            className="py-1.5 text-xs font-semibold rounded-lg bg-green-50 text-green-700 border border-green-200 hover:bg-green-100 transition-colors"
                            title="Add custom qty"
                          >+...</button>
                        </div>
                      )}

                      {/* Action buttons */}
                      <div className="px-4 py-3 border-t border-beige-100 flex items-center gap-2 mt-auto">
                        <button
                          onClick={() => openAdjust(item, "use")}
                          className="flex-1 py-2 text-sm font-semibold rounded-xl border-2 border-amber-200 text-amber-600 hover:bg-amber-50 active:bg-amber-100 transition-colors"
                          title="Use stock"
                        >− Use</button>
                        <button onClick={() => openEdit(item)} className="p-2 rounded-xl bg-beige-100 text-cafe-warm hover:bg-beige-200 transition-colors text-sm" title="Edit">✏</button>
                        <button onClick={() => handleDelete(item)} className="p-2 rounded-xl bg-red-50 text-red-400 hover:bg-red-100 transition-colors text-sm" title="Delete">🗑</button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        ) : activeTab === "expenses" ? (
          /* Expense Records tab */
          <>
            <p className="text-xs text-cafe-warm mb-3">All Ingredients, Packaging &amp; Equipment entries from the Expenses ledger.</p>
            {expenses.length === 0 ? (
              <div className="text-center py-20 text-cafe-warm/50">
                <p className="text-5xl mb-3">🧾</p>
                <p>No ingredient or stock expenses recorded yet</p>
              </div>
            ) : (
              <div className="bg-white rounded-2xl shadow-sm border border-beige-200 overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-beige-100">
                    <tr>
                      <th className="text-left px-4 py-3 text-cafe-warm font-semibold">Description</th>
                      <th className="text-left px-4 py-3 text-cafe-warm font-semibold">Category</th>
                      <th className="text-left px-4 py-3 text-cafe-warm font-semibold">Paid From</th>
                      <th className="text-right px-4 py-3 text-cafe-warm font-semibold">Amount</th>
                      <th className="text-left px-4 py-3 text-cafe-warm font-semibold">Date</th>
                      <th className="px-4 py-3"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-beige-100">
                    {expenses.map(exp => (
                      <tr key={exp.id} className="hover:bg-beige-50 transition-colors">
                        <td className="px-4 py-3 text-cafe-dark">{exp.description}</td>
                        <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${CAT_STYLE[exp.category] ?? "bg-amber-100 text-amber-700"}`}>{exp.category}</span></td>
                        <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${ (exp.paid_from ?? "sales") === "own" ? "bg-amber-100 text-amber-700" : "bg-green-100 text-green-700" }`}>{(exp.paid_from ?? "sales") === "own" ? "👛 Own" : "💰 Sales"}</span></td>
                        <td className="px-4 py-3 text-right font-semibold text-cafe-dark">${exp.amount.toFixed(2)}</td>
                        <td className="px-4 py-3 text-cafe-warm text-xs whitespace-nowrap">{formatDate(exp.date)}</td>
                        <td className="px-2 py-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button onClick={() => openEditExpense(exp)} className="text-xs px-2 py-1 rounded-lg bg-beige-100 text-cafe-warm hover:bg-beige-200 transition-colors" title="Edit">✏</button>
                            <button onClick={() => handleDeleteExpense(exp)} className="text-xs px-2 py-1 rounded-lg bg-red-50 text-red-400 hover:bg-red-100 transition-colors" title="Delete">🗑</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-beige-50 border-t border-beige-200">
                    <tr>
                      <td colSpan={3} className="px-4 py-3 text-sm font-bold text-cafe-dark">Total</td>
                      <td className="px-4 py-3 text-right text-sm font-bold text-cafe-dark">${totalExpenseValue.toFixed(2)}</td>
                      <td colSpan={2}></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </>
        ) : (
          /* History tab */
          <>
            <p className="text-xs text-cafe-warm mb-3">All stock additions, restocks, and usage recorded from this point forward.</p>
            {historyLoading ? (
              <p className="text-cafe-warm text-center py-12 animate-pulse">Loading…</p>
            ) : historyLogs.length === 0 ? (
              <div className="text-center py-16 text-cafe-warm/50">
                <p className="text-5xl mb-3">📊</p>
                <p className="text-sm">No stock history recorded yet</p>
              </div>
            ) : (
              <div className="bg-white rounded-2xl shadow-sm border border-beige-200 overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-beige-100">
                    <tr>
                      <th className="text-left px-4 py-3 text-cafe-warm font-semibold">Item</th>
                      <th className="text-left px-4 py-3 text-cafe-warm font-semibold">Action</th>
                      <th className="text-right px-4 py-3 text-cafe-warm font-semibold">Change</th>
                      <th className="text-right px-4 py-3 text-cafe-warm font-semibold">Stock After</th>
                      <th className="text-left px-4 py-3 text-cafe-warm font-semibold">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-beige-100">
                    {historyLogs.map(log => {
                      const actionStyle = log.action === "added" ? "bg-green-100 text-green-700" :
                        log.action === "restocked" ? "bg-blue-100 text-blue-700" :
                        log.action === "used" ? "bg-orange-100 text-orange-700" :
                        "bg-red-100 text-red-700";
                      const actionLabel = log.action === "added" ? "➕ Added" :
                        log.action === "restocked" ? "⬆️ Restocked" :
                        log.action === "used" ? "⬇️ Used" : "🗑️ Deleted";
                      const deltaStr = log.delta >= 0 ? `+${log.delta} ${log.unit ?? ""}` : `${log.delta} ${log.unit ?? ""}`;
                      const raw = log.date.endsWith("Z") ? log.date.slice(0, -1) : log.date;
                      const dateLabel = new Date(raw).toLocaleDateString("en-NZ", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
                      return (
                        <tr key={log.id} className="hover:bg-beige-50 transition-colors">
                          <td className="px-4 py-3">
                            <p className="font-semibold text-cafe-dark">{log.item_name}</p>
                            {log.category && <p className="text-xs text-cafe-warm">{log.category}</p>}
                          </td>
                          <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${actionStyle}`}>{actionLabel}</span></td>
                          <td className={`px-4 py-3 text-right font-semibold ${log.delta >= 0 ? "text-green-700" : "text-orange-700"}`}>{deltaStr}</td>
                          <td className="px-4 py-3 text-right text-cafe-dark">{log.quantity_after ?? "—"} {log.unit ?? ""}</td>
                          <td className="px-4 py-3 text-cafe-warm text-xs whitespace-nowrap">{dateLabel}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ── Shared form fields ────────────────────────────────────────────────────────
type FormState = {
  name: string; category: string; quantity: string; unit: string;
  cost_per_unit: string; date_purchased: string; notes: string;
};

function FormFields({ form, setForm }: { form: FormState; setForm: React.Dispatch<React.SetStateAction<FormState>> }) {
  const set = (key: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(prev => ({ ...prev, [key]: e.target.value }));

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <label className="block text-xs font-medium text-cafe-warm mb-1">Item Name *</label>
          <input value={form.name} onChange={set("name")} placeholder="e.g. Oat Milk" className="w-full border border-beige-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cafe-brown" />
        </div>
        <div>
          <label className="block text-xs font-medium text-cafe-warm mb-1">Category *</label>
          <select value={form.category} onChange={set("category")} className="w-full border border-beige-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cafe-brown bg-white">
            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-cafe-warm mb-1">Date Purchased</label>
          <input type="date" value={form.date_purchased} onChange={set("date_purchased")} className="w-full border border-beige-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cafe-brown" />
        </div>
        <div>
          <label className="block text-xs font-medium text-cafe-warm mb-1">Quantity *</label>
          <input type="number" min="0" step="any" value={form.quantity} onChange={set("quantity")} placeholder="e.g. 6" className="w-full border border-beige-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cafe-brown" />
        </div>
        <div>
          <label className="block text-xs font-medium text-cafe-warm mb-1">Unit *</label>
          <select value={form.unit} onChange={set("unit")} className="w-full border border-beige-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cafe-brown bg-white">
            {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-cafe-warm mb-1">Cost per Unit (optional)</label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-cafe-warm text-sm">$</span>
            <input type="number" min="0" step="0.01" value={form.cost_per_unit} onChange={set("cost_per_unit")} placeholder="0.00" className="w-full border border-beige-300 rounded-lg pl-7 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cafe-brown" />
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-cafe-warm mb-1">Notes (optional)</label>
          <input value={form.notes} onChange={set("notes")} placeholder="e.g. Oat Barista, Pam's…" className="w-full border border-beige-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cafe-brown" />
        </div>
      </div>
    </div>
  );
}
