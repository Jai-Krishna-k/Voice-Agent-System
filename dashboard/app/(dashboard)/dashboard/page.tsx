import Link from "next/link";
import { getCallStats, getRecentCalls, getCallsPerDay } from "@/lib/supabase/queries";
import CallsChart from "./CallsChart";
import FormattedDate from "@/components/FormattedDate";

function formatDuration(secs: number) {
  if (!secs) return "0s";
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

function statusColor(status: string) {
  const map: Record<string, string> = {
    completed:   "text-emerald-500",
    answered:    "text-stone-300",
    initiated:   "text-amber-400",
    ringing:     "text-amber-400",
    calling:     "text-amber-500",
    failed:      "text-red-500",
    transferred: "text-stone-400",
  };
  return map[status] ?? "text-stone-500";
}

export default async function DashboardPage() {
  let stats = { totalCalls: 0, avgDuration: 0, successRate: 0, todayCalls: 0, answeredCalls: 0 };
  let recentCalls: any[] = [];
  let chartData: { date: string; calls: number }[] = [];
  let fetchError = false;

  try {
    [stats, recentCalls, chartData] = await Promise.all([
      getCallStats(),
      getRecentCalls(),
      getCallsPerDay(),
    ]);
  } catch {
    fetchError = true;
  }

  const statItems = [
    { label: "Total Calls",   value: fetchError ? "—" : stats.totalCalls.toString() },
    { label: "Avg Duration",  value: fetchError ? "—" : formatDuration(stats.avgDuration) },
    { label: "Success Rate",  value: fetchError ? "—" : `${stats.successRate}%` },
    { label: "Today",         value: fetchError ? "—" : stats.todayCalls.toString() },
  ];

  return (
    <div className="space-y-8 max-w-6xl">
      {/* Header */}
      <div>
        <p className="text-[10px] text-stone-600 uppercase tracking-widest mb-1">Overview</p>
        <h1 className="text-[22px] font-semibold text-stone-100 tracking-tight">Dashboard</h1>
      </div>

      {/* Stats strip */}
      <div className="flex items-stretch border border-[#181818] divide-x divide-[#181818]">
        {statItems.map((s) => (
          <div key={s.label} className="flex-1 px-6 py-5">
            <div className="text-[36px] font-bold tracking-tight text-amber-500 tabular-nums leading-none">
              {s.value}
            </div>
            <div className="text-[10px] uppercase tracking-widest text-stone-600 mt-2.5">
              {s.label}
            </div>
          </div>
        ))}
      </div>

      {/* Chart */}
      <div>
        <div className="text-[10px] uppercase tracking-widest text-stone-600 mb-4">
          Calls — last 14 days
        </div>
        {fetchError || chartData.length === 0 ? (
          <div className="py-12 text-xs text-stone-700 border border-[#181818] flex items-center justify-center">
            No data
          </div>
        ) : (
          <div className="border border-[#181818] p-4">
            <CallsChart data={chartData} />
          </div>
        )}
      </div>

      {/* Recent calls */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="text-[10px] uppercase tracking-widest text-stone-600">Recent Calls</div>
          <Link href="/calls" className="text-[11px] text-amber-500 hover:text-amber-400 transition-colors">
            View all →
          </Link>
        </div>

        {fetchError || recentCalls.length === 0 ? (
          <div className="py-12 text-xs text-stone-700 border border-[#181818] flex items-center justify-center">
            {fetchError ? "Connect Supabase to see data" : "No calls yet"}
          </div>
        ) : (
          <div>
            {recentCalls.map((call) => (
              <Link
                key={call.id}
                href={`/calls/${call.id}`}
                className="flex items-center py-3 border-b border-[#141414] hover:bg-[#0F0F0F] -mx-6 px-6 transition-colors group"
              >
                <span className="font-mono text-sm text-stone-300 w-44 shrink-0">
                  {call.phone_number}
                </span>
                <span className={`text-xs ${statusColor(call.status)}`}>
                  {call.status}
                </span>
                <span className="font-mono text-xs text-stone-600 ml-auto">
                  {call.duration_secs ? formatDuration(call.duration_secs) : "—"}
                </span>
                <span className="text-xs text-stone-700 ml-6 w-36 text-right shrink-0">
                  <FormattedDate date={call.created_at} />
                </span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
