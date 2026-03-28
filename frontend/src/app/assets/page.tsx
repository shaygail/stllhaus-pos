"use client";
import { useEffect, useState } from "react";
import { fetchInventory, createInventoryItem, updateInventoryItem, deleteInventoryItem, adjustInventoryItem } from "@/lib/api";
import { InventoryResponse } from "@/types";

const UNITS = ["pcs", "kg", "g", "L", "mL", "cartons", "bags", "boxes", "bottles", "jars", "sets"];

function formatDate(isoStr: string): string {
  const raw = isoStr.endsWith("Z") ? isoStr.slice(0, -1) : isoStr;
  return new Date(raw).toLocaleDateString("en-NZ", { day: "numeric", month: "short", year: "numeric" });
}

function toLocalDateInputStr(isoStr: string): string {
  const raw = isoStr.endsWith("Z") ? isoStr.slice(0, -1) : isoStr;
  const d = new Date(raw);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

const BLANK_FORM = {
  name: "",
  quantity: "",
  unit: "pcs",
  cost_per_unit: "",
  date_purchased: "",
  notes: "",
};

export default function AssetsPage() {
  const [assets, setAssets] = useState<InventoryResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ ...BLANK_FORM });
  const [addError, setAddError] = useState("");
  const [addSaving, setAddSaving] = useState(false);
  const [editItem, setEditItem] = useState<InventoryResponse | null>(null);
  const [editForm, setEditForm] = useState({ ...BLANK_FORM });
  const [editError, setEditError] = useState("");
  const [editSaving, setEditSaving] = useState(false);
  const [sortBy, setSortBy] = useState<"name" | "date" | "cost">("date");

  const load = () => {
    setLoading(true);
    fetchInventory()
      .then(items => {
        // Filter only Equipment category
        const equipmentItems = items.filter(i => i.category === "Equipment");
        setAssets(equipmentItems);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const todayStr = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
  };

  const handleAdd = async () => {
    if (!form.name.trim()) { setAddError("Enter asset name."); return; }
    const qty = parseFloat(form.quantity);
    if (isNaN(qty) || qty <= 0) { setAddError("Enter a valid quantity."); return; }
    setAddError(""); setAddSaving(true);
    try {
      await createInventoryItem({
        name: form.name.trim(),
        category: "Equipment",
        quantity: qty,
        unit: form.unit,
        cost_per_unit: form.cost_per_unit ? parseFloat(form.cost_per_unit) : undefined,
        date_purchased: form.date_purchased ? `${form.date_purchased}T12:00:00` : undefined,
        notes: form.notes.trim() || undefined,
        log_as_expense: false,
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

  const openEdit = (item: InventoryResponse) => {
    setEditItem(item);
    setEditForm({
      name: item.name,
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
    if (!editForm.name.trim()) { setEditError("Enter asset name."); return; }
    const qty = parseFloat(editForm.quantity);
    if (isNaN(qty) || qty <= 0) { setEditError("Enter a valid quantity."); return; }
    setEditError(""); setEditSaving(true);
    try {
      await updateInventoryItem(editItem.id, {
        name: editForm.name.trim(),
        category: "Equipment",
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
    if (!confirm(`Delete asset "${item.name}"?`)) return;
    await deleteInventoryItem(item.id).catch(console.error);
    load();
  };

  const sorted = [...assets].sort((a, b) => {
    if (sortBy === "name") return a.name.localeCompare(b.name);
    if (sortBy === "date") return new Date(b.date_purchased).getTime() - new Date(a.date_purchased).getTime();
    if (sortBy === "cost") return (b.cost_per_unit ?? 0) - (a.cost_per_unit ?? 0);
    return 0;
  });

  const totalAssetValue = assets.reduce((s, a) => s + (a.cost_per_unit != null ? a.cost_per_unit * a.quantity : 0), 0);

  const exportToCSV = () => {
    const headers = ["Asset Name", "Quantity", "Unit", "Cost per Unit", "Total Value", "Date Purchased", "Notes"];
    const rows = assets.map(asset => [
      asset.name,
      asset.quantity,
      asset.unit,
      asset.cost_per_unit ?? "",
      ((asset.cost_per_unit ?? 0) * asset.quantity).toFixed(2),
      formatDate(asset.date_purchased),
      asset.notes ?? "",
    ]);
    
    const csvContent = [
      headers.join(","),
      `"ASSET RECORDS REPORT","","","","","${new Date().toLocaleDateString()}",""`,"",
      ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(",")),
      "",
      `"Total Asset Value","","","","$${totalAssetValue.toFixed(2)}","",""`,
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `assets_${new Date().toISOString().slice(0, 10)}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="stll-page">
      <div className="stll-page-inner max-w-5xl">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="stll-h1">Assets</h1>
          <p className="text-sm text-stll-muted">Equipment and long-term items</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={exportToCSV}
            className="stll-btn-secondary text-xs uppercase tracking-wide"
          >
            Export CSV
          </button>
          <button
            type="button"
            onClick={() => {
              setShowAdd((v) => !v);
              setForm({ ...BLANK_FORM, date_purchased: todayStr() });
              setAddError("");
            }}
            className="stll-btn-primary text-xs uppercase tracking-wide"
          >
            Register asset
          </button>
        </div>
      </div>

      {/* Add form */}
      {showAdd && (
        <div className="bg-white rounded-lg border border-stll-charcoal/10 shadow-sm p-5 mb-5 space-y-3">
          <h2 className="font-semibold text-stll-charcoal">Register New Asset</h2>
          <div className="space-y-3">
            <div className="col-span-2">
              <label className="block text-xs font-medium text-stll-muted mb-1">Asset Name *</label>
              <input value={form.name} onChange={e => setForm(f => ({...f, name: e.target.value}))} placeholder="e.g. Espresso Machine, Display Fridge" className="w-full border border-stll-charcoal/15 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stll-accent/50" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-stll-muted mb-1">Date Purchased</label>
                <input type="date" value={form.date_purchased} onChange={e => setForm(f => ({...f, date_purchased: e.target.value}))} className="w-full border border-stll-charcoal/15 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stll-accent/50" />
              </div>
              <div>
                <label className="block text-xs font-medium text-stll-muted mb-1">Quantity *</label>
                <input type="number" min="0" step="1" value={form.quantity} onChange={e => setForm(f => ({...f, quantity: e.target.value}))} placeholder="e.g. 1" className="w-full border border-stll-charcoal/15 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stll-accent/50" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-stll-muted mb-1">Unit *</label>
                <select value={form.unit} onChange={e => setForm(f => ({...f, unit: e.target.value}))} className="w-full border border-stll-charcoal/15 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stll-accent/50 bg-white">
                  {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-stll-muted mb-1">Cost per Unit</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-stll-muted text-sm">$</span>
                  <input type="number" min="0" step="0.01" value={form.cost_per_unit} onChange={e => setForm(f => ({...f, cost_per_unit: e.target.value}))} placeholder="0.00" className="w-full border border-stll-charcoal/15 rounded-lg pl-7 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stll-accent/50" />
                </div>
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-stll-muted mb-1">Notes (optional)</label>
              <input value={form.notes} onChange={e => setForm(f => ({...f, notes: e.target.value}))} placeholder="e.g. Serial #12345, warranty until 2027" className="w-full border border-stll-charcoal/15 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stll-accent/50" />
            </div>
          </div>
          {addError && <p className="text-xs text-red-600">{addError}</p>}
          <div className="flex gap-3">
            <button onClick={() => setShowAdd(false)} className="flex-1 py-2.5 text-sm font-semibold bg-stll-cream/60 text-stll-muted rounded-xl hover:bg-stll-cream transition-colors">Cancel</button>
            <button onClick={handleAdd} disabled={addSaving} className="flex-1 py-2.5 text-sm font-semibold bg-stll-charcoal text-white rounded-xl hover:bg-stll-accent disabled:opacity-60 transition-colors">{addSaving ? "Saving…" : "Register"}</button>
          </div>
        </div>
      )}

      {/* Edit modal */}
      {editItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-lg shadow-sm p-6 max-w-md w-full space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-stll-charcoal">Edit Asset</h2>
              <button onClick={() => setEditItem(null)} className="text-stll-muted hover:text-stll-charcoal text-xl font-bold">✕</button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-stll-muted mb-1">Asset Name</label>
                <input value={editForm.name} onChange={e => setEditForm(f => ({...f, name: e.target.value}))} className="w-full border border-stll-charcoal/15 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stll-accent/50" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-stll-muted mb-1">Date Purchased</label>
                  <input type="date" value={editForm.date_purchased} onChange={e => setEditForm(f => ({...f, date_purchased: e.target.value}))} className="w-full border border-stll-charcoal/15 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stll-accent/50" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-stll-muted mb-1">Quantity</label>
                  <input type="number" min="0" step="1" value={editForm.quantity} onChange={e => setEditForm(f => ({...f, quantity: e.target.value}))} className="w-full border border-stll-charcoal/15 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stll-accent/50" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-stll-muted mb-1">Unit</label>
                  <select value={editForm.unit} onChange={e => setEditForm(f => ({...f, unit: e.target.value}))} className="w-full border border-stll-charcoal/15 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stll-accent/50 bg-white">
                    {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-stll-muted mb-1">Cost per Unit</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-stll-muted text-sm">$</span>
                    <input type="number" min="0" step="0.01" value={editForm.cost_per_unit} onChange={e => setEditForm(f => ({...f, cost_per_unit: e.target.value}))} className="w-full border border-stll-charcoal/15 rounded-lg pl-7 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stll-accent/50" />
                  </div>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-stll-muted mb-1">Notes</label>
                <input value={editForm.notes} onChange={e => setEditForm(f => ({...f, notes: e.target.value}))} className="w-full border border-stll-charcoal/15 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stll-accent/50" />
              </div>
            </div>
            {editError && <p className="text-xs text-red-600">{editError}</p>}
            <div className="flex gap-3">
              <button onClick={() => setEditItem(null)} className="flex-1 py-2 text-sm font-semibold bg-stll-cream/60 text-stll-muted rounded-xl hover:bg-stll-cream transition-colors">Cancel</button>
              <button onClick={handleEdit} disabled={editSaving} className="flex-1 py-2 text-sm font-semibold bg-stll-charcoal text-white rounded-xl hover:bg-stll-accent disabled:opacity-60 transition-colors">{editSaving ? "Saving…" : "Save"}</button>
            </div>
          </div>
        </div>
      )}

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
        <div className="bg-white rounded-lg p-4 border border-stll-charcoal/10 shadow-sm">
          <p className="text-[11px] text-stll-muted uppercase tracking-widest font-semibold">Total Assets</p>
          <p className="text-3xl font-bold text-stll-charcoal mt-2">{assets.length}</p>
        </div>
        <div className="bg-white rounded-lg p-4 border border-stll-charcoal/10 shadow-sm">
          <p className="text-[11px] text-stll-muted uppercase tracking-widest font-semibold">Total Value</p>
          <p className="text-3xl font-bold text-stll-charcoal mt-2">${totalAssetValue.toFixed(2)}</p>
        </div>
        <div className="bg-white rounded-lg p-4 border border-stll-charcoal/10 shadow-sm">
          <p className="text-[11px] text-stll-muted uppercase tracking-widest font-semibold">Average Value</p>
          <p className="text-3xl font-bold text-stll-charcoal mt-2">${assets.length > 0 ? (totalAssetValue / assets.length).toFixed(2) : "0.00"}</p>
        </div>
      </div>

      {/* Sort buttons */}
      <div className="flex gap-2 mb-4">
        <button onClick={() => setSortBy("name")} className={`px-3 py-2 text-xs font-semibold rounded-lg transition-colors ${sortBy === "name" ? "bg-stll-charcoal text-white" : "bg-white border border-stll-charcoal/10 text-stll-muted hover:border-stll-charcoal/50"}`}>📝 Name</button>
        <button onClick={() => setSortBy("date")} className={`px-3 py-2 text-xs font-semibold rounded-lg transition-colors ${sortBy === "date" ? "bg-stll-charcoal text-white" : "bg-white border border-stll-charcoal/10 text-stll-muted hover:border-stll-charcoal/50"}`}>📅 Date</button>
        <button onClick={() => setSortBy("cost")} className={`px-3 py-2 text-xs font-semibold rounded-lg transition-colors ${sortBy === "cost" ? "bg-stll-charcoal text-white" : "bg-white border border-stll-charcoal/10 text-stll-muted hover:border-stll-charcoal/50"}`}>💰 Cost</button>
      </div>

      {/* Content */}
      {loading ? (
        <p className="text-stll-muted text-center py-12 animate-pulse">Loading assets…</p>
      ) : assets.length === 0 ? (
        <div className="text-center py-20 text-stll-muted/50">
          <p className="text-5xl mb-3">🏗️</p>
          <p>No assets registered yet</p>
          <button onClick={() => setShowAdd(true)} className="mt-4 px-4 py-2 rounded-lg bg-stll-charcoal text-white text-sm font-semibold hover:bg-stll-accent transition-colors">Register First Asset</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {sorted.map(asset => (
            <div key={asset.id} className="bg-white rounded-lg border border-stll-charcoal/10 shadow-sm overflow-hidden hover:border-stll-charcoal/20 transition-colors">
              {/* Header */}
              <div className="px-4 pt-4 pb-3 bg-gradient-to-r from-stll-accent/10 to-transparent border-b border-stll-charcoal/10">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="min-w-0">
                    <p className="font-bold text-stll-charcoal text-lg leading-tight truncate">{asset.name}</p>
                  </div>
                  <span className="shrink-0 text-[10px] font-bold bg-stll-charcoal/20 text-stll-charcoal px-2 py-1 rounded-full">Equipment</span>
                </div>
                {asset.notes && <p className="text-[11px] text-stll-muted truncate">{asset.notes}</p>}
              </div>

              {/* Details */}
              <div className="px-4 py-3 space-y-2 border-b border-stll-charcoal/10">
                <div className="flex justify-between items-center">
                  <span className="text-[11px] text-stll-muted uppercase tracking-wide font-semibold">Quantity</span>
                  <p className="text-lg font-bold text-stll-charcoal">{asset.quantity} <span className="text-xs text-stll-muted">{asset.unit}</span></p>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[11px] text-stll-muted uppercase tracking-wide font-semibold">Cost per Unit</span>
                  <p className="text-base font-bold text-stll-charcoal">${(asset.cost_per_unit ?? 0).toFixed(2)}</p>
                </div>
                <div className="flex justify-between items-center pt-1 border-t border-stll-charcoal/10">
                  <span className="text-[11px] text-stll-muted uppercase tracking-wide font-semibold">Total Value</span>
                  <p className="text-lg font-bold text-green-700">${((asset.cost_per_unit ?? 0) * asset.quantity).toFixed(2)}</p>
                </div>
              </div>

              {/* Date */}
              <div className="px-4 py-2 text-[11px] text-stll-muted">
                Registered: <span className="font-semibold">{formatDate(asset.date_purchased)}</span>
              </div>

              {/* Actions */}
              <div className="px-4 pb-3 flex gap-2">
                <button onClick={() => openEdit(asset)} className="flex-1 py-2 text-xs font-semibold rounded-lg bg-stll-cream/60 text-stll-muted hover:bg-stll-cream transition-colors">✏ Edit</button>
                <button onClick={() => handleDelete(asset)} className="flex-1 py-2 text-xs font-semibold rounded-lg bg-red-50 text-red-400 hover:bg-red-100 transition-colors">🗑 Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}
      </div>
    </div>
  );
}
