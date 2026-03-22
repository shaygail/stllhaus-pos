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
    <div className="h-full overflow-y-auto p-6">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <h1 className="text-2xl font-bold text-cafe-dark">Tabs</h1>
          <button
            onClick={() => { setShowForm((v) => !v); setFormError(""); }}
            className="px-4 py-2 rounded-xl bg-cafe-brown text-white text-sm font-semibold hover:bg-cafe-dark transition-colors"
          >
            + New Tab
          </button>
        </div>

        {/* New tab form */}
        {showForm && (
          <div className="bg-white rounded-2xl border border-beige-200 shadow-sm p-5 mb-5 space-y-3">
            <h2 className="font-semibold text-cafe-dark">New Tab</h2>

            {/* Direction toggle */}
            <div>
              <label className="block text-xs font-medium text-cafe-warm mb-1">Direction *</label>
              <div className="flex gap-2">
                <button
                  onClick={() => setDirection("they_owe")}
                  className={`flex-1 py-2.5 text-sm font-semibold rounded-xl transition-colors ${direction === "they_owe" ? "bg-orange-500 text-white" : "bg-beige-100 text-cafe-warm hover:bg-beige-200"}`}
                >
                  They owe me 💸
                </button>
                <button
                  onClick={() => setDirection("i_owe")}
                  className={`flex-1 py-2.5 text-sm font-semibold rounded-xl transition-colors ${direction === "i_owe" ? "bg-blue-500 text-white" : "bg-beige-100 text-cafe-warm hover:bg-beige-200"}`}
                >
                  I owe them 🙏
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-cafe-warm mb-1">Name *</label>
                <input
                  className="w-full border border-beige-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cafe-brown"
                  placeholder="e.g. Kaye"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-cafe-warm mb-1">Amount *</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-cafe-warm text-sm">$</span>
                  <input
                    type="number" min="0" step="0.01" placeholder="0.00"
                    className="w-full border border-beige-300 rounded-lg pl-7 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cafe-brown"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-cafe-warm mb-1">Note (optional)</label>
              <input
                className="w-full border border-beige-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cafe-brown"
                placeholder="e.g. 2x Matcha Latte, paid next time"
                value={desc}
                onChange={(e) => setDesc(e.target.value)}
              />
            </div>

            {formError && <p className="text-xs text-red-600">{formError}</p>}

            <div className="flex gap-3 pt-1">
              <button
                onClick={() => setShowForm(false)}
                className="flex-1 py-2.5 text-sm font-semibold bg-beige-100 text-cafe-warm rounded-xl hover:bg-beige-200 transition-colors"
              >Cancel</button>
              <button
                onClick={handleCreate}
                disabled={saving}
                className="flex-1 py-2.5 text-sm font-semibold bg-cafe-brown text-white rounded-xl hover:bg-cafe-dark disabled:opacity-60 transition-colors"
              >{saving ? "Saving…" : "Open Tab"}</button>
            </div>
          </div>
        )}

        {/* Summary strip */}
        {(totalOwed > 0 || totalIOwe > 0) && (
          <div className="grid grid-cols-2 gap-3 mb-5">
            {totalOwed > 0 && (
              <div className="bg-orange-50 border border-orange-200 rounded-2xl p-4">
                <p className="text-xs font-semibold text-orange-600 uppercase tracking-widest">Owed to Me</p>
                <p className="text-2xl font-bold text-orange-700 mt-1">${totalOwed.toFixed(2)}</p>
              </div>
            )}
            {totalIOwe > 0 && (
              <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4">
                <p className="text-xs font-semibold text-blue-600 uppercase tracking-widest">I Owe</p>
                <p className="text-2xl font-bold text-blue-700 mt-1">${totalIOwe.toFixed(2)}</p>
              </div>
            )}
          </div>
        )}

        {/* Open tabs */}
        {loading ? (
          <p className="text-cafe-warm text-center py-16 animate-pulse">Loading…</p>
        ) : (
          <>
            {openTabs.length === 0 && settledTabs.length === 0 && (
              <div className="text-center py-20 text-cafe-warm/50">
                <p className="text-5xl mb-3">🤝</p>
                <p>No tabs yet</p>
              </div>
            )}

            {openTabs.length > 0 && (
              <div className="space-y-3 mb-6">
                <p className="text-[11px] font-bold uppercase tracking-widest text-cafe-warm">Open</p>
                {openTabs.map((tab) => (
                  <TabCard key={tab.id} tab={tab} onSettle={handleSettle} onReopen={handleReopen} onDelete={handleDelete} />
                ))}
              </div>
            )}

            {settledTabs.length > 0 && (
              <div className="space-y-3">
                <p className="text-[11px] font-bold uppercase tracking-widest text-cafe-warm">Settled</p>
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
    <div className={`bg-white rounded-2xl border shadow-sm overflow-hidden ${isOpen ? (isTheyOwe ? "border-orange-200" : "border-blue-200") : "border-beige-200 opacity-70"}`}>
      <div className={`px-4 py-1.5 text-xs font-bold uppercase tracking-widest ${isOpen ? (isTheyOwe ? "bg-orange-100 text-orange-600" : "bg-blue-100 text-blue-600") : "bg-beige-100 text-cafe-warm"}`}>
        {isOpen ? (isTheyOwe ? "💸 They owe me" : "🙏 I owe them") : "✅ Settled"}
      </div>
      <div className="px-4 py-3 flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="font-bold text-cafe-dark text-base">{tab.customer_name}</p>
          <p className={`text-xl font-bold mt-0.5 ${isOpen ? (isTheyOwe ? "text-orange-600" : "text-blue-600") : "text-cafe-warm"}`}>
            ${tab.amount.toFixed(2)}
          </p>
          {tab.description && <p className="text-xs text-cafe-warm mt-1">{tab.description}</p>}
          <p className="text-[11px] text-cafe-warm/60 mt-1">
            Opened {new Date(tab.date).toLocaleDateString("en-NZ", { day: "numeric", month: "short", year: "numeric" })}
            {tab.settled_at && ` · Settled ${new Date(tab.settled_at).toLocaleDateString("en-NZ", { day: "numeric", month: "short" })}`}
          </p>
        </div>
        <div className="flex flex-col gap-1.5 shrink-0">
          {isOpen ? (
            <button
              onClick={() => onSettle(tab.id)}
              className="px-3 py-1.5 text-xs font-semibold bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
            >✓ Settled</button>
          ) : (
            <button
              onClick={() => onReopen(tab.id)}
              className="px-3 py-1.5 text-xs font-semibold bg-beige-200 text-cafe-dark rounded-lg hover:bg-beige-300 transition-colors"
            >Re-open</button>
          )}
          <button
            onClick={() => onDelete(tab.id)}
            className="px-3 py-1.5 text-xs font-semibold bg-red-50 text-red-400 rounded-lg hover:bg-red-100 transition-colors"
          >Delete</button>
        </div>
      </div>
    </div>
  );
}
