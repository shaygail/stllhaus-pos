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
      <div className="bg-white rounded-t-3xl shadow-2xl w-full max-w-sm pb-safe px-4 pt-4 pb-6">
        {/* Display */}
        <div className="flex items-center justify-between mb-4 px-1">
          <span className="text-sm font-medium text-cafe-warm">Cash given</span>
          <div className="flex items-center gap-1">
            <span className="text-cafe-warm font-semibold text-2xl">$</span>
            <span className="text-4xl font-bold text-cafe-dark min-w-[120px] text-right">
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
              className={`py-5 rounded-2xl text-xl font-bold transition-all active:scale-95 touch-manipulation select-none ${
                k === "⌫"
                  ? "bg-red-50 text-red-500 hover:bg-red-100"
                  : "bg-beige-100 text-cafe-dark hover:bg-beige-200"
              }`}
            >
              {k}
            </button>
          ))}
        </div>

        {/* Done */}
        <button
          onPointerDown={(e) => { e.preventDefault(); onClose(); }}
          className="mt-4 w-full py-4 rounded-2xl bg-cafe-brown text-white font-bold text-lg touch-manipulation active:scale-95 transition-all"
        >
          Done
        </button>
      </div>
    </div>
  );
}
