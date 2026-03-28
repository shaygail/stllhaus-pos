type DayRow = { date: string; orders: number; revenue: number; expenses: number; net: number };

function cell(v: string | number): string {
  const s = String(v);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export function downloadAnalyticsCsv(opts: {
  totalRevenue: number;
  totalExpenses: number;
  totalOrders: number;
  netProfit: number;
  cashRevenue: number;
  bankRevenue: number;
  dayRows: DayRow[];
  catRows: [string, number][];
  topItems: { name: string; qty: number; revenue: number }[];
}) {
  const {
    totalRevenue,
    totalExpenses,
    totalOrders,
    netProfit,
    cashRevenue,
    bankRevenue,
    dayRows,
    catRows,
    topItems,
  } = opts;

  const lines: string[] = [];
  lines.push("STLL Haus — Analytics export");
  lines.push(`Generated,${new Date().toISOString()}`);
  lines.push("");
  lines.push("Summary");
  lines.push(`Metric,Value`);
  lines.push(`Total revenue,${totalRevenue.toFixed(2)}`);
  lines.push(`Total expenses,${totalExpenses.toFixed(2)}`);
  lines.push(`Net profit,${netProfit.toFixed(2)}`);
  lines.push(`Order count,${totalOrders}`);
  lines.push(`Cash revenue,${cashRevenue.toFixed(2)}`);
  lines.push(`Bank revenue,${bankRevenue.toFixed(2)}`);
  lines.push("");
  lines.push("Day by day");
  lines.push("Date,Orders,Revenue,Expenses,Net");
  const sortedDays = [...dayRows].sort((a, b) => a.date.localeCompare(b.date));
  for (const r of sortedDays) {
    lines.push(
      [cell(r.date), r.orders, r.revenue.toFixed(2), r.expenses.toFixed(2), r.net.toFixed(2)].join(",")
    );
  }
  lines.push("");
  lines.push("Expenses by category");
  lines.push("Category,Amount");
  for (const [cat, amt] of catRows) {
    lines.push(`${cell(cat)},${amt.toFixed(2)}`);
  }
  lines.push("");
  lines.push("Top items");
  lines.push("Item,Qty sold,Revenue");
  for (const it of topItems) {
    lines.push(`${cell(it.name)},${it.qty},${it.revenue.toFixed(2)}`);
  }

  const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `stllhaus-analytics-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
