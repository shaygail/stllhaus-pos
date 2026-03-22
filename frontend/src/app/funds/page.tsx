"use client";
import { useEffect, useState } from "react";
import { BalanceEntryResponse, BalanceSummary } from "@/types";
import { fetchBalance, fetchBalanceEntries, addBalanceEntry, deleteBalanceEntry } from "@/lib/api";

type Account = "cash" | "bank";

function toUTC(iso: string) {
  return iso.endsWith("Z") || iso.includes("+") ? iso : iso + "Z";
}

function fmtDate(iso: string) {
  return new Date(toUTC(iso)).toLocaleString("en-NZ", {
    weekday: "short", month: "short", day: "numeric",
    hour: "numeric", minute: "2-digit",
  });
}

export default function FundsPage() {
  const [balance, setBalance] = useState<BalanceSummary>({ cash: 0, bank: 0 });
  const [entries, setEntries] = useState<BalanceEntryResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Form state
  const [account, setAccount] = useState<Account>("cash");
  const [type, setType] = useState<"add" | "subtract">("add");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const load = async () => {
    try {
      const [b, e] = await Promise.all([fetchBalance(), fetchBalanceEntries()]);
      setBalance(b);
      setEntries(e);
    } catch {
      setError("Could not load data. Is the backend running?");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleSubmit = async () => {
    const parsed = parseFloat(amount);
    if (!amount || isNaN(parsed) || parsed <= 0) {
      setFormError("Enter a valid amount greater than 0.");
      return;
    }
    setFormError("");
    setSubmitting(true);
    try {
      await addBalanceEntry({
        account,
        amount: type === "add" ? parsed : -parsed,
        description: description.trim() || undefined,
      });
      setAmount("");
      setDescription("");
      await load();
    } catch {
      setFormError("Failed to save. Try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Remove this entry?")) return;
    try {
      await deleteBalanceEntry(id);
      await load();
    } catch { /* ignore */ }
  };

  const cashEntries = entries.filter((e) => e.account === "cash");
  const bankEntries = entries.filter((e) => e.account === "bank");

  return (
    <div className="max-w-2xl mx-auto p-4 pb-20">
      <h1 className="text-2xl font-bold text-cafe-brown mb-5">Funds</h1>

      {error && (
        <div className="bg-red-100 border border-red-300 text-red-700 rounded-lg p-3 mb-4 text-sm">{error}</div>
      )}

      {/* Balance cards */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <div className="bg-green-50 border border-green-200 rounded-2xl p-4 shadow-sm">
          <p className="text-[11px] text-green-700 uppercase tracking-widest font-semibold">Cash in Hand</p>
          <p className="text-3xl font-bold text-green-800 mt-1">${balance.cash.toFixed(2)}</p>
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 shadow-sm">
          <p className="text-[11px] text-blue-700 uppercase tracking-widest font-semibold">Bank Balance</p>
          <p className="text-3xl font-bold text-blue-800 mt-1">${balance.bank.toFixed(2)}</p>
        </div>
      </div>

      {/* Add / Subtract form */}
      <div className="bg-white rounded-2xl border border-beige-200 shadow-sm p-4 mb-6 space-y-3">
        <h2 className="font-semibold text-cafe-dark">Add / Subtract Funds</h2>

        {/* Account toggle */}
        <div className="flex gap-2">
          {(["cash", "bank"] as Account[]).map((acc) => (
            <button
              key={acc}
              onClick={() => setAccount(acc)}
              className={`flex-1 py-2 text-sm font-semibold rounded-xl transition-colors ${
                account === acc
                  ? acc === "cash" ? "bg-green-500 text-white" : "bg-blue-500 text-white"
                  : "bg-beige-100 text-cafe-warm hover:bg-beige-200"
              }`}
            >
              {acc === "cash" ? "💵 Cash" : "🏦 Bank"}
            </button>
          ))}
        </div>

        {/* Add / Subtract toggle */}
        <div className="flex gap-2">
          {(["add", "subtract"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setType(t)}
              className={`flex-1 py-2 text-sm font-semibold rounded-xl transition-colors ${
                type === t
                  ? t === "add" ? "bg-cafe-brown text-white" : "bg-red-500 text-white"
                  : "bg-beige-100 text-cafe-warm hover:bg-beige-200"
              }`}
            >
              {t === "add" ? "+ Add" : "− Subtract"}
            </button>
          ))}
        </div>

        {/* Amount */}
        <div>
          <label className="block text-xs font-medium text-cafe-warm mb-1">Amount *</label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-cafe-warm text-sm">$</span>
            <input
              type="number"
              min="0"
              step="0.01"
              placeholder="0.00"
              className="w-full border border-beige-300 rounded-lg pl-7 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cafe-brown"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>
        </div>

        {/* Description */}
        <div>
          <label className="block text-xs font-medium text-cafe-warm mb-1">Description (optional)</label>
          <input
            className="w-full border border-beige-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cafe-brown"
            placeholder="e.g. Opening float, bank deposit…"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        {formError && <p className="text-xs text-red-600">{formError}</p>}

        <button
          onClick={handleSubmit}
          disabled={submitting}
          className="w-full py-3 bg-cafe-brown text-white font-semibold rounded-xl hover:bg-cafe-dark disabled:opacity-60 transition-colors"
        >
          {submitting ? "Saving…" : "Save Entry"}
        </button>
      </div>

      {/* History — two sections */}
      {loading ? (
        <p className="text-center text-cafe-warm py-10">Loading…</p>
      ) : (
        <div className="space-y-6">
          {/* Cash history */}
          <section>
            <h3 className="text-[11px] font-bold uppercase tracking-widest text-cafe-warm mb-3">💵 Cash History</h3>
            {cashEntries.length === 0 ? (
              <p className="text-sm text-cafe-warm/60 py-4 text-center">No cash entries yet</p>
            ) : (
              <div className="bg-white rounded-2xl border border-beige-200 shadow-sm overflow-hidden">
                {cashEntries.map((entry, i) => (
                  <div
                    key={entry.id}
                    className={`flex items-center justify-between px-4 py-3 gap-3 ${
                      i !== cashEntries.length - 1 ? "border-b border-beige-100" : ""
                    }`}
                  >
                    <div className="min-w-0">
                      <p className="text-xs text-cafe-warm">{fmtDate(entry.date)}</p>
                      {entry.description && (
                        <p className="text-sm text-cafe-dark truncate">{entry.description}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className={`text-base font-bold ${entry.amount >= 0 ? "text-green-600" : "text-red-500"}`}>
                        {entry.amount >= 0 ? "+" : ""}${Math.abs(entry.amount).toFixed(2)}
                      </span>
                      <button
                        onClick={() => handleDelete(entry.id)}
                        className="text-xs text-red-400 hover:text-red-600 transition-colors"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Bank history */}
          <section>
            <h3 className="text-[11px] font-bold uppercase tracking-widest text-cafe-warm mb-3">🏦 Bank History</h3>
            {bankEntries.length === 0 ? (
              <p className="text-sm text-cafe-warm/60 py-4 text-center">No bank entries yet</p>
            ) : (
              <div className="bg-white rounded-2xl border border-beige-200 shadow-sm overflow-hidden">
                {bankEntries.map((entry, i) => (
                  <div
                    key={entry.id}
                    className={`flex items-center justify-between px-4 py-3 gap-3 ${
                      i !== bankEntries.length - 1 ? "border-b border-beige-100" : ""
                    }`}
                  >
                    <div className="min-w-0">
                      <p className="text-xs text-cafe-warm">{fmtDate(entry.date)}</p>
                      {entry.description && (
                        <p className="text-sm text-cafe-dark truncate">{entry.description}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className={`text-base font-bold ${entry.amount >= 0 ? "text-blue-600" : "text-red-500"}`}>
                        {entry.amount >= 0 ? "+" : ""}${Math.abs(entry.amount).toFixed(2)}
                      </span>
                      <button
                        onClick={() => handleDelete(entry.id)}
                        className="text-xs text-red-400 hover:text-red-600 transition-colors"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
