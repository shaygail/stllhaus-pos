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
  Ingredients: "border border-stll-charcoal/10 bg-stll-cream/50 text-stll-charcoal",
  Packaging: "border border-stll-accent/25 bg-stll-cream/30 text-stll-charcoal",
  Equipment: "border border-stll-charcoal/10 bg-white text-stll-muted",
  Other: "border border-stll-charcoal/10 bg-white text-stll-muted",
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
    <div className="stll-page">
      <div className="stll-page-inner max-w-2xl pb-20">
        <h1 className="stll-h1">Expenses</h1>

        {error && (
          <div className="mb-4 rounded-lg border border-red-100 bg-red-50/80 p-3 text-sm text-red-800">{error}</div>
        )}

        <div className="stll-card mb-6 p-5">
          <p className="stll-section-title mb-3">Record expense</p>
          <form onSubmit={handleAdd} className="space-y-4">

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div>
                <label className="stll-section-title mb-1.5 block">Date</label>
                <input type="date" className="stll-input" value={expenseDate} onChange={(e) => setExpenseDate(e.target.value)} />
              </div>
              <div>
                <label className="stll-section-title mb-1.5 block">Time</label>
                <input type="time" className="stll-input" value={expenseTime} onChange={(e) => setExpenseTime(e.target.value)} />
              </div>
              <div>
                <label className="stll-section-title mb-1.5 block">Category</label>
                <select
                  className="stll-input bg-white"
                  value={category}
                  onChange={(e) => setCategory(e.target.value as Category)}
                >
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="stll-section-title mb-2 block">Paid from</label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setPaidFrom("sales")}
                  className={`flex-1 rounded-lg border py-2.5 text-xs font-medium uppercase tracking-wide transition-colors ${
                    paidFrom === "sales"
                      ? "border-stll-charcoal bg-stll-charcoal text-stll-cream"
                      : "border-stll-charcoal/15 bg-white text-stll-muted hover:border-stll-charcoal/25"
                  }`}
                >
                  Sales
                </button>
                <button
                  type="button"
                  onClick={() => setPaidFrom("own")}
                  className={`flex-1 rounded-lg border py-2.5 text-xs font-medium uppercase tracking-wide transition-colors ${
                    paidFrom === "own"
                      ? "border-stll-sage bg-stll-sage/25 text-stll-charcoal"
                      : "border-stll-charcoal/15 bg-white text-stll-muted hover:border-stll-charcoal/25"
                  }`}
                >
                  Own
                </button>
              </div>
            </div>

            {/* Line items */}
            <div className="space-y-2">
              <div className="grid grid-cols-[1fr_70px_80px_80px_28px] gap-1.5 px-1 text-[10px] font-medium uppercase tracking-[0.14em] text-stll-muted">
                <span>Item</span>
                <span className="text-center">Qty</span>
                <span className="text-center">Unit</span>
                <span className="text-right">Cost</span>
                <span />
              </div>
              {lineItems.map((line, i) => {
                const lt = lineTotal(line);
                return (
                  <div key={i} className="grid grid-cols-[1fr_70px_80px_80px_28px] items-center gap-1.5">
                    <input
                      value={line.name}
                      onChange={(e) => updateLine(i, "name", e.target.value)}
                      placeholder="e.g. Oat milk"
                      className="stll-input py-1.5 text-sm"
                    />
                    <input
                      type="number"
                      min="0.01"
                      step="any"
                      value={line.qty}
                      onChange={(e) => updateLine(i, "qty", e.target.value)}
                      placeholder="6"
                      className="stll-input py-1.5 text-center text-sm"
                    />
                    <select
                      value={line.unit}
                      onChange={(e) => updateLine(i, "unit", e.target.value)}
                      className="stll-input bg-white py-1.5 text-sm"
                    >
                      {UNITS.map((u) => (
                        <option key={u} value={u}>
                          {u}
                        </option>
                      ))}
                    </select>
                    <div className="relative">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-stll-muted">$</span>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={line.cost}
                        onChange={(e) => updateLine(i, "cost", e.target.value)}
                        placeholder="0.00"
                        className="stll-input w-full py-1.5 pl-6 pr-2 text-sm"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => (lineItems.length > 1 ? removeLine(i) : setLineItems([BLANK_LINE()]))}
                      className="text-center text-lg leading-none text-stll-muted transition-colors hover:text-red-600"
                      title="Remove"
                    >
                      ×
                    </button>
                    {lt != null && (
                      <div className="col-span-5 text-right text-xs text-stll-muted pr-8">
                        = <span className="font-semibold text-stll-charcoal">${lt.toFixed(2)}</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <button
              type="button"
              onClick={addLine}
              className="text-xs font-medium uppercase tracking-wide text-stll-accent transition-colors hover:text-stll-charcoal"
            >
              + Add line
            </button>

            {hasTotal && (
              <div className="flex items-center justify-between rounded-lg border border-stll-charcoal/10 bg-stll-cream/40 px-4 py-3">
                <span className="text-xs font-medium uppercase tracking-[0.12em] text-stll-muted">Total</span>
                <span className="text-lg font-medium tabular-nums text-stll-charcoal">${autoTotal.toFixed(2)}</span>
              </div>
            )}

            {formError && <p className="text-xs text-red-600">{formError}</p>}
            <button type="submit" disabled={submitting} className="stll-btn-primary w-full uppercase tracking-wide">
              {submitting ? "Saving…" : hasTotal ? `Save · $${autoTotal.toFixed(2)}` : "Save expense"}
            </button>
          </form>
        </div>

        <div className="mb-6 flex gap-2 overflow-x-auto pb-1">
          {days.map((day) => (
            <button
              key={day.value}
              type="button"
              onClick={() => setSelectedDate(day.value)}
              className={`shrink-0 rounded-lg border px-4 py-2 text-sm font-medium transition-colors ${
                selectedDate === day.value
                  ? "border-stll-charcoal bg-stll-charcoal text-stll-cream"
                  : "border-stll-charcoal/15 bg-white text-stll-muted hover:border-stll-charcoal/25 hover:text-stll-charcoal"
              }`}
            >
              {day.label}
            </button>
          ))}
        </div>

        {!loading && expenses.length > 0 && (
          <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="stll-card border-l-2 border-l-stll-accent p-4">
              <p className="stll-section-title mb-1">Day total</p>
              <p className="text-2xl font-medium tabular-nums text-stll-charcoal">${totalExpenses.toFixed(2)}</p>
              <div className="mt-3 space-y-1 border-t border-stll-charcoal/10 pt-3 text-xs text-stll-muted">
                {salesTotal > 0 && (
                  <p>
                    From sales <span className="font-medium tabular-nums text-stll-charcoal">${salesTotal.toFixed(2)}</span>
                  </p>
                )}
                {ownTotal > 0 && (
                  <p>
                    Own funds <span className="font-medium tabular-nums text-stll-charcoal">${ownTotal.toFixed(2)}</span>
                  </p>
                )}
              </div>
            </div>
            <div className="stll-card p-4">
              <p className="stll-section-title mb-2">By category</p>
              <div className="space-y-2">
                {byCategory.map(({ cat, total }) => (
                  <div key={cat} className="flex items-center justify-between gap-2 text-xs">
                    <span className={`rounded px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide ${CAT_STYLE[cat as Category]}`}>
                      {cat}
                    </span>
                    <span className="font-medium tabular-nums text-stll-charcoal">${total.toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {loading ? (
          <p className="animate-pulse py-12 text-center text-stll-muted">Loading…</p>
        ) : expenses.length === 0 ? (
          <div className="py-16 text-center text-stll-muted/70">
            <p className="text-sm">No expenses for this day.</p>
          </div>
        ) : (
          <div className="stll-card overflow-hidden shadow-none">
            <div className="stll-card-header">
              <p className="text-xs text-stll-muted">
                {expenses.length} expense{expenses.length !== 1 ? "s" : ""}
              </p>
            </div>
            <div className="divide-y divide-stll-charcoal/10">
              {expenses.map((exp) => (
                <div
                  key={exp.id}
                  className="flex items-center justify-between gap-3 px-4 py-3 transition-colors hover:bg-stll-cream/40"
                >
                  <div className="min-w-0 flex-1">
                    <div className="mb-1 flex flex-wrap items-center gap-2">
                      <span className={`rounded px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide ${CAT_STYLE[exp.category as Category]}`}>
                        {exp.category}
                      </span>
                      <span className="text-[10px] font-medium uppercase tracking-wide text-stll-muted">
                        {(exp.paid_from ?? "sales") === "own" ? "Own" : "Sales"}
                      </span>
                      <span className="text-xs text-stll-muted/80">
                        {new Date(exp.date).toLocaleTimeString("en-NZ", { timeStyle: "short" })}
                      </span>
                    </div>
                    <p className="truncate text-sm text-stll-charcoal">{exp.description}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <p className="text-sm font-medium tabular-nums text-stll-charcoal">−${exp.amount.toFixed(2)}</p>
                    <button
                      type="button"
                      onClick={() => openEditExpense(exp)}
                      className="rounded-lg border border-stll-charcoal/10 px-2 py-1 text-xs text-stll-muted transition-colors hover:border-stll-charcoal/25 hover:text-stll-charcoal"
                      title="Edit"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(exp.id)}
                      className="rounded-lg px-2 py-1 text-xs text-red-600/80 transition-colors hover:bg-red-50"
                      title="Delete"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {editExp && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={(e) => e.target === e.currentTarget && setEditExp(null)}
          role="presentation"
        >
          <div className="stll-card w-full max-w-md space-y-4 p-6 shadow-sm" onClick={(e) => e.stopPropagation()} role="dialog" aria-labelledby="edit-expense-title">
            <div className="flex items-center justify-between">
              <h3 id="edit-expense-title" className="text-base font-medium text-stll-charcoal">
                Edit expense
              </h3>
              <button
                type="button"
                onClick={() => setEditExp(null)}
                className="text-stll-muted transition-colors hover:text-stll-charcoal"
                aria-label="Close"
              >
                ×
              </button>
            </div>
            <div>
              <label className="stll-section-title mb-1.5 block">Description</label>
              <input className="stll-input" value={editForm.description} onChange={(e) => setEditForm((f) => ({ ...f, description: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="stll-section-title mb-1.5 block">Category</label>
                <select
                  className="stll-input bg-white"
                  value={editForm.category}
                  onChange={(e) => setEditForm((f) => ({ ...f, category: e.target.value as Category }))}
                >
                  {CATEGORIES.map((c) => (
                    <option key={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="stll-section-title mb-1.5 block">Amount</label>
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  className="stll-input tabular-nums"
                  value={editForm.amount}
                  onChange={(e) => setEditForm((f) => ({ ...f, amount: e.target.value }))}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="stll-section-title mb-1.5 block">Date</label>
                <input type="date" className="stll-input" value={editForm.date} onChange={(e) => setEditForm((f) => ({ ...f, date: e.target.value }))} />
              </div>
              <div>
                <label className="stll-section-title mb-1.5 block">Time</label>
                <input type="time" className="stll-input" value={editForm.time} onChange={(e) => setEditForm((f) => ({ ...f, time: e.target.value }))} />
              </div>
            </div>
            <div>
              <label className="stll-section-title mb-2 block">Paid from</label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setEditForm((f) => ({ ...f, paid_from: "sales" }))}
                  className={`flex-1 rounded-lg border py-2 text-xs font-medium uppercase tracking-wide transition-colors ${
                    editForm.paid_from === "sales"
                      ? "border-stll-charcoal bg-stll-charcoal text-stll-cream"
                      : "border-stll-charcoal/15 bg-white text-stll-muted hover:border-stll-charcoal/25"
                  }`}
                >
                  Sales
                </button>
                <button
                  type="button"
                  onClick={() => setEditForm((f) => ({ ...f, paid_from: "own" }))}
                  className={`flex-1 rounded-lg border py-2 text-xs font-medium uppercase tracking-wide transition-colors ${
                    editForm.paid_from === "own"
                      ? "border-stll-sage bg-stll-sage/25 text-stll-charcoal"
                      : "border-stll-charcoal/15 bg-white text-stll-muted hover:border-stll-charcoal/25"
                  }`}
                >
                  Own
                </button>
              </div>
            </div>
            {editError && <p className="text-xs text-red-600">{editError}</p>}
            <div className="flex gap-3 pt-1">
              <button type="button" onClick={() => setEditExp(null)} className="stll-btn-secondary flex-1">
                Cancel
              </button>
              <button type="button" onClick={handleSaveExpense} disabled={editSaving} className="stll-btn-primary flex-1">
                {editSaving ? "Saving…" : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
