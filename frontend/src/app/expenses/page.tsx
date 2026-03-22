"use client";
import { useEffect, useState } from "react";
import { ExpenseResponse } from "@/types";
import { fetchExpenses, createExpense, deleteExpense, updateExpense } from "@/lib/api";

const CATEGORIES = ["Ingredients", "Packaging", "Equipment", "Other"] as const;
type Category = (typeof CATEGORIES)[number];
const UNITS = ["pcs", "kg", "g", "L", "mL", "cartons", "bags", "boxes", "bottles", "jars"];

type LineItem = { name: string; qty: string; unit: string; cost: string };
const BLANK_LINE = (): LineItem => ({ name: "", qty: "", unit: "cartons", cost: "" });

const CAT_STYLE: Record<Category, string> = {
  Ingredients: "bg-green-100 text-green-700",
  Packaging:   "bg-blue-100 text-blue-700",
  Equipment:   "bg-purple-100 text-purple-700",
  Other:       "bg-amber-100 text-amber-700",
};

function getCurrentMonthDays() {
  const today = new Date();
  const todayStr = today.toISOString().slice(0, 10);
  const yesterdayStr = (() => { const d = new Date(); d.setDate(d.getDate() - 1); return d.toISOString().slice(0, 10); })();
  const days = [];
  const d = new Date(today.getFullYear(), today.getMonth(), 1);
  while (d <= today) {
    const value = d.toISOString().slice(0, 10);
    const label =
      value === todayStr ? "Today" :
      value === yesterdayStr ? "Yesterday" :
      d.toLocaleDateString("en-NZ", { weekday: "short", day: "numeric" });
    days.push({ label, value });
    d.setDate(d.getDate() + 1);
  }
  return days.reverse(); // most recent first
}

