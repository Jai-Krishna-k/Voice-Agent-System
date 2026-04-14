"use client";

import { LiveFeed } from "./LiveFeed";
import { ActiveCallPanel } from "./ActiveCallPanel";
import { LeadCard } from "./LeadCard";
import { useRealtimeEvents } from "@/hooks/useRealtimeEvents";

export function OperatorLayout({
  stats,
  chartData,
  recentCalls,
}: {
  stats: { totalCalls: number; answeredCalls: number; avgDuration: number; successRate: number; todayCalls: number };
  chartData: { date: string; calls: number }[];
  recentCalls: { id: string; phone_number: string; status: string; duration_secs: number | null; created_at: string }[];
}) {
  const events = useRealtimeEvents({ initialCalls: recentCalls });

  return (
    <div className="h-full flex min-h-0">
      <div className="w-64 shrink-0" style={{ borderRight: "1px solid #141414" }}>
        <LiveFeed events={events} />
      </div>
      <div className="flex-1 min-w-0">
        <ActiveCallPanel stats={stats} chartData={chartData} recentCalls={recentCalls} />
      </div>
      <LeadCard />
    </div>
  );
}
