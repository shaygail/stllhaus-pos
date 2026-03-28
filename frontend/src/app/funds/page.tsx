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
    <div className="stll-page">
      <div className="stll-page-inner max-w-2xl pb-20">
      <h1 className="stll-h1">Funds</h1>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 mb-4 text-sm">{error}</div>
      )}

      {/* Balance cards */}
      <div className="mb-6 grid grid-cols-2 gap-3">
        <div className="stll-card border-l-2 border-l-stll-sage p-4">
          <p className="stll-section-title mb-1">Cash</p>
          <p className="text-2xl font-medium tabular-nums text-stll-charcoal">${balance.cash.toFixed(2)}</p>
        </div>
        <div className="stll-card border-l-2 border-l-stll-accent p-4">
          <p className="stll-section-title mb-1">Bank</p>
          <p className="text-2xl font-medium tabular-nums text-stll-charcoal">${balance.bank.toFixed(2)}</p>
        </div>
      </div>

      <div className="stll-card mb-6 space-y-3 p-4">
        <h2 className="text-sm font-medium text-stll-charcoal">Adjust balance</h2>

        <div className="flex gap-2">
          {(["cash", "bank"] as Account[]).map((acc) => (
            <button
              key={acc}
              type="button"
              onClick={() => setAccount(acc)}
              className={`flex-1 rounded-lg border py-2 text-xs font-medium uppercase tracking-wide transition-colors ${
                account === acc
                  ? acc === "cash"
                    ? "border-stll-sage bg-stll-sage/20 text-stll-charcoal"
                    : "border-stll-charcoal bg-stll-charcoal text-stll-cream"
                  : "border-stll-charcoal/15 bg-white text-stll-muted hover:border-stll-charcoal/25"
              }`}
            >
              {acc === "cash" ? "Cash" : "Bank"}
            </button>
          ))}
        </div>

        <div className="flex gap-2">
          {(["add", "subtract"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setType(t)}
              className={`flex-1 rounded-lg border py-2 text-xs font-medium uppercase tracking-wide transition-colors ${
                type === t
                  ? t === "add"
                    ? "border-stll-charcoal bg-stll-charcoal text-stll-cream"
                    : "border-red-300 bg-red-600 text-white"
                  : "border-stll-charcoal/15 bg-white text-stll-muted hover:border-stll-charcoal/25"
              }`}
            >
              {t === "add" ? "Add" : "Subtract"}
            </button>
          ))}
        </div>

        {/* Amount */}
        <div>
          <label className="block text-xs font-medium text-stll-muted mb-1">Amount *</label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-stll-muted text-sm">$</span>
            <input
              type="number"
              min="0"
              step="0.01"
              placeholder="0.00"
              className="w-full border border-stll-charcoal/15 rounded-lg pl-7 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stll-accent/50"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>
        </div>

        {/* Description */}
        <div>
          <label className="block text-xs font-medium text-stll-muted mb-1">Description (optional)</label>
          <input
            className="w-full border border-stll-charcoal/15 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stll-accent/50"
            placeholder="e.g. Opening float, bank deposit…"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        {formError && <p className="text-xs text-red-600">{formError}</p>}

        <button
          type="button"
          onClick={handleSubmit}
          disabled={submitting}
          className="stll-btn-primary w-full"
        >
          {submitting ? "Saving…" : "Save entry"}
        </button>
      </div>

      {/* History — two sections */}
      {loading ? (
        <p className="text-center text-stll-muted py-10">Loading…</p>
      ) : (
        <div className="space-y-6">
          {/* Cash history */}
          <section>
            <h3 className="stll-section-title">Cash history</h3>
            {cashEntries.length === 0 ? (
              <p className="text-sm text-stll-muted/60 py-4 text-center">No cash entries yet</p>
            ) : (
              <div className="stll-card overflow-hidden shadow-none">
                {cashEntries.map((entry, i) => (
                  <div
                    key={entry.id}
                    className={`flex items-center justify-between px-4 py-3 gap-3 ${
                      i !== cashEntries.length - 1 ? "border-b border-stll-charcoal/10" : ""
                    }`}
                  >
                    <div className="min-w-0">
                      <p className="text-xs text-stll-muted">{fmtDate(entry.date)}</p>
                      {entry.description && (
                        <p className="text-sm text-stll-charcoal truncate">{entry.description}</p>
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
            <h3 className="stll-section-title">Bank history</h3>
            {bankEntries.length === 0 ? (
              <p className="text-sm text-stll-muted/60 py-4 text-center">No bank entries yet</p>
            ) : (
              <div className="stll-card overflow-hidden shadow-none">
                {bankEntries.map((entry, i) => (
                  <div
                    key={entry.id}
                    className={`flex items-center justify-between px-4 py-3 gap-3 ${
                      i !== bankEntries.length - 1 ? "border-b border-stll-charcoal/10" : ""
                    }`}
                  >
                    <div className="min-w-0">
                      <p className="text-xs text-stll-muted">{fmtDate(entry.date)}</p>
                      {entry.description && (
                        <p className="text-sm text-stll-charcoal truncate">{entry.description}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className={`text-base font-medium tabular-nums ${entry.amount >= 0 ? "text-stll-charcoal" : "text-red-600"}`}>
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
    </div>
  );
}
