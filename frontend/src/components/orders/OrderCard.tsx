import { SaleResponse } from "@/types";

export default function OrderCard({ sale }: { sale: SaleResponse }) {
  return (
    <div className="border border-beige-200 rounded-xl p-4 bg-white shadow-sm">
      <div className="flex justify-between items-start">
        <div>
          <p className="text-xs text-cafe-warm">
            #{sale.id} ·{" "}
            {new Date(sale.date).toLocaleString("en-NZ", {
              dateStyle: "medium",
              timeStyle: "short",
            })}
          </p>
          <ul className="mt-1 text-sm text-cafe-dark">
            {sale.items.map((item, i) => (
              <li key={i}>
                {item.name} ×{item.quantity}
              </li>
            ))}
          </ul>
        </div>
        <div className="text-right shrink-0 ml-4">
          <p className="text-base font-bold text-cafe-dark">${sale.subtotal.toFixed(2)}</p>
          <span
            className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
              sale.payment_method === "Cash"
                ? "bg-green-100 text-green-700"
                : "bg-blue-100 text-blue-700"
            }`}
          >
            {sale.payment_method}
          </span>
        </div>
      </div>
    </div>
  );
}