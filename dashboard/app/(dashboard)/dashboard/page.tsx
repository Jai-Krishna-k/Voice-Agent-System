import { getCallStats, getRecentCalls, getCallsPerDay } from "@/lib/supabase/queries";
import { OperatorLayout } from "@/components/operator/OperatorLayout";

export default async function DashboardPage() {
  let stats = { totalCalls: 0, avgDuration: 0, successRate: 0, todayCalls: 0, answeredCalls: 0 };
  let recentCalls: Array<{
    id: string;
    phone_number: string;
    status: string;
    duration_secs: number | null;
    created_at: string;
    voice_id?: string | null;
  }> = [];
  let chartData: { date: string; calls: number }[] = [];

  try {
    [stats, recentCalls, chartData] = await Promise.all([
      getCallStats(),
      getRecentCalls(12),
      getCallsPerDay(),
    ]);
  } catch {
    // render empty cockpit
  }

  return (
    <OperatorLayout stats={stats} chartData={chartData} recentCalls={recentCalls} />
  );
}
