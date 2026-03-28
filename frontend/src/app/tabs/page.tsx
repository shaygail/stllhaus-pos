"use client";
import { useEffect, useState } from "react";
import { fetchTabs, createTab, settleTab, reopenTab, deleteTab } from "@/lib/api";
import { TabResponse } from "@/types";

export default function TabsPage() {
  const [tabs, setTabs] = useState<TabResponse[]>([]);
  const [loading, setLoading] = useState(true);

  // New tab form
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [direction, setDirection] = useState<"they_owe" | "i_owe">("they_owe");
  const [desc, setDesc] = useState("");
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);

  const load = () => {
    setLoading(true);
    fetchTabs()
      .then(setTabs)
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleCreate = async () => {
    const parsed = parseFloat(amount);
    if (!name.trim()) { setFormError("Enter a name."); return; }
    if (!amount || isNaN(parsed) || parsed <= 0) { setFormError("Enter a valid amount."); return; }
    setFormError(""); setSaving(true);
    try {
      await createTab({ customer_name: name.trim(), amount: parsed, direction, description: desc.trim() || undefined });
      setName(""); setAmount(""); setDesc(""); setDirection("they_owe");
      setShowForm(false);
      load();
    } catch {
      setFormError("Failed to save. Try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleSettle = async (id: number) => {
    await settleTab(id).catch(console.error);
    load();
  };

  const handleReopen = async (id: number) => {
    await reopenTab(id).catch(console.error);
    load();
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this tab permanently?")) return;
    await deleteTab(id).catch(console.error);
    load();
  };

  const openTabs = tabs.filter((t) => t.status === "open");
  const settledTabs = tabs.filter((t) => t.status === "settled");
  const totalOwed = openTabs.filter((t) => t.direction === "they_owe").reduce((s, t) => s + t.amount, 0);
  const totalIOwe = openTabs.filter((t) => t.direction === "i_owe").reduce((s, t) => s + t.amount, 0);

  return (
    <div className="stll-page">
      <div className="stll-page-inner max-w-2xl">
        <div className="mb-6 flex items-center justify-between gap-4">
          <h1 className="stll-h1 mb-0">Tabs</h1>
          <button
            type="button"
            onClick={() => {
              setShowForm((v) => !v);
              setFormError("");
            }}
            className="stll-btn-primary shrink-0 text-xs uppercase tracking-wide"
          >
            New tab
          </button>
        </div>

        {showForm && (
          <div className="stll-card mb-6 space-y-3 p-5">
            <h2 className="text-sm font-medium text-stll-charcoal">New tab</h2>

            <div>
              <label className="stll-section-title mb-2 block">Direction</label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setDirection("they_owe")}
                  className={`flex-1 rounded-lg border py-2.5 text-xs font-medium uppercase tracking-wide transition-colors ${
                    direction === "they_owe"
                      ? "border-stll-charcoal bg-stll-charcoal text-stll-cream"
                      : "border-stll-charcoal/15 bg-white text-stll-muted hover:border-stll-charcoal/25"
                  }`}
                >
                  They owe me
                </button>
                <button
                  type="button"
                  onClick={() => setDirection("i_owe")}
                  className={`flex-1 rounded-lg border py-2.5 text-xs font-medium uppercase tracking-wide transition-colors ${
                    direction === "i_owe"
                      ? "border-stll-sage bg-stll-sage/25 text-stll-charcoal"
                      : "border-stll-charcoal/15 bg-white text-stll-muted hover:border-stll-charcoal/25"
                  }`}
                >
                  I owe them
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-stll-muted mb-1">Name *</label>
                <input
                  className="stll-input"
                  placeholder="e.g. Kaye"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-stll-muted mb-1">Amount *</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-stll-muted text-sm">$</span>
                  <input
                    type="number" min="0" step="0.01" placeholder="0.00"
                    className="w-full border border-stll-charcoal/15 rounded-lg pl-7 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stll-accent/50"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-stll-muted mb-1">Note (optional)</label>
              <input
                className="w-full border border-stll-charcoal/15 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stll-accent/50"
                placeholder="e.g. 2x Matcha Latte, paid next time"
                value={desc}
                onChange={(e) => setDesc(e.target.value)}
              />
            </div>

            {formError && <p className="text-xs text-red-600">{formError}</p>}

            <div className="flex gap-3 pt-1">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="stll-btn-secondary flex-1"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCreate}
                disabled={saving}
                className="stll-btn-primary flex-1"
              >
                {saving ? "Saving…" : "Open tab"}
              </button>
            </div>
          </div>
        )}

        {(totalOwed > 0 || totalIOwe > 0) && (
          <div className="mb-6 grid grid-cols-2 gap-3">
            {totalOwed > 0 && (
              <div className="stll-card border-l-2 border-l-stll-accent p-4">
                <p className="stll-section-title mb-1">Owed to you</p>
                <p className="text-xl font-medium text-stll-charcoal tabular-nums">${totalOwed.toFixed(2)}</p>
              </div>
            )}
            {totalIOwe > 0 && (
              <div className="stll-card border-l-2 border-l-stll-sage p-4">
                <p className="stll-section-title mb-1">You owe</p>
                <p className="text-xl font-medium text-stll-charcoal tabular-nums">${totalIOwe.toFixed(2)}</p>
              </div>
            )}
          </div>
        )}

        {/* Open tabs */}
        {loading ? (
          <p className="text-stll-muted text-center py-16 animate-pulse">Loading…</p>
        ) : (
          <>
            {openTabs.length === 0 && settledTabs.length === 0 && (
              <div className="py-20 text-center text-stll-muted/60">
                <p className="text-sm">No tabs yet.</p>
              </div>
            )}

            {openTabs.length > 0 && (
              <div className="mb-6 space-y-3">
                <p className="stll-section-title">Open</p>
                {openTabs.map((tab) => (
                  <TabCard key={tab.id} tab={tab} onSettle={handleSettle} onReopen={handleReopen} onDelete={handleDelete} />
                ))}
              </div>
            )}

            {settledTabs.length > 0 && (
              <div className="space-y-3">
                <p className="stll-section-title">Settled</p>
                {settledTabs.map((tab) => (
                  <TabCard key={tab.id} tab={tab} onSettle={handleSettle} onReopen={handleReopen} onDelete={handleDelete} />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function TabCard({
  tab,
  onSettle,
  onReopen,
  onDelete,
}: {
  tab: TabResponse;
  onSettle: (id: number) => void;
  onReopen: (id: number) => void;
  onDelete: (id: number) => void;
}) {
  const isTheyOwe = tab.direction === "they_owe";
  const isOpen = tab.status === "open";

  return (
    <div
      className={`stll-card overflow-hidden ${isOpen ? "" : "opacity-70"} ${
        isOpen ? (isTheyOwe ? "border-l-2 border-l-stll-accent" : "border-l-2 border-l-stll-sage") : ""
      }`}
    >
      <div
        className={`border-b border-stll-charcoal/10 px-4 py-2 text-[10px] font-medium uppercase tracking-[0.16em] ${
          isOpen
            ? isTheyOwe
              ? "bg-stll-cream/50 text-stll-charcoal"
              : "bg-stll-sage/10 text-stll-charcoal"
            : "bg-stll-cream/40 text-stll-muted"
        }`}
      >
        {isOpen ? (isTheyOwe ? "They owe you" : "You owe") : "Settled"}
      </div>
      <div className="flex items-start justify-between gap-3 px-4 py-3">
        <div className="min-w-0 flex-1">
          <p className="text-base font-medium text-stll-charcoal">{tab.customer_name}</p>
          <p
            className={`mt-0.5 text-xl font-medium tabular-nums ${
              isOpen ? "text-stll-charcoal" : "text-stll-muted"
            }`}
          >
            ${tab.amount.toFixed(2)}
          </p>
          {tab.description && <p className="text-xs text-stll-muted mt-1">{tab.description}</p>}
          <p className="text-[11px] text-stll-muted/60 mt-1">
            Opened {new Date(tab.date).toLocaleDateString("en-NZ", { day: "numeric", month: "short", year: "numeric" })}
            {tab.settled_at && ` · Settled ${new Date(tab.settled_at).toLocaleDateString("en-NZ", { day: "numeric", month: "short" })}`}
          </p>
        </div>
        <div className="flex shrink-0 flex-col gap-1.5">
          {isOpen ? (
            <button
              type="button"
              onClick={() => onSettle(tab.id)}
              className="rounded-lg bg-stll-charcoal px-3 py-1.5 text-xs font-medium text-stll-cream transition-colors hover:bg-stll-accent"
            >
              Mark settled
            </button>
          ) : (
            <button
              type="button"
              onClick={() => onReopen(tab.id)}
              className="rounded-lg border border-stll-charcoal/15 bg-white px-3 py-1.5 text-xs font-medium text-stll-muted transition-colors hover:border-stll-charcoal/25 hover:text-stll-charcoal"
            >
              Re-open
            </button>
          )}
          <button
            type="button"
            onClick={() => onDelete(tab.id)}
            className="rounded-lg px-3 py-1.5 text-xs font-medium text-red-600/80 transition-colors hover:bg-red-50"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}
