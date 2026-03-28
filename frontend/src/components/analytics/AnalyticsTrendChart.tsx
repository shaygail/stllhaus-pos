"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export type TrendDatum = {
  date: string;
  label: string;
  revenue: number;
  expenses: number;
};

const SAGE = "#A3B18A";
const TAUPE = "#C6A27E";
const GRID = "#E8E4DE";
const MUTED = "#7A7A7A";

function TooltipContent({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { name: string; value: number; color: string }[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-stll-charcoal/10 bg-white px-3 py-2 text-xs shadow-sm">
      <p className="mb-1 font-medium text-stll-charcoal">{label}</p>
      <ul className="space-y-0.5">
        {payload.map((p) => (
          <li key={p.name} className="flex items-center gap-2 tabular-nums text-stll-muted">
            <span className="h-2 w-2 rounded-sm" style={{ backgroundColor: p.color }} />
            <span>{p.name}:</span>
            <span className="font-medium text-stll-charcoal">${p.value.toFixed(2)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function AnalyticsTrendChart({ data }: { data: TrendDatum[] }) {
  if (data.length === 0) {
    return (
      <div className="flex h-[280px] items-center justify-center text-sm text-stll-muted">
        Add sales or expenses on more than one day to see the trend chart.
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data} margin={{ top: 12, right: 8, left: 0, bottom: 4 }}>
        <CartesianGrid stroke={GRID} strokeDasharray="4 4" vertical={false} />
        <XAxis
          dataKey="label"
          tick={{ fill: MUTED, fontSize: 10 }}
          tickLine={false}
          axisLine={{ stroke: GRID }}
          interval={data.length > 16 ? Math.floor(data.length / 8) : 0}
        />
        <YAxis
          tick={{ fill: MUTED, fontSize: 10 }}
          tickLine={false}
          axisLine={{ stroke: GRID }}
          tickFormatter={(v) => (v >= 1000 ? `$${(v / 1000).toFixed(1)}k` : `$${v}`)}
          width={44}
        />
        <Tooltip content={<TooltipContent />} cursor={{ fill: "rgba(247, 245, 242, 0.6)" }} />
        <Legend
          wrapperStyle={{ fontSize: 11, paddingTop: 12 }}
          formatter={(value) => <span className="text-stll-muted">{value}</span>}
        />
        <Bar dataKey="revenue" name="Revenue" fill={SAGE} radius={[3, 3, 0, 0]} maxBarSize={28} />
        <Bar dataKey="expenses" name="Expenses" fill={TAUPE} radius={[3, 3, 0, 0]} maxBarSize={28} />
      </BarChart>
    </ResponsiveContainer>
  );
}
