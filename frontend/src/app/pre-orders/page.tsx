"use client";
import { useEffect, useState } from "react";
import { MenuItem, PreOrderItem, PreOrderResponse } from "@/types";
import {
  fetchMenu,
  fetchPreOrders,
  createPreOrder,
  updatePreOrder,
  updatePreOrderStatus,
  deletePreOrder,
} from "@/lib/api";

type Status = "pending" | "ready" | "done";

const STATUS_LABEL: Record<Status, string> = {
  pending: "Pending",
  ready: "Ready",
  done: "Done",
};
const STATUS_STYLE: Record<Status, string> = {
  pending: "bg-yellow-100 text-yellow-700",
  ready: "bg-green-100 text-green-700",
  done: "bg-gray-100 text-gray-500",
};

// ── helpers ──────────────────────────────────────────────────────────────────
// SQLite returns datetimes without a timezone indicator; force UTC so browsers
// don't misinterpret them as local time.
function toUTC(iso: string) {
  return iso.endsWith("Z") || iso.includes("+") ? iso : iso + "Z";
}

function fmtPickup(iso: string) {
  return new Date(toUTC(iso)).toLocaleString("en-NZ", {
    weekday: "short", month: "short", day: "numeric",
    hour: "numeric", minute: "2-digit",
  });
}

function orderTotal(items: PreOrderItem[]) {
  return items.reduce((s, i) => s + i.price * i.quantity, 0);
}

