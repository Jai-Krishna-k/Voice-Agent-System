import { Phone, Clock, CheckCircle, TrendingUp } from "lucide-react";
import Link from "next/link";
import { getCallStats, getRecentCalls, getCallsPerDay } from "@/lib/supabase/queries";
import CallsChart from "./CallsChart";

function StatCard({
  label,
  value,
  sub,
  icon: Icon,
}: {
  label: string;
  value: string;
  sub?: string;
  icon: React.ElementType;
}) {
  return (
    <div className="bg-card border border-card-border rounded-xl p-5">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-medium text-muted uppercase tracking-wider">
          {label}
        </span>
        <Icon className="w-4 h-4 text-muted" />
      </div>
      <p className="text-2xl font-semibold text-white">{value}</p>
      {sub && <p className="text-xs text-muted mt-1">{sub}</p>}
    </div>
  );
}

function formatDuration(secs: number) {
  if (!secs) return "0s";
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

function statusBadge(status: string) {
  const colors: Record<string, string> = {
    completed: "bg-success/10 text-green-400",
    answered: "bg-blue-500/10 text-blue-400",
    initiated: "bg-yellow-500/10 text-yellow-400",
    ringing: "bg-yellow-500/10 text-yellow-400",
    failed: "bg-destructive/10 text-red-400",
    transferred: "bg-purple-500/10 text-purple-400",
  };
  return (
    <span
      className={`inline-flex px-2 py-0.5 rounded text-[11px] font-medium ${
        colors[status] || "bg-zinc-800 text-zinc-400"
      }`}
    >
      {status}
    </span>
  );
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

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-semibold text-white">Dashboard</h1>
        <p className="text-sm text-muted mt-1">
          Overview of your voice agent activity
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Calls"
          value={fetchError ? "—" : stats.totalCalls.toString()}
          sub={fetchError ? "Connect Supabase to see data" : undefined}
          icon={Phone}
        />
        <StatCard
          label="Avg Duration"
          value={fetchError ? "—" : formatDuration(stats.avgDuration)}
          icon={Clock}
        />
        <StatCard
          label="Success Rate"
          value={fetchError ? "—" : `${stats.successRate}%`}
          sub={fetchError ? undefined : `${stats.answeredCalls} answered`}
          icon={CheckCircle}
        />
        <StatCard
          label="Today"
          value={fetchError ? "—" : stats.todayCalls.toString()}
          sub="Calls placed today"
          icon={TrendingUp}
        />
      </div>

      <div className="bg-card border border-card-border rounded-xl p-6">
        <h2 className="text-sm font-medium text-zinc-300 mb-4">
          Calls — Last 14 Days
        </h2>
        {fetchError || chartData.length === 0 ? (
          <div className="text-center py-12 text-xs text-muted">
            No chart data available
          </div>
        ) : (
          <CallsChart data={chartData} />
        )}
      </div>

      <div className="bg-card border border-card-border rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-medium text-zinc-300">Recent Calls</h2>
          <Link
            href="/calls"
            className="text-xs text-accent hover:text-accent-hover transition-colors"
          >
            View all
          </Link>
        </div>

        {fetchError || recentCalls.length === 0 ? (
          <div className="text-center py-12">
            <Phone className="w-8 h-8 text-zinc-700 mx-auto mb-3" />
            <p className="text-sm text-muted">
              {fetchError ? "Connect Supabase to see data" : "No calls yet"}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-card-border">
            {recentCalls.map((call) => (
              <Link
                key={call.id}
                href={`/calls/${call.id}`}
                className="flex items-center justify-between py-3 hover:bg-white/[0.02] px-2 -mx-2 rounded-lg transition-colors"
              >
                <div className="flex items-center gap-4">
                  <span className="text-sm text-zinc-300 font-mono w-36">
                    {call.phone_number}
                  </span>
                  {statusBadge(call.status)}
                </div>
                <span className="text-xs text-muted">
                  {new Date(call.created_at).toLocaleString("en-IN", {
                    day: "numeric",
                    month: "short",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