export default function ExpensesPage() {
  const days = getCurrentMonthDays();
  const [selectedDate, setSelectedDate] = useState(days[0].value);
  const [expenses, setExpenses] = useState<ExpenseResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Form
  const [lineItems, setLineItems] = useState<LineItem[]>([BLANK_LINE()]);
  const [category, setCategory] = useState<Category>("Ingredients");
  const [expenseDate, setExpenseDate] = useState(days[0].value);
  const [expenseTime, setExpenseTime] = useState(() => {
    const n = new Date();
    return `${String(n.getHours()).padStart(2, "0")}:${String(n.getMinutes()).padStart(2, "0")}`;
  });
  const [paidFrom, setPaidFrom] = useState<"sales" | "own">("sales");
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const updateLine = (i: number, key: keyof LineItem, val: string) =>
    setLineItems(prev => prev.map((l, idx) => idx === i ? { ...l, [key]: val } : l));

  const addLine = () => setLineItems(prev => [...prev, BLANK_LINE()]);
  const removeLine = (i: number) => setLineItems(prev => prev.filter((_, idx) => idx !== i));

  const lineTotal = (l: LineItem) => {
    const q = parseFloat(l.qty); const c = parseFloat(l.cost);
    return !isNaN(q) && !isNaN(c) && q > 0 && c > 0 ? q * c : null;
  };
  const autoTotal = lineItems.reduce((s, l) => s + (lineTotal(l) ?? 0), 0);
  const hasTotal = autoTotal > 0;

  const load = async (date: string) => {
    setLoading(true);
    setError("");
    try {
      setExpenses(await fetchExpenses(date));
    } catch {
      setError("Could not load expenses. Is the backend running?");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(selectedDate); }, [selectedDate]);

  // Keep the form date in sync when switching tabs; reset time to now when on today's tab
  useEffect(() => {
    setExpenseDate(selectedDate);
    if (selectedDate === days[0].value) {
      const n = new Date();
      setExpenseTime(`${String(n.getHours()).padStart(2, "0")}:${String(n.getMinutes()).padStart(2, "0")}`);
    }
  }, [selectedDate]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const validLines = lineItems.filter(l => l.name.trim());
    if (validLines.length === 0) { setFormError("Add at least one item."); return; }
    if (!hasTotal) { setFormError("Enter quantity and cost for at least one item."); return; }
    setSubmitting(true); setFormError("");
    try {
      const description = validLines.map(l => {
        const q = parseFloat(l.qty);
        return `${l.name.trim()} ×${isNaN(q) ? l.qty : (q % 1 === 0 ? q : q.toFixed(2))} ${l.unit}`;
      }).join(", ");
      await createExpense({ amount: autoTotal, category, description, date: `${expenseDate}T${expenseTime}:00`, paid_from: paidFrom });
      setLineItems([BLANK_LINE()]);
      setPaidFrom("sales");
      setSelectedDate(expenseDate);
      await load(expenseDate);
    } catch {
      setFormError("Failed to add expense. Try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this expense?")) return;
    try {
      await deleteExpense(id);
      setExpenses((prev) => prev.filter((e) => e.id !== id));
    } catch { /* ignore */ }
  };

  // Edit expense
  const [editExp, setEditExp] = useState<ExpenseResponse | null>(null);
  const [editForm, setEditForm] = useState({ description: "", category: "Ingredients" as Category, amount: "", date: "", time: "", paid_from: "sales" as "sales" | "own" });
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState("");

  const openEditExpense = (exp: ExpenseResponse) => {
    const raw = exp.date.endsWith("Z") ? exp.date.slice(0, -1) : exp.date;
    const d = new Date(raw);
    const dateStr = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
    const timeStr = `${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")}`;
    setEditForm({ description: exp.description, category: exp.category as Category, amount: String(exp.amount), date: dateStr, time: timeStr, paid_from: (exp.paid_from ?? "sales") as "sales" | "own" });
    setEditError("");
    setEditExp(exp);
  };

  const handleSaveExpense = async () => {
    const amt = parseFloat(editForm.amount);
    if (isNaN(amt) || amt <= 0) { setEditError("Enter a valid amount."); return; }
    if (!editForm.description.trim()) { setEditError("Description is required."); return; }
    setEditSaving(true); setEditError("");
    try {
      const updated = await updateExpense(editExp!.id, {
        amount: amt,
        category: editForm.category,
        description: editForm.description.trim(),
        date: `${editForm.date}T${editForm.time}:00`,
        paid_from: editForm.paid_from,
      });
      setExpenses(prev => prev.map(e => e.id === updated.id ? updated : e));
      setEditExp(null);
    } catch { setEditError("Failed to save. Try again."); }
    finally { setEditSaving(false); }
  };

  const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0);
  const salesTotal = expenses.filter(e => (e.paid_from ?? "sales") === "sales").reduce((s, e) => s + e.amount, 0);
  const ownTotal = expenses.filter(e => (e.paid_from ?? "sales") === "own").reduce((s, e) => s + e.amount, 0);
  const byCategory = CATEGORIES.map((cat) => ({
    cat,
    total: expenses.filter((e) => e.category === cat).reduce((s, e) => s + e.amount, 0),
  })).filter((g) => g.total > 0);

  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold text-cafe-dark mb-5">Expenses</h1>

        {error && <div className="bg-red-100 border border-red-300 text-red-700 rounded-lg p-3 mb-4 text-sm">{error}</div>}

        {/* Add expense form */}
        <div className="bg-white rounded-2xl border border-beige-200 shadow-sm p-4 mb-6">
          <h2 className="text-sm font-semibold text-cafe-dark mb-3">Record an Expense</h2>
          <form onSubmit={handleAdd} className="space-y-3">

            {/* Date / Time / Category row */}
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-cafe-warm mb-1">Date</label>
                <input type="date" className="w-full border border-beige-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cafe-brown" value={expenseDate} onChange={(e) => setExpenseDate(e.target.value)} />
              </div>
              <div>
                <label className="block text-xs font-medium text-cafe-warm mb-1">Time</label>
                <input type="time" className="w-full border border-beige-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cafe-brown" value={expenseTime} onChange={(e) => setExpenseTime(e.target.value)} />
              </div>
              <div>
                <label className="block text-xs font-medium text-cafe-warm mb-1">Category</label>
                <select className="w-full border border-beige-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cafe-brown bg-white" value={category} onChange={(e) => setCategory(e.target.value as Category)}>
                  {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>

            {/* Paid From toggle */}
            <div>
              <label className="block text-xs font-medium text-cafe-warm mb-1">Paid From</label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setPaidFrom("sales")}
                  className={`flex-1 py-2 rounded-xl text-sm font-semibold border-2 transition-all ${
                    paidFrom === "sales"
                      ? "bg-cafe-brown text-white border-cafe-brown"
                      : "bg-white text-cafe-dark border-beige-200 hover:border-cafe-warm"
                  }`}
                >
                  💰 Sales Money
                </button>
                <button
                  type="button"
                  onClick={() => setPaidFrom("own")}
                  className={`flex-1 py-2 rounded-xl text-sm font-semibold border-2 transition-all ${
                    paidFrom === "own"
                      ? "bg-amber-500 text-white border-amber-500"
                      : "bg-white text-cafe-dark border-beige-200 hover:border-cafe-warm"
                  }`}
                >
                  👛 Own Money
                </button>
              </div>
            </div>

            {/* Line items */}
            <div className="space-y-2">
              <div className="grid grid-cols-[1fr_70px_80px_80px_28px] gap-1.5 text-[10px] font-semibold text-cafe-warm uppercase tracking-wide px-1">
                <span>Item Name</span><span className="text-center">Qty</span><span className="text-center">Unit</span><span className="text-right">Cost/unit</span><span></span>
              </div>
              {lineItems.map((line, i) => {
                const lt = lineTotal(line);
                return (
                  <div key={i} className="grid grid-cols-[1fr_70px_80px_80px_28px] gap-1.5 items-center">
                    <input
                      value={line.name}
                      onChange={e => updateLine(i, "name", e.target.value)}
                      placeholder="e.g. Oat Milk"
                      className="border border-beige-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-cafe-brown"
                    />
                    <input
                      type="number" min="0.01" step="any"
                      value={line.qty}
                      onChange={e => updateLine(i, "qty", e.target.value)}
                      placeholder="6"
                      className="border border-beige-300 rounded-lg px-2 py-1.5 text-sm text-center focus:outline-none focus:ring-2 focus:ring-cafe-brown"
                    />
                    <select
                      value={line.unit}
                      onChange={e => updateLine(i, "unit", e.target.value)}
                      className="border border-beige-300 rounded-lg px-1 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-cafe-brown bg-white"
                    >
                      {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                    </select>
                    <div className="relative">
                      <span className="absolute left-2 top-1/2 -translate-y-1/2 text-cafe-warm text-xs">$</span>
                      <input
                        type="number" min="0" step="0.01"
                        value={line.cost}
                        onChange={e => updateLine(i, "cost", e.target.value)}
                        placeholder="0.00"
                        className="w-full border border-beige-300 rounded-lg pl-5 pr-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-cafe-brown"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => lineItems.length > 1 ? removeLine(i) : setLineItems([BLANK_LINE()])}
                      className="text-red-300 hover:text-red-500 text-base leading-none transition-colors text-center"
                      title="Remove"
                    >✕</button>
                    {lt != null && (
                      <div className="col-span-5 text-right text-xs text-cafe-warm pr-8">
                        = <span className="font-semibold text-cafe-dark">${lt.toFixed(2)}</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <button type="button" onClick={addLine} className="text-xs text-cafe-brown font-semibold hover:text-cafe-dark transition-colors">
              + Add another item
            </button>

            {/* Total row */}
            {hasTotal && (
              <div className="flex items-center justify-between bg-beige-50 rounded-xl px-4 py-2.5 border border-beige-200">
                <span className="text-sm font-semibold text-cafe-dark">Total</span>
                <span className="text-lg font-bold text-cafe-dark">${autoTotal.toFixed(2)}</span>
              </div>
            )}

            {formError && <p className="text-xs text-red-600">{formError}</p>}
            <button
              type="submit"
              disabled={submitting}
              className="w-full py-2.5 bg-cafe-brown text-white text-sm font-semibold rounded-xl hover:bg-cafe-dark disabled:opacity-60 transition-colors"
            >
              {submitting ? "Adding…" : `+ Add Expense${hasTotal ? ` ($${autoTotal.toFixed(2)})` : ""}`}
            </button>
          </form>
        </div>

        {/* Day tabs */}
        <div className="flex gap-2 overflow-x-auto pb-2 mb-5">
          {days.map((day) => (
            <button
              key={day.value}
              onClick={() => setSelectedDate(day.value)}
              className={`shrink-0 px-4 py-2 rounded-xl text-sm font-semibold transition-all border-2 ${
                selectedDate === day.value
                  ? "bg-cafe-brown text-white border-cafe-brown shadow-md"
                  : "bg-white text-cafe-dark border-beige-200 hover:border-cafe-warm"
              }`}
            >
              {day.label}
            </button>
          ))}
        </div>

        {/* Summary cards */}
        {!loading && expenses.length > 0 && (
          <div className="grid grid-cols-2 gap-3 mb-5">
            <div className="bg-red-50 border border-red-100 rounded-2xl p-4">
              <p className="text-[11px] text-red-400 uppercase tracking-widest font-semibold">Total Expenses</p>
              <p className="text-2xl font-bold text-red-600 mt-1">${totalExpenses.toFixed(2)}</p>
              <div className="mt-2 space-y-0.5">
                {salesTotal > 0 && <p className="text-[11px] text-cafe-warm">💰 Sales: <span className="font-semibold text-cafe-dark">${salesTotal.toFixed(2)}</span></p>}
                {ownTotal > 0 && <p className="text-[11px] text-amber-600">👛 Own: <span className="font-semibold">${ownTotal.toFixed(2)}</span></p>}
              </div>
            </div>
            <div className="bg-white border border-beige-200 rounded-2xl p-4">
              <p className="text-[11px] text-cafe-warm uppercase tracking-widest font-semibold">By Category</p>
              <div className="mt-1 space-y-0.5">
                {byCategory.map(({ cat, total }) => (
                  <div key={cat} className="flex justify-between text-xs">
                    <span className={`px-1.5 py-0.5 rounded font-medium ${CAT_STYLE[cat as Category]}`}>{cat}</span>
                    <span className="font-semibold text-cafe-dark">${total.toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Expense list */}
        {loading ? (
          <p className="text-center text-cafe-warm py-10 animate-pulse">Loading…</p>
        ) : expenses.length === 0 ? (
          <div className="text-center py-16 text-cafe-warm/50">
            <p className="text-4xl mb-2">🧾</p>
            <p className="text-sm">No expenses recorded for this day</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-beige-200 shadow-sm overflow-hidden">
            <div className="px-4 py-3 bg-beige-50 border-b border-beige-200">
              <p className="text-sm text-cafe-warm font-medium">{expenses.length} expense{expenses.length !== 1 ? "s" : ""}</p>
            </div>
            <div className="divide-y divide-beige-100">
              {expenses.map((exp) => (
                <div key={exp.id} className="flex items-center justify-between px-4 py-3 hover:bg-beige-50 transition-colors">
                  <div className="min-w-0 mr-3">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${CAT_STYLE[exp.category as Category]}`}>
                        {exp.category}
                      </span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${
                        (exp.paid_from ?? "sales") === "own"
                          ? "bg-amber-100 text-amber-700"
                          : "bg-green-100 text-green-700"
                      }`}>
                        {(exp.paid_from ?? "sales") === "own" ? "👛 Own" : "💰 Sales"}
                      </span>
                      <span className="text-xs text-cafe-warm">
                        {new Date(exp.date).toLocaleTimeString("en-NZ", { timeStyle: "short" })}
                      </span>
                    </div>
                    <p className="text-sm text-cafe-dark truncate">{exp.description}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <p className="text-base font-bold text-red-600">−${exp.amount.toFixed(2)}</p>
                    <button
                      onClick={() => openEditExpense(exp)}
                      className="text-xs px-2 py-1 rounded-lg bg-beige-100 text-cafe-warm hover:bg-beige-200 transition-colors"
                      title="Edit"
                    >✏</button>
                    <button
                      onClick={() => handleDelete(exp.id)}
                      className="text-xs px-2 py-1 rounded-lg bg-red-50 text-red-400 hover:bg-red-100 transition-colors"
                      title="Delete"
                    >✕</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Edit Expense Modal */}
      {editExp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={e => e.target === e.currentTarget && setEditExp(null)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-cafe-dark">Edit Expense</h3>
              <button onClick={() => setEditExp(null)} className="text-cafe-warm hover:text-cafe-dark text-xl leading-none">×</button>
            </div>
            <div>
              <label className="block text-xs font-medium text-cafe-warm mb-1">Description</label>
              <input className="w-full border border-beige-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cafe-brown" value={editForm.description} onChange={e => setEditForm(f => ({...f, description: e.target.value}))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-cafe-warm mb-1">Category</label>
                <select className="w-full border border-beige-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cafe-brown bg-white" value={editForm.category} onChange={e => setEditForm(f => ({...f, category: e.target.value as Category}))}>
                  {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-cafe-warm mb-1">Amount ($)</label>
                <input type="number" min="0.01" step="0.01" className="w-full border border-beige-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cafe-brown" value={editForm.amount} onChange={e => setEditForm(f => ({...f, amount: e.target.value}))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-cafe-warm mb-1">Date</label>
                <input type="date" className="w-full border border-beige-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cafe-brown" value={editForm.date} onChange={e => setEditForm(f => ({...f, date: e.target.value}))} />
              </div>
              <div>
                <label className="block text-xs font-medium text-cafe-warm mb-1">Time</label>
                <input type="time" className="w-full border border-beige-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cafe-brown" value={editForm.time} onChange={e => setEditForm(f => ({...f, time: e.target.value}))} />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-cafe-warm mb-1">Paid From</label>
              <div className="flex gap-2">
                <button type="button" onClick={() => setEditForm(f => ({...f, paid_from: "sales"}))} className={`flex-1 py-1.5 rounded-xl text-xs font-semibold border-2 transition-all ${editForm.paid_from === "sales" ? "bg-cafe-brown text-white border-cafe-brown" : "bg-white text-cafe-dark border-beige-200"}`}>💰 Sales</button>
                <button type="button" onClick={() => setEditForm(f => ({...f, paid_from: "own"}))} className={`flex-1 py-1.5 rounded-xl text-xs font-semibold border-2 transition-all ${editForm.paid_from === "own" ? "bg-amber-500 text-white border-amber-500" : "bg-white text-cafe-dark border-beige-200"}`}>👛 Own</button>
              </div>
            </div>
            {editError && <p className="text-xs text-red-600">{editError}</p>}
            <div className="flex gap-3 pt-1">
              <button onClick={() => setEditExp(null)} className="flex-1 py-2 rounded-xl border-2 border-beige-200 text-sm text-cafe-dark font-semibold hover:bg-beige-50 transition-colors">Cancel</button>
              <button onClick={handleSaveExpense} disabled={editSaving} className="flex-1 py-2 rounded-xl bg-cafe-brown text-white text-sm font-semibold hover:bg-cafe-dark disabled:opacity-60 transition-colors">{editSaving ? "Saving…" : "Save Changes"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
