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
              <stop offset="0%" stopColor="#F59E0B" stopOpacity={0.2} />
              <stop offset="100%" stopColor="#F59E0B" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="#181818"
            vertical={false}
          />
          <XAxis
            dataKey="date"
            tick={{ fill: "#44403c", fontSize: 10 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fill: "#44403c", fontSize: 10 }}
            axisLine={false}
            tickLine={false}
            allowDecimals={false}
          />
          <Tooltip
            contentStyle={{
              background: "#0C0C0C",
              border: "1px solid #181818",
              borderRadius: "2px",
              fontSize: "12px",
            }}
            labelStyle={{ color: "#78716c" }}
            itemStyle={{ color: "#F0EEE8" }}
          />
          <Area
            type="monotone"
            dataKey="calls"
            stroke="#F59E0B"
            strokeWidth={1.5}
            fill="url(#callsGrad)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
