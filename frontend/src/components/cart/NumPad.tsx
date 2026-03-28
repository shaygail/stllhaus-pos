"use client";

interface Props {
  value: string;
  onChange: (value: string) => void;
  onClose: () => void;
}

const KEYS = ["7", "8", "9", "4", "5", "6", "1", "2", "3", ".", "0", "⌫"];

export default function NumPad({ value, onChange, onClose }: Props) {
  const press = (key: string) => {
    if (key === "⌫") {
      onChange(value.slice(0, -1));
      return;
    }
    // Only one decimal point
    if (key === "." && value.includes(".")) return;
    // Max 2 decimal places
    const dotIdx = value.indexOf(".");
    if (dotIdx !== -1 && value.length - dotIdx > 2) return;
    // Prevent leading zeros except "0."
    if (value === "0" && key !== ".") {
      onChange(key);
      return;
    }
    onChange(value + key);
  };

  return (
    /* Backdrop */
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/30"
      onPointerDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white border-t border-stll-charcoal/10 rounded-t-2xl w-full max-w-sm pb-safe px-4 pt-4 pb-6 shadow-[0_-8px_30px_rgba(47,47,47,0.08)]">
        {/* Display */}
        <div className="flex items-center justify-between mb-4 px-1">
          <span className="text-sm font-medium text-stll-muted">Cash given</span>
          <div className="flex items-center gap-1">
            <span className="text-stll-muted font-semibold text-2xl">$</span>
            <span className="text-4xl font-bold text-stll-charcoal min-w-[120px] text-right">
              {value || "0"}
            </span>
          </div>
        </div>

        {/* Keys */}
        <div className="grid grid-cols-3 gap-2.5">
          {KEYS.map((k) => (
            <button
              key={k}
              onPointerDown={(e) => { e.preventDefault(); press(k); }}
              className={`py-5 rounded-xl text-xl font-medium transition-all active:scale-95 touch-manipulation select-none ${
                k === "⌫"
                  ? "bg-red-50 text-red-600 hover:bg-red-100"
                  : "bg-stll-cream/80 text-stll-charcoal border border-stll-charcoal/5 hover:bg-stll-cream"
              }`}
            >
              {k}
            </button>
          ))}
        </div>

        {/* Done */}
        <button
          onPointerDown={(e) => { e.preventDefault(); onClose(); }}
          className="mt-4 w-full py-3.5 rounded-lg bg-stll-charcoal text-stll-cream text-sm font-medium uppercase tracking-[0.12em] touch-manipulation active:scale-[0.99] transition-all hover:bg-stll-accent"
        >
          Done
        </button>
      </div>
    </div>
  );
}
