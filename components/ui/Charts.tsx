"use client";

import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid,
  BarChart, Bar, Line, LineChart, Legend,
} from "recharts";

export interface TrendPoint {
  label: string;
  value: number | null;
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-border bg-surface px-3 py-2 text-xs shadow-card">
      <p className="mb-1 font-medium text-ink">{label}</p>
      {payload.map((p: any) => (
        <p key={p.dataKey} style={{ color: p.color }}>
          {p.name}: <span className="font-semibold">{p.value}</span>
        </p>
      ))}
    </div>
  );
}

export function TrendChart({
  data,
  color = "var(--primary)",
  height = 200,
  unit,
}: {
  data: TrendPoint[];
  color?: string;
  height?: number;
  unit?: string;
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
        <defs>
          <linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.35} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 5" stroke="var(--border)" vertical={false} />
        <XAxis
          dataKey="label"
          tick={{ fontSize: 11, fill: "var(--ink-faint)" }}
          axisLine={false}
          tickLine={false}
          minTickGap={24}
        />
        <YAxis
          domain={[0, 10]}
          tick={{ fontSize: 11, fill: "var(--ink-faint)" }}
          axisLine={false}
          tickLine={false}
          width={24}
        />
        <Tooltip content={<CustomTooltip />} />
        <Area
          type="monotone"
          dataKey="value"
          stroke={color}
          strokeWidth={2.5}
          fill="url(#trendFill)"
          connectNulls
          dot={false}
          name={unit || "value"}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function MultiTrendChart({
  data,
  series,
  height = 220,
}: {
  data: Record<string, number | string | null>[];
  series: { key: string; color: string; name: string }[];
  height?: number;
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 5" stroke="var(--border)" vertical={false} />
        <XAxis dataKey="label" tick={{ fontSize: 11, fill: "var(--ink-faint)" }} axisLine={false} tickLine={false} minTickGap={24} />
        <YAxis domain={[0, 10]} tick={{ fontSize: 11, fill: "var(--ink-faint)" }} axisLine={false} tickLine={false} width={24} />
        <Tooltip content={<CustomTooltip />} />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        {series.map((s) => (
          <Line
            key={s.key}
            type="monotone"
            dataKey={s.key}
            stroke={s.color}
            strokeWidth={2.25}
            dot={false}
            connectNulls
            name={s.name}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}

export function WeekBars({
  data,
  color = "var(--primary)",
  height = 90,
}: {
  data: TrendPoint[];
  color?: string;
  height?: number;
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
        <XAxis dataKey="label" tick={{ fontSize: 10, fill: "var(--ink-faint)" }} axisLine={false} tickLine={false} />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: "var(--primary-soft)" }} />
        <Bar dataKey="value" radius={[6, 6, 6, 6]} fill={color} name="Mood" maxBarSize={22} />
      </BarChart>
    </ResponsiveContainer>
  );
}
