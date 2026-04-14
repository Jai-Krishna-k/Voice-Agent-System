"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Odometer } from "@/components/motion/Odometer";
import { ActiveCallWaveform } from "./ActiveCallWaveform";
import CallsChart from "@/app/(dashboard)/dashboard/CallsChart";

function formatDuration(secs: number | null) {
  if (!secs) return "—";
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

function statusColor(s: string) {
  const map: Record<string, string> = {
    completed: "text-emerald-500",
    answered: "text-emerald-500",
    calling: "text-amber-500",
    ringing: "text-amber-400",
    initiated: "text-amber-400",
    failed: "text-red-400",
  };
  return map[s] ?? "text-stone-400";
}

function fmtTime(ts: string) {
  const d = new Date(ts);
  const today = new Date();
  const same =
    d.getFullYear() === today.getFullYear() &&
    d.getMonth() === today.getMonth() &&
    d.getDate() === today.getDate();
  if (same) {
    return `${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`;
  }
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

export function IdleState({
  stats,
  chartData,
  recentCalls,
}: {
  stats: { totalCalls: number; answeredCalls: number; avgDuration: number; successRate: number; todayCalls: number };
  chartData: { date: string; calls: number }[];
  recentCalls: { id: string; phone_number: string; status: string; duration_secs: number | null; created_at: string }[];
}) {
  const statItems = [
    { label: "Total", value: stats.totalCalls },
    { label: "Today", value: stats.todayCalls },
    { label: "Success %", value: stats.successRate },
    { label: "Avg (s)", value: stats.avgDuration },
  ];

  return (
    <div className="px-10 py-8 flex flex-col gap-8">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="flex flex-col items-center gap-3 py-6"
      >
        <div className="text-[10px] uppercase tracking-[0.18em] text-stone-700">idle</div>
        <div className="text-[28px] font-semibold tracking-tight text-stone-200">
          No active call
        </div>
        <div className="text-[12px] text-stone-600 max-w-sm text-center">
          Dispatch from the right panel, pick a lead from the list, or press{" "}
          <kbd className="font-mono text-[10px] px-1 py-[1px] border border-[#1a1a1a]">⌘K</kbd>{" "}
          to open the command palette.
        </div>
        <ActiveCallWaveform active={false} className="mt-3 opacity-60" />
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.05 }}
        className="flex items-stretch divide-x divide-[#181818]"
        style={{ border: "1px solid #181818" }}
      >
        {statItems.map((s) => (
          <div key={s.label} className="flex-1 px-5 py-4">
            <Odometer
              value={s.value}
              className="text-[30px] font-bold tracking-tight text-amber-500 leading-none block"
            />
            <div className="text-[10px] uppercase tracking-widest text-stone-600 mt-2">
              {s.label}
            </div>
          </div>
        ))}
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4, delay: 0.1 }}
      >
        <div className="text-[10px] uppercase tracking-[0.18em] text-stone-600 mb-2">
          14 Day Activity
        </div>
        <CallsChart data={chartData} />
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4, delay: 0.15 }}
      >
        <div className="flex items-center mb-2">
          <div className="text-[10px] uppercase tracking-[0.18em] text-stone-600">
            Recent Calls
          </div>
          <Link href="/calls" className="ml-auto text-[10px] uppercase tracking-widest text-stone-600 hover:text-amber-500 transition-colors">
            view all →
          </Link>
        </div>
        <div>
          {recentCalls.length === 0 ? (
            <div className="py-8 text-center text-[11px] text-stone-700 uppercase tracking-widest">
              no calls yet
            </div>
          ) : (
            recentCalls.map((c) => (
              <Link
                key={c.id}
                href={`/calls/${c.id}`}
                className="flex items-center py-3 hover:bg-[#0C0C0C] px-2 -mx-2 transition-colors group"
                style={{ borderBottom: "1px solid #0F0F0F" }}
              >
                <span className="font-mono text-[13px] text-stone-300 w-44">
                  {c.phone_number}
                </span>
                <span className={`text-[11px] uppercase tracking-wider ${statusColor(c.status)}`}>
                  {c.status}
                </span>
                <span className="font-mono text-[11px] text-stone-600 ml-auto">
                  {formatDuration(c.duration_secs)}
                </span>
                <span className="text-[11px] text-stone-700 ml-5 font-mono-tabular">
                  {fmtTime(c.created_at)}
                </span>
              </Link>
            ))
          )}
        </div>
      </motion.div>
    </div>
  );
}
