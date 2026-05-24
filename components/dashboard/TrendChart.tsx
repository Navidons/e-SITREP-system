"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

type Series = {
  key: string;
  label: string;
  color: string;
  fillColor: string;
};

type Props = {
  labels: string[];
  series: Series[];
  data: Record<string, number[]>;
  height?: number;
};

export function TrendChart({ labels, series, data, height = 220 }: Props) {
  const chartData = labels.map((label, i) => {
    const point: Record<string, string | number> = { label };
    for (const s of series) {
      point[s.key] = data[s.key]?.[i] ?? 0;
    }
    return point;
  });

  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
        <defs>
          {series.map((s) => (
            <linearGradient key={s.key} id={`grad-${s.key}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={s.color} stopOpacity={0.25} />
              <stop offset="95%" stopColor={s.color} stopOpacity={0.02} />
            </linearGradient>
          ))}
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
        <XAxis
          dataKey="label"
          tick={{ fontSize: 10, fontWeight: 700, fill: "#94a3b8" }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tick={{ fontSize: 10, fontWeight: 700, fill: "#94a3b8" }}
          axisLine={false}
          tickLine={false}
          allowDecimals={false}
        />
        <Tooltip
          contentStyle={{
            borderRadius: "10px",
            border: "1px solid #e2e8f0",
            boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
            fontSize: "12px",
            fontWeight: 700,
          }}
          labelStyle={{ color: "#475569", marginBottom: "4px", fontWeight: 800 }}
        />
        {series.length > 1 && (
          <Legend
            wrapperStyle={{ fontSize: "11px", fontWeight: 700, paddingTop: "8px" }}
          />
        )}
        {series.map((s) => (
          <Area
            key={s.key}
            type="monotone"
            dataKey={s.key}
            name={s.label}
            stroke={s.color}
            strokeWidth={2.5}
            fill={`url(#grad-${s.key})`}
            dot={{ r: 3, fill: s.color, strokeWidth: 0 }}
            activeDot={{ r: 5, fill: s.color, strokeWidth: 2, stroke: "#fff" }}
          />
        ))}
      </AreaChart>
    </ResponsiveContainer>
  );
}