// ── component ─────────────────────────────────────────────────────────────────
export default function PreOrdersPage() {
  const [preorders, setPreorders] = useState<PreOrderResponse[]>([]);
  const [menu, setMenu] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Form state
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [pickupDate, setPickupDate] = useState("");
  const [pickupTime, setPickupTime] = useState("");
  const [notes, setNotes] = useState("");
  const [pickedItems, setPickedItems] = useState<Record<string, number>>({});
  const [activeCategory, setActiveCategory] = useState("");
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // ── Edit modal state ───────────────────────────────────────────────────────
  const [editTarget, setEditTarget] = useState<PreOrderResponse | null>(null);
  const [editName, setEditName] = useState("");
  const [editPickupDate, setEditPickupDate] = useState("");
  const [editPickupTime, setEditPickupTime] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [editPickedItems, setEditPickedItems] = useState<Record<string, number>>({});
  const [editActiveCategory, setEditActiveCategory] = useState("");
  const [editFormError, setEditFormError] = useState("");
  const [editSaving, setEditSaving] = useState(false);

  const load = async () => {
    try {
      const [po, m] = await Promise.all([fetchPreOrders(), fetchMenu()]);
      setPreorders(po);
      setMenu(m.filter((i) => !i.is_hidden));
      if (m.length && !activeCategory) {
        const cats = Array.from(new Set(m.map((i) => i.category)));
        setActiveCategory(cats[0] ?? "");
      }
    } catch {
      setError("Could not load data. Is the backend running?");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Category list (sorted, pinned last)
  const PINNED_LAST = ["Add Ons", "Sizes"];
  const rawCats = Array.from(new Set(menu.map((i) => i.category)));
  const pinned = PINNED_LAST.filter((c) => rawCats.includes(c));
  const rest = rawCats.filter((c) => !PINNED_LAST.includes(c)).sort();
  const categories = [...rest, ...pinned];

  const setQty = (itemId: string, delta: number) => {
    setPickedItems((prev) => {
      const next = { ...prev };
      const cur = next[itemId] ?? 0;
      const val = cur + delta;
      if (val <= 0) delete next[itemId];
      else next[itemId] = val;
      return next;
    });
  };

  const pickedList: PreOrderItem[] = Object.entries(pickedItems).flatMap(([id, qty]) => {
    const item = menu.find((m) => m.id === id);
    if (!item) return [];
    return [{ id: item.id, name: item.name, price: item.price, quantity: qty }];
  });

  const resetForm = () => {
    setName(""); setPickupDate(""); setPickupTime(""); setNotes(""); setPickedItems({}); setFormError("");
  };

  const handleCreate = async () => {
    if (!name.trim()) { setFormError("Customer name is required."); return; }
    if (!pickupDate || !pickupTime) { setFormError("Pickup date and time are required."); return; }
    if (pickedList.length === 0) { setFormError("Add at least one item."); return; }
    const pickupISO = new Date(`${pickupDate}T${pickupTime}`).toISOString();
    setSubmitting(true); setFormError("");
    try {
      await createPreOrder({
        customer_name: name.trim(),
        pickup_time: pickupISO,
        items: pickedList,
        notes: notes.trim() || undefined,
      });
      resetForm();
      setShowForm(false);
      await load();
    } catch {
      setFormError("Failed to create pre-order. Try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleStatus = async (id: number, status: Status) => {
    try {
      await updatePreOrderStatus(id, status);
      setPreorders((prev) => prev.map((p) => p.id === id ? { ...p, status } : p));
    } catch { /* ignore */ }
  };

  const handleMarkDone = async (id: number, paymentMethod: string) => {
    try {
      await updatePreOrderStatus(id, "done", paymentMethod);
      setPreorders((prev) => prev.map((p) => p.id === id ? { ...p, status: "done" } : p));
    } catch { /* ignore */ }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this pre-order?")) return;
    try {
      await deletePreOrder(id);
      setPreorders((prev) => prev.filter((p) => p.id !== id));
    } catch { /* ignore */ }
  };

  // ── Edit helpers ──────────────────────────────────────────────────────────
  const editSetQty = (itemId: string, delta: number) => {
    setEditPickedItems((prev) => {
      const next = { ...prev };
      const cur = next[itemId] ?? 0;
      const val = cur + delta;
      if (val <= 0) delete next[itemId];
      else next[itemId] = val;
      return next;
    });
  };

  const editPickedList: PreOrderItem[] = Object.entries(editPickedItems).flatMap(([id, qty]) => {
    const item = menu.find((m) => m.id === id);
    if (!item) return [];
    return [{ id: item.id, name: item.name, price: item.price, quantity: qty }];
  });

  const openEdit = (po: PreOrderResponse) => {
    const dt = new Date(toUTC(po.pickup_time));
    const dateStr = dt.toLocaleDateString("en-CA"); // YYYY-MM-DD in local timezone
    const timeStr = dt.toTimeString().slice(0, 5);   // HH:MM
    const picked: Record<string, number> = {};
    po.items.forEach((i) => { picked[i.id] = i.quantity; });
    setEditTarget(po);
    setEditName(po.customer_name);
    setEditPickupDate(dateStr);
    setEditPickupTime(timeStr);
    setEditNotes(po.notes ?? "");
    setEditPickedItems(picked);
    setEditActiveCategory(categories[0] ?? "");
    setEditFormError("");
  };

  const handleSaveEdit = async () => {
    if (!editTarget) return;
    if (!editName.trim()) { setEditFormError("Customer name is required."); return; }
    if (!editPickupDate || !editPickupTime) { setEditFormError("Pickup date and time are required."); return; }
    if (editPickedList.length === 0) { setEditFormError("Add at least one item."); return; }
    const pickupISO = new Date(`${editPickupDate}T${editPickupTime}`).toISOString();
    setEditSaving(true); setEditFormError("");
    try {
      await updatePreOrder(editTarget.id, {
        customer_name: editName.trim(),
        pickup_time: pickupISO,
        items: editPickedList,
        notes: editNotes.trim() || undefined,
      });
      setEditTarget(null);
      await load();
    } catch {
      setEditFormError("Failed to save changes. Try again.");
    } finally {
      setEditSaving(false);
    }
  };

  const active = preorders.filter((p) => p.status !== "done");
  const done = preorders.filter((p) => p.status === "done");

  // ── min datetime for pickup (now)
  const nowLocal = new Date(Date.now() - new Date().getTimezoneOffset() * 60000)
    .toISOString().slice(0, 10);

  return (
    <div className="stll-page">
      <div className="stll-page-inner max-w-5xl pb-20">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="stll-h1 mb-0">Pre-orders</h1>
        <button
          type="button"
          onClick={() => {
            setShowForm((v) => !v);
            resetForm();
          }}
          className={showForm ? "stll-btn-secondary text-xs uppercase tracking-wide" : "stll-btn-primary text-xs uppercase tracking-wide"}
        >
          {showForm ? "Cancel" : "New pre-order"}
        </button>
      </div>

      {error && <div className="bg-red-100 border border-red-300 text-red-700 rounded-lg p-3 mb-4 text-sm">{error}</div>}

      {/* ── New Pre-Order Form ── */}
      {showForm && (
        <div className="bg-white rounded-lg border border-stll-charcoal/10 shadow-sm p-4 mb-6 space-y-4">
          <h2 className="font-semibold text-stll-charcoal">New Pre-Order</h2>

          {/* Name */}
          <div>
            <label className="block text-xs font-medium text-stll-muted mb-1">Customer Name *</label>
            <input
              className="w-full border border-stll-charcoal/15 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stll-accent/50"
              placeholder="e.g. Sarah"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          {/* Pickup date + time */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-stll-muted mb-1">Pickup Date *</label>
              <input
                type="date"
                min={nowLocal}
                className="w-full border border-stll-charcoal/15 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stll-accent/50"
                value={pickupDate}
                onChange={(e) => setPickupDate(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-stll-muted mb-1">Pickup Time *</label>
              <input
                type="time"
                className="w-full border border-stll-charcoal/15 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stll-accent/50"
                value={pickupTime}
                onChange={(e) => setPickupTime(e.target.value)}
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-medium text-stll-muted mb-1">Notes (optional)</label>
            <textarea
              rows={2}
              className="w-full border border-stll-charcoal/15 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stll-accent/50 resize-none"
              placeholder="e.g. Extra hot, oat milk, etc."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          {/* Item picker */}
          <div>
            <label className="block text-xs font-medium text-stll-muted mb-2">Items *</label>

            {/* Category tabs */}
            <div className="flex gap-1 overflow-x-auto pb-1 mb-3">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                    activeCategory === cat
                      ? "bg-stll-charcoal text-white"
                      : "bg-stll-cream/60 text-stll-muted hover:bg-stll-cream"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Items in selected category */}
            <div className="grid grid-cols-2 gap-2">
              {menu.filter((i) => i.category === activeCategory).map((item) => {
                const qty = pickedItems[item.id] ?? 0;
                return (
                  <div
                    key={item.id}
                    className={`flex items-center justify-between rounded-xl border px-3 py-2.5 transition-colors ${
                      qty > 0 ? "border-stll-charcoal bg-stll-cream/50" : "border-stll-charcoal/10 bg-white"
                    }`}
                  >
                    <div className="min-w-0 mr-2">
                      <p className="text-xs font-semibold text-stll-charcoal truncate">{item.name}</p>
                      <p className="text-[10px] text-stll-muted">${item.price.toFixed(2)}</p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {qty > 0 && (
                        <>
                          <button onClick={() => setQty(item.id, -1)} className="w-6 h-6 rounded-full bg-stll-cream text-stll-charcoal font-bold text-sm flex items-center justify-center leading-none">−</button>
                          <span className="text-xs font-bold text-stll-accent w-4 text-center">{qty}</span>
                        </>
                      )}
                      <button onClick={() => setQty(item.id, 1)} className="w-6 h-6 rounded-full bg-stll-charcoal text-white font-bold text-sm flex items-center justify-center leading-none">+</button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Selected items summary */}
          {pickedList.length > 0 && (
            <div className="bg-stll-cream/50 rounded-xl p-3 space-y-1">
              {pickedList.map((i) => (
                <div key={i.id} className="flex justify-between text-sm">
                  <span className="text-stll-charcoal">{i.name} ×{i.quantity}</span>
                  <span className="text-stll-muted">${(i.price * i.quantity).toFixed(2)}</span>
                </div>
              ))}
              <div className="border-t border-stll-charcoal/10 pt-1 flex justify-between font-bold text-sm">
                <span className="text-stll-charcoal">Total</span>
                <span className="text-stll-accent">${orderTotal(pickedList).toFixed(2)}</span>
              </div>
            </div>
          )}

          {formError && <p className="text-xs text-red-600">{formError}</p>}

          <button
            onClick={handleCreate}
            disabled={submitting}
            className="w-full py-3 bg-stll-charcoal text-white font-semibold rounded-xl hover:bg-stll-accent disabled:opacity-60 transition-colors"
          >
            {submitting ? "Creating…" : "Create Pre-Order"}
          </button>
        </div>
      )}

      {/* ── Pre-order list ── */}
      {loading ? (
        <p className="text-center text-stll-muted py-10">Loading…</p>
      ) : (
        <>
          {/* Active orders */}
          {active.length === 0 && !showForm && (
            <div className="text-center py-12 text-stll-muted/60">
              <p className="text-4xl mb-2">📋</p>
              <p className="text-sm">No active pre-orders</p>
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {active.map((po) => (
              <PreOrderCard
                key={po.id}
                po={po}
                onStatus={handleStatus}
                onMarkDone={handleMarkDone}
                onDelete={handleDelete}
                onEdit={openEdit}
              />
            ))}
          </div>

          {/* Done orders */}
          {done.length > 0 && (
            <div className="mt-8">
              <h3 className="text-[11px] font-bold uppercase tracking-widest text-stll-muted mb-3">Completed</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {done.map((po) => (
                  <PreOrderCard
                    key={po.id}
                    po={po}
                    onStatus={handleStatus}
                    onMarkDone={handleMarkDone}
                    onDelete={handleDelete}
                    onEdit={openEdit}
                  />
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* ── Edit Modal ──────────────────────────────────────────────────────── */}
      {editTarget && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-4">
          <div className="bg-white w-full max-w-lg rounded-lg shadow-sm overflow-y-auto max-h-[90vh] p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-stll-charcoal text-lg">Edit Pre-Order</h2>
              <button
                onClick={() => setEditTarget(null)}
                className="text-stll-muted hover:text-stll-charcoal text-xl leading-none"
              >
                ✕
              </button>
            </div>

            {/* Name */}
            <div>
              <label className="block text-xs font-medium text-stll-muted mb-1">Customer Name *</label>
              <input
                className="w-full border border-stll-charcoal/15 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stll-accent/50"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
              />
            </div>

            {/* Date + time */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-stll-muted mb-1">Pickup Date *</label>
                <input
                  type="date"
                  className="w-full border border-stll-charcoal/15 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stll-accent/50"
                  value={editPickupDate}
                  onChange={(e) => setEditPickupDate(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-stll-muted mb-1">Pickup Time *</label>
                <input
                  type="time"
                  className="w-full border border-stll-charcoal/15 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stll-accent/50"
                  value={editPickupTime}
                  onChange={(e) => setEditPickupTime(e.target.value)}
                />
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-xs font-medium text-stll-muted mb-1">Notes (optional)</label>
              <textarea
                rows={2}
                className="w-full border border-stll-charcoal/15 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stll-accent/50 resize-none"
                placeholder="e.g. Extra hot, oat milk, etc."
                value={editNotes}
                onChange={(e) => setEditNotes(e.target.value)}
              />
            </div>

            {/* Item picker */}
            <div>
              <label className="block text-xs font-medium text-stll-muted mb-2">Items *</label>
              <div className="flex gap-1 overflow-x-auto pb-1 mb-3">
                {categories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setEditActiveCategory(cat)}
                    className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                      editActiveCategory === cat
                        ? "bg-stll-charcoal text-white"
                        : "bg-stll-cream/60 text-stll-muted hover:bg-stll-cream"
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-2">
                {menu.filter((i) => i.category === editActiveCategory).map((item) => {
                  const qty = editPickedItems[item.id] ?? 0;
                  return (
                    <div
                      key={item.id}
                      className={`flex items-center justify-between rounded-xl border px-3 py-2.5 transition-colors ${
                        qty > 0 ? "border-stll-charcoal bg-stll-cream/50" : "border-stll-charcoal/10 bg-white"
                      }`}
                    >
                      <div className="min-w-0 mr-2">
                        <p className="text-xs font-semibold text-stll-charcoal truncate">{item.name}</p>
                        <p className="text-[10px] text-stll-muted">${item.price.toFixed(2)}</p>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        {qty > 0 && (
                          <>
                            <button onClick={() => editSetQty(item.id, -1)} className="w-6 h-6 rounded-full bg-stll-cream text-stll-charcoal font-bold text-sm flex items-center justify-center leading-none">−</button>
                            <span className="text-xs font-bold text-stll-accent w-4 text-center">{qty}</span>
                          </>
                        )}
                        <button onClick={() => editSetQty(item.id, 1)} className="w-6 h-6 rounded-full bg-stll-charcoal text-white font-bold text-sm flex items-center justify-center leading-none">+</button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Selected summary */}
            {editPickedList.length > 0 && (
              <div className="bg-stll-cream/50 rounded-xl p-3 space-y-1">
                {editPickedList.map((i) => (
                  <div key={i.id} className="flex justify-between text-sm">
                    <span className="text-stll-charcoal">{i.name} ×{i.quantity}</span>
                    <span className="text-stll-muted">${(i.price * i.quantity).toFixed(2)}</span>
                  </div>
                ))}
                <div className="border-t border-stll-charcoal/10 pt-1 flex justify-between font-bold text-sm">
                  <span className="text-stll-charcoal">Total</span>
                  <span className="text-stll-accent">${orderTotal(editPickedList).toFixed(2)}</span>
                </div>
              </div>
            )}

            {editFormError && <p className="text-xs text-red-600">{editFormError}</p>}

            <div className="flex gap-3 pt-1">
              <button
                onClick={() => setEditTarget(null)}
                className="flex-1 py-3 text-sm font-semibold bg-stll-cream/60 text-stll-muted rounded-xl hover:bg-stll-cream transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEdit}
                disabled={editSaving}
                className="flex-1 py-3 text-sm font-semibold bg-stll-charcoal text-white rounded-xl hover:bg-stll-accent disabled:opacity-60 transition-colors"
              >
                {editSaving ? "Saving…" : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}

// ── PreOrderCard sub-component ────────────────────────────────────────────────
function PreOrderCard({
  po,
  onStatus,
  onMarkDone,
  onDelete,
  onEdit,
}: {
  po: PreOrderResponse;
  onStatus: (id: number, status: Status) => void;
  onMarkDone: (id: number, paymentMethod: string) => void;
  onDelete: (id: number) => void;
  onEdit: (po: PreOrderResponse) => void;
}) {
  const isDone = po.status === "done";
  const [selectingPayment, setSelectingPayment] = useState(false);
  const [payment, setPayment] = useState<"Cash" | "Bank Transfer">("Cash");

  return (
    <div className={`flex flex-col rounded-lg border shadow-sm overflow-hidden ${
      isDone ? "bg-gray-50 border-gray-200 opacity-70" : "bg-white border-stll-charcoal/10"
    }`}>
      {/* Header strip */}
      <div className={`px-4 pt-4 pb-3 ${
        po.status === "pending" ? "bg-yellow-50" :
        po.status === "ready"   ? "bg-green-50"  : "bg-gray-50"
      }`}>
        <div className="flex items-start justify-between gap-2">
          <p className="font-bold text-stll-charcoal text-base leading-tight">{po.customer_name}</p>
          <span className={`shrink-0 text-[10px] px-2 py-0.5 rounded-full font-semibold ${
            STATUS_STYLE[po.status as Status]
          }`}>
            {STATUS_LABEL[po.status as Status]}
          </span>
        </div>
        <p className="text-xs text-stll-muted mt-1">⏰ {fmtPickup(po.pickup_time)}</p>
      </div>

      {/* Body */}
      <div className="flex flex-col flex-1 px-4 py-3 gap-2">
        {/* Items */}
        <ul className="text-sm text-stll-charcoal space-y-1">
          {po.items.map((item, i) => (
            <li key={i} className="flex justify-between">
              <span>{item.name} <span className="text-stll-muted">×{item.quantity}</span></span>
              <span className="text-stll-muted">${(item.price * item.quantity).toFixed(2)}</span>
            </li>
          ))}
        </ul>

        {/* Total */}
        <div className="flex justify-between font-bold text-sm border-t border-stll-charcoal/10 pt-2">
          <span className="text-stll-charcoal">Total</span>
          <span className="text-stll-accent">${orderTotal(po.items).toFixed(2)}</span>
        </div>

        {/* Notes */}
        {po.notes && (
          <p className="text-xs text-stll-muted italic bg-stll-cream/50 rounded-lg px-3 py-1.5">📝 {po.notes}</p>
        )}
      </div>

      {/* Footer buttons */}
      <div className="px-4 pb-4 pt-1 flex flex-wrap gap-2">
        {po.status === "pending" && (
          <button
            onClick={() => onStatus(po.id, "ready")}
            className="flex-1 py-2 text-xs font-semibold bg-green-500 text-white rounded-xl hover:bg-green-600 transition-colors"
          >
            ✓ Mark Ready
          </button>
        )}
        {po.status === "ready" && !selectingPayment && (
          <button
            onClick={() => setSelectingPayment(true)}
            className="flex-1 py-2 text-xs font-semibold bg-stll-charcoal text-white rounded-xl hover:bg-stll-accent transition-colors"
          >
            ✓ Mark Done
          </button>
        )}
        {po.status === "ready" && selectingPayment && (
          <div className="flex-1 space-y-2">
            <p className="text-xs font-semibold text-stll-charcoal">Payment method?</p>
            <div className="flex gap-2">
              <button type="button" onClick={() => setPayment("Cash")} className={`flex-1 py-1.5 rounded-xl text-xs font-semibold border-2 transition-all ${
                payment === "Cash" ? "bg-stll-charcoal text-white border-stll-charcoal" : "bg-white text-stll-charcoal border-stll-charcoal/10"
              }`}>💵 Cash</button>
              <button type="button" onClick={() => setPayment("Bank Transfer")} className={`flex-1 py-1.5 rounded-xl text-xs font-semibold border-2 transition-all ${
                payment === "Bank Transfer" ? "bg-stll-charcoal text-white border-stll-charcoal" : "bg-white text-stll-charcoal border-stll-charcoal/10"
              }`}>🏦 Transfer</button>
            </div>
            <div className="flex gap-2">
              <button onClick={() => { onMarkDone(po.id, payment); setSelectingPayment(false); }} className="flex-1 py-2 text-xs font-semibold bg-green-600 text-white rounded-xl hover:bg-green-700 transition-colors">Confirm & Record Sale</button>
              <button onClick={() => setSelectingPayment(false)} className="px-3 py-2 text-xs rounded-xl bg-stll-cream/60 text-stll-muted hover:bg-stll-cream transition-colors">Cancel</button>
            </div>
          </div>
        )}
        {po.status === "done" && (
          <button
            onClick={() => onStatus(po.id, "pending")}
            className="flex-1 py-2 text-xs font-semibold bg-stll-cream/60 text-stll-muted rounded-xl hover:bg-stll-cream transition-colors"
          >
            ↩ Reopen
          </button>
        )}
        <button
          onClick={() => onEdit(po)}
          className="px-3 py-2 text-xs font-semibold bg-stll-cream/60 text-stll-charcoal rounded-xl hover:bg-stll-cream transition-colors"
        >
          ✏ Edit
        </button>
        <button
          onClick={() => onDelete(po.id)}
          className="px-3 py-2 text-xs font-semibold bg-red-50 text-red-500 rounded-xl hover:bg-red-100 transition-colors"
        >
          Delete
        </button>
      </div>
    </div>
  );
}
