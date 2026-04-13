"use client";

import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";

export default function CallsChart({
  data,
}: {
  data: { date: string; calls: number }[];
}) {
  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data}>
          <defs>
            <linearGradient id="callsGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#6366f1" stopOpacity={0.3} />
              <stop offset="100%" stopColor="#6366f1" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="#1e1e1e"
            vertical={false}
          />
          <XAxis
            dataKey="date"
            tick={{ fill: "#71717a", fontSize: 11 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fill: "#71717a", fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            allowDecimals={false}
          />
          <Tooltip
            contentStyle={{
              background: "#111",
              border: "1px solid #1e1e1e",
              borderRadius: "8px",
              fontSize: "12px",
            }}
            labelStyle={{ color: "#a1a1aa" }}
            itemStyle={{ color: "#fff" }}
          />
          <Area
            type="monotone"
            dataKey="calls"
            stroke="#6366f1"
            strokeWidth={2}
            fill="url(#callsGrad)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
