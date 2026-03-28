"use client";
import { useEffect, useState } from "react";
import { MenuItem } from "@/types";
import { fetchMenu, createMenuItem, updateMenuItem, deleteMenuItem } from "@/lib/api";

type FormState = {
  name: string;
  price: string;
  category: string;
  is_hidden: boolean;
  is_sold_out: boolean;
};
const EMPTY: FormState = {
  name: "",
  price: "",
  category: "",
  is_hidden: false,
  is_sold_out: false,
};

export default function MenuManagementPage() {
  const [catIndex, setCatIndex] = useState(0);
  const ITEMS_PER_PAGE = 6;
  const [pageByCat, setPageByCat] = useState<Record<string, number>>({});

  const getPage = (cat: string) => pageByCat[cat] ?? 1;
  const setPage = (cat: string, page: number) =>
    setPageByCat((prev) => ({ ...prev, [cat]: page }));

  const [items, setItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [addForm, setAddForm] = useState<FormState>(EMPTY);
  const [addError, setAddError] = useState("");
  const [adding, setAdding] = useState(false);

  const [editItem, setEditItem] = useState<MenuItem | null>(null);
  const [editForm, setEditForm] = useState<FormState>(EMPTY);
  const [editError, setEditError] = useState("");
  const [saving, setSaving] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<MenuItem | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [updatingItemId, setUpdatingItemId] = useState<string | null>(null);

  const load = async () => {
    try {
      setLoading(true);
      setError("");
      const data = await fetchMenu(true);
      setItems(data);
    } catch {
      setError("Could not load menu. Is the backend running?");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const PINNED_LAST = ["Add Ons", "Sizes"];
  const rawCats = Array.from(new Set(items.map((i) => i.category)));
  const pinned = PINNED_LAST.filter((c) => rawCats.includes(c));
  const rest = rawCats.filter((c) => !PINNED_LAST.includes(c)).sort();
  const categories = [...rest, ...pinned];

  const allCategories = Array.from(new Set(items.map((i) => i.category))).sort();

  const validateForm = (f: FormState): string => {
    if (!f.name.trim()) return "Name is required.";
    if (!f.category.trim()) return "Category is required.";
    const p = parseFloat(f.price);
    if (isNaN(p) || p < 0) return "Enter a valid price (0 or more).";
    return "";
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const err = validateForm(addForm);
    if (err) {
      setAddError(err);
      return;
    }
    setAdding(true);
    setAddError("");
    try {
      await createMenuItem({
        name: addForm.name.trim(),
        price: parseFloat(addForm.price),
        category: addForm.category.trim(),
        is_hidden: false,
        is_sold_out: false,
      });
      setAddForm(EMPTY);
      await load();
    } catch {
      setAddError("Failed to add item. Try again.");
    } finally {
      setAdding(false);
    }
  };

  const openEdit = (item: MenuItem) => {
    setEditItem(item);
    setEditForm({
      name: item.name,
      price: String(item.price),
      category: item.category,
      is_hidden: item.is_hidden,
      is_sold_out: item.is_sold_out,
    });
    setEditError("");
  };

  const handleSaveEdit = async () => {
    if (!editItem) return;
    const err = validateForm(editForm);
    if (err) {
      setEditError(err);
      return;
    }
    setSaving(true);
    setEditError("");
    try {
      await updateMenuItem(editItem.id, {
        name: editForm.name.trim(),
        price: parseFloat(editForm.price),
        category: editForm.category.trim(),
        is_hidden: editForm.is_hidden,
        is_sold_out: editForm.is_sold_out,
      });
      setEditItem(null);
      await load();
    } catch {
      setEditError("Failed to save. Try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteMenuItem(deleteTarget.id);
      setDeleteTarget(null);
      await load();
    } catch {
      setDeleteTarget(null);
    } finally {
      setDeleting(false);
    }
  };

  const updateAvailability = async (
    item: MenuItem,
    changes: Partial<Pick<MenuItem, "is_hidden" | "is_sold_out">>
  ) => {
    setUpdatingItemId(item.id);
    try {
      await updateMenuItem(item.id, {
        name: item.name,
        price: item.price,
        category: item.category,
        is_hidden: changes.is_hidden ?? item.is_hidden,
        is_sold_out: changes.is_sold_out ?? item.is_sold_out,
      });
      await load();
    } finally {
      setUpdatingItemId(null);
    }
  };

  return (
    <div className="stll-page">
      <div className="stll-page-inner max-w-2xl pb-20">
      <h1 className="stll-h1">Menu</h1>

      {/* Error banner */}
      {error && (
        <div className="bg-red-100 border border-red-300 text-red-700 rounded-lg p-3 mb-4 text-sm">
          {error}
        </div>
      )}

      {/* Add Item Form */}
      <div className="bg-white rounded-xl shadow-sm border border-stll-charcoal/10 p-4 mb-8">
        <h2 className="text-base font-semibold text-stll-charcoal mb-3">Add New Item</h2>
        <form onSubmit={handleAdd} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="block text-xs font-medium text-stll-muted mb-1">Item Name</label>
              <input
                className="w-full border border-stll-charcoal/15 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stll-accent/50"
                placeholder="e.g. Matcha Latte"
                value={addForm.name}
                inputMode="text"
                autoComplete="off"
                onChange={(e) => setAddForm((f) => ({ ...f, name: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-stll-muted mb-1">Price ($)</label>
              <input
                type="text"
                inputMode="decimal"
                autoComplete="off"
                className="w-full border border-stll-charcoal/15 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stll-accent/50"
                placeholder="0.00"
                value={addForm.price}
                onChange={(e) => setAddForm((f) => ({ ...f, price: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-stll-muted mb-1">Category</label>
              <input
                list="category-options"
                className="w-full border border-stll-charcoal/15 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stll-accent/50"
                placeholder="Pick existing or type new…"
                value={addForm.category}
                inputMode="text"
                autoComplete="off"
                onChange={(e) => setAddForm((f) => ({ ...f, category: e.target.value }))}
              />
              <datalist id="category-options">
                {allCategories.map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
              <p className="text-[10px] text-stll-muted mt-1">
                Select from the list or type a new category name
              </p>
            </div>
          </div>
          {addError && <p className="text-xs text-red-600">{addError}</p>}
          <button
            type="submit"
            disabled={adding}
            className="w-full bg-stll-charcoal text-white rounded-lg py-2 text-sm font-semibold hover:bg-stll-accent transition-colors disabled:opacity-60"
          >
            {adding ? "Adding…" : "+ Add Item"}
          </button>
        </form>
      </div>

      {/* Menu List */}
      {loading ? (
        <p className="text-center text-stll-muted py-10">Loading menu…</p>
      ) : (
        <>
          {/* Category navigation */}
          {categories.length > 0 && (
            <div className="flex items-center justify-between mb-4">
              <button
                className="px-3 py-1 rounded bg-stll-cream/60 text-stll-accent font-medium disabled:opacity-50"
                onClick={() => setCatIndex((i) => Math.max(0, i - 1))}
                disabled={catIndex === 0}
              >
                Prev
              </button>
              <span className="text-xs text-stll-muted font-semibold uppercase tracking-widest">
                {categories[catIndex]}
              </span>
              <button
                className="px-3 py-1 rounded bg-stll-cream/60 text-stll-accent font-medium disabled:opacity-50"
                onClick={() => setCatIndex((i) => Math.min(categories.length - 1, i + 1))}
                disabled={catIndex === categories.length - 1}
              >
                Next
              </button>
            </div>
          )}

          {/* Only show the selected category */}
          {categories.length > 0 &&
            (() => {
              const cat = categories[catIndex];
              const catItems = items.filter((i) => i.category === cat);
              const page = getPage(cat);
              const totalPages = Math.max(1, Math.ceil(catItems.length / ITEMS_PER_PAGE));
              const pagedItems = catItems.slice(
                (page - 1) * ITEMS_PER_PAGE,
                page * ITEMS_PER_PAGE
              );
              return (
                <div key={cat}>
                  <div className="flex flex-row gap-4 overflow-x-auto pb-2 hide-scrollbar">
                    {pagedItems.map((item) => (
                      <div
                        key={item.id}
                        className="flex-shrink-0 w-64 flex flex-col justify-between bg-white rounded-xl border border-stll-charcoal/10 px-4 py-3 shadow-sm h-full"
                      >
                        <div>
                          <p className="text-sm font-semibold text-stll-charcoal">{item.name}</p>
                          <p className="text-xs text-stll-muted">${item.price.toFixed(2)}</p>
                          <div className="flex gap-2 mt-1">
                            {item.is_hidden && (
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-stll-cream/60 text-stll-muted">
                                Hidden
                              </span>
                            )}
                            {item.is_sold_out && (
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-50 text-red-600">
                                Sold Out
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex flex-wrap justify-end gap-2 mt-3">
                          <button
                            onClick={() =>
                              updateAvailability(item, { is_hidden: !item.is_hidden })
                            }
                            disabled={updatingItemId === item.id}
                            className="px-3 py-1.5 text-xs font-medium bg-stll-cream/60 text-stll-accent rounded-lg hover:bg-stll-cream transition-colors disabled:opacity-60"
                          >
                            {item.is_hidden ? "Unhide" : "Hide"}
                          </button>
                          <button
                            onClick={() =>
                              updateAvailability(item, { is_sold_out: !item.is_sold_out })
                            }
                            disabled={updatingItemId === item.id}
                            className="px-3 py-1.5 text-xs font-medium bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors disabled:opacity-60"
                          >
                            {item.is_sold_out ? "In Stock" : "Sold Out"}
                          </button>
                          <button
                            onClick={() => openEdit(item)}
                            className="px-3 py-1.5 text-xs font-medium bg-stll-cream/60 text-stll-accent rounded-lg hover:bg-stll-cream transition-colors"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => setDeleteTarget(item)}
                            className="px-3 py-1.5 text-xs font-medium bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                  {totalPages > 1 && (
                    <div className="flex justify-center items-center gap-2 mt-4">
                      <button
                        className="px-3 py-1 rounded bg-stll-cream/60 text-stll-accent font-medium disabled:opacity-50"
                        onClick={() => setPage(cat, page - 1)}
                        disabled={page === 1}
                      >
                        Prev
                      </button>
                      <span className="text-xs text-stll-muted">
                        Page {page} of {totalPages}
                      </span>
                      <button
                        className="px-3 py-1 rounded bg-stll-cream/60 text-stll-accent font-medium disabled:opacity-50"
                        onClick={() => setPage(cat, page + 1)}
                        disabled={page === totalPages}
                      >
                        Next
                      </button>
                    </div>
                  )}
                </div>
              );
            })()}
        </>
      )}

      {/* Edit Modal */}
      {editItem && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-sm w-full max-w-sm p-6">
            <h2 className="text-base font-bold text-stll-charcoal mb-4">Edit Item</h2>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-stll-muted mb-1">Item Name</label>
                <input
                  className="w-full border border-stll-charcoal/15 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stll-accent/50"
                  value={editForm.name}
                  inputMode="text"
                  autoComplete="off"
                  onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-stll-muted mb-1">Price ($)</label>
                <input
                  type="text"
                  inputMode="decimal"
                  autoComplete="off"
                  className="w-full border border-stll-charcoal/15 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stll-accent/50"
                  value={editForm.price}
                  onChange={(e) => setEditForm((f) => ({ ...f, price: e.target.value }))}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-stll-muted mb-1">Category</label>
                <input
                  list="edit-category-options"
                  className="w-full border border-stll-charcoal/15 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stll-accent/50"
                  placeholder="Pick existing or type new…"
                  value={editForm.category}
                  inputMode="text"
                  autoComplete="off"
                  onChange={(e) => setEditForm((f) => ({ ...f, category: e.target.value }))}
                />
                <datalist id="edit-category-options">
                  {allCategories.map((c) => (
                    <option key={c} value={c} />
                  ))}
                </datalist>
                <p className="text-[10px] text-stll-muted mt-1">
                  Select from the list or type a new category name
                </p>
              </div>
              <label className="flex items-center gap-2 text-xs text-stll-muted">
                <input
                  type="checkbox"
                  checked={editForm.is_hidden}
                  onChange={(e) => setEditForm((f) => ({ ...f, is_hidden: e.target.checked }))}
                />
                Hide this item from POS menu
              </label>
              <label className="flex items-center gap-2 text-xs text-stll-muted">
                <input
                  type="checkbox"
                  checked={editForm.is_sold_out}
                  onChange={(e) => setEditForm((f) => ({ ...f, is_sold_out: e.target.checked }))}
                />
                Mark as sold out
              </label>
            </div>
            {editError && <p className="text-xs text-red-600 mt-2">{editError}</p>}
            <div className="flex gap-3 mt-5">
              <button
                onClick={() => setEditItem(null)}
                className="flex-1 py-2 text-sm font-medium border border-stll-charcoal/15 text-stll-muted rounded-lg hover:bg-stll-cream/50"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEdit}
                disabled={saving}
                className="flex-1 py-2 text-sm font-semibold bg-stll-charcoal text-white rounded-lg hover:bg-stll-accent disabled:opacity-60"
              >
                {saving ? "Saving…" : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-sm w-full max-w-sm p-6">
            <h2 className="text-base font-bold text-stll-charcoal mb-2">Delete Item?</h2>
            <p className="text-sm text-stll-muted mb-5">
              Remove{" "}
              <span className="font-semibold text-stll-charcoal">{deleteTarget.name}</span> from the
              menu? This cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteTarget(null)}
                className="flex-1 py-2 text-sm font-medium border border-stll-charcoal/15 text-stll-muted rounded-lg hover:bg-stll-cream/50"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 py-2 text-sm font-semibold bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-60"
              >
                {deleting ? "Deleting…" : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}