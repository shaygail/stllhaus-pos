import { SaleResponse } from "@/types";

export default function OrderCard({ sale }: { sale: SaleResponse }) {
  const orderLabel =
    sale.daily_order_number != null ? `Order #${sale.daily_order_number}` : `#${sale.id}`;

  return (
    <div className="rounded-lg border border-stll-charcoal/10 bg-white p-4">
      <div className="flex justify-between items-start gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-medium text-stll-charcoal">{orderLabel}</p>
            {sale.customer_name && (
              <span className="text-xs text-stll-muted">· {sale.customer_name}</span>
            )}
          </div>
          <p className="mt-0.5 text-[11px] text-stll-muted">
            {new Date(sale.date).toLocaleString("en-NZ", {
              dateStyle: "medium",
              timeStyle: "short",
            })}
          </p>
          <ul className="mt-2 space-y-0.5 text-sm text-stll-charcoal">
            {sale.items.map((item, i) => (
              <li key={i}>
                {item.name} ×{item.quantity}
              </li>
            ))}
          </ul>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-sm font-medium text-stll-charcoal tabular-nums">
            ${sale.subtotal.toFixed(2)}
          </p>
          <span
            className={`mt-1 inline-block text-[10px] font-medium uppercase tracking-wide ${
              sale.payment_method === "Cash" ? "text-stll-sage" : "text-stll-muted"
            }`}
          >
            {sale.payment_method}
          </span>
        </div>
      </div>
    </div>
  );
}
