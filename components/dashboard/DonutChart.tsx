"use client";

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts";

type Item = { code: string; label?: string; total: number };

const PALETTE = [
  "#059669", // emerald-600
  "#0891b2", // cyan-600
  "#7c3aed", // violet-600
  "#d97706", // amber-600
  "#dc2626", // red-600
  "#2563eb", // blue-600
  "#c026d3", // fuchsia-600
  "#16a34a", // green-600
];

type Props = {
  items: Item[];
  size?: number;
  innerRadius?: number;
  showLegend?: boolean;
};

export function DonutChart({
  items,
  size = 200,
  innerRadius = 55,
  showLegend = true,
}: Props) {
  const total = items.reduce((s, i) => s + i.total, 0);
  if (total === 0) {
    return (
      <div
        className="flex items-center justify-center rounded-2xl border border-zinc-200 bg-zinc-50"
        style={{ height: size }}
      >
        <p className="text-sm font-semibold text-zinc-400">No data</p>
      </div>
    );
  }

  const data = items.map((item) => ({
    name: item.label ?? item.code,
    value: item.total,
    pct: Math.round((item.total / total) * 100),
  }));

  return (
    <ResponsiveContainer width="100%" height={size}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          innerRadius={innerRadius}
          outerRadius={innerRadius + 38}
          paddingAngle={2}
          dataKey="value"
          strokeWidth={0}
        >
          {data.map((_, index) => (
            <Cell key={index} fill={PALETTE[index % PALETTE.length]} />
          ))}
        </Pie>
        <Tooltip
          formatter={(value: number, name: string) => [
            `${value.toLocaleString()} (${Math.round((value / total) * 100)}%)`,
            name,
          ]}
          contentStyle={{
            borderRadius: "10px",
            border: "1px solid #e2e8f0",
            boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
            fontSize: "12px",
            fontWeight: 700,
          }}
        />
        {showLegend && (
          <Legend
            wrapperStyle={{ fontSize: "11px", fontWeight: 700, paddingTop: "4px" }}
            iconType="circle"
            iconSize={8}
          />
        )}
      </PieChart>
    </ResponsiveContainer>
  );
}
