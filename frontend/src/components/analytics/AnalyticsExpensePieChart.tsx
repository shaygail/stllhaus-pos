"use client";

import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

export type ExpensePieDatum = { name: string; value: number };

/** STLL-inspired palette — repeats if there are many categories */
const SLICE_COLORS = [
  "#A3B18A",
  "#C6A27E",
  "#2F2F2F",
  "#9AAC7A",
  "#D4B896",
  "#7A7A7A",
  "#C4D4B0",
  "#8B7355",
];

function PieTooltipContent({
  active,
  payload,
  total,
}: {
  active?: boolean;
  payload?: { name: string; value: number; payload: ExpensePieDatum }[];
  total: number;
}) {
  if (!active || !payload?.length) return null;
  const { name, value } = payload[0];
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div className="rounded-lg border border-stll-charcoal/10 bg-white px-3 py-2 text-xs shadow-sm">
      <p className="font-medium text-stll-charcoal">{name}</p>
      <p className="mt-0.5 tabular-nums text-stll-muted">
        ${value.toFixed(2)}
        <span className="text-stll-muted/70"> · {pct}%</span>
      </p>
    </div>
  );
}

export default function AnalyticsExpensePieChart({
  data,
  total,
}: {
  data: ExpensePieDatum[];
  total: number;
}) {
  if (data.length === 0) {
    return (
      <div className="flex h-[280px] items-center justify-center text-sm text-stll-muted">
        No expense categories to chart yet.
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <PieChart margin={{ top: 8, right: 8, bottom: 8, left: 8 }}>
        <Pie
          data={data}
          dataKey="value"
          nameKey="name"
          cx="50%"
          cy="50%"
          innerRadius={52}
          outerRadius={100}
          paddingAngle={2}
          stroke="#F7F5F2"
          strokeWidth={2}
        >
          {data.map((_, i) => (
            <Cell key={`cell-${i}`} fill={SLICE_COLORS[i % SLICE_COLORS.length]} />
          ))}
        </Pie>
        <Tooltip content={<PieTooltipContent total={total} />} />
        <Legend
          layout="horizontal"
          verticalAlign="bottom"
          align="center"
          wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
          formatter={(value) => <span className="text-stll-muted">{value}</span>}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}
