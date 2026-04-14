"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";
import { PhoneOff, ArrowRightLeft } from "lucide-react";
import { ActiveCallWaveform } from "./ActiveCallWaveform";
import { LiveTranscript } from "./LiveTranscript";
import { BreathingDot } from "@/components/motion/BreathingDot";
import { useActiveCall } from "@/hooks/useActiveCall";
import { IdleState } from "./IdleState";

function useElapsed(start: string | null) {
  const [n, setN] = useState(0);
  useEffect(() => {
    if (!start) return;
    const id = setInterval(() => setN(Date.now()), 1000);
    return () => clearInterval(id);
  }, [start]);
  if (!start) return "00:00";
  const s = Math.max(0, Math.floor((n - new Date(start).getTime()) / 1000));
  const mm = Math.floor(s / 60).toString().padStart(2, "0");
  const ss = (s % 60).toString().padStart(2, "0");
  return `${mm}:${ss}`;
}

export function ActiveCallPanel({
  stats,
  chartData,
  recentCalls,
}: {
  stats: { totalCalls: number; answeredCalls: number; avgDuration: number; successRate: number; todayCalls: number };
  chartData: { date: string; calls: number }[];
  recentCalls: { id: string; phone_number: string; status: string; duration_secs: number | null; created_at: string }[];
}) {
  const { active, transcripts } = useActiveCall();
  const elapsed = useElapsed(active?.created_at ?? null);

  return (
    <div className="flex flex-col h-full" style={{ background: "#050505" }}>
      <div className="h-10 px-4 flex items-center shrink-0"
        style={{ borderBottom: "1px solid #141414" }}>
        <span className="text-[10px] uppercase tracking-[0.18em] text-stone-500">
          Active Call
        </span>
        {active && (
          <div className="ml-auto flex items-center gap-2 text-[10px] uppercase tracking-widest text-amber-500">
            <BreathingDot color="#F59E0B" size={5} />
            {active.status ?? "live"}
          </div>
        )}
      </div>

      <AnimatePresence mode="wait">
        {active ? (
          <motion.div
            key="active"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="flex-1 flex flex-col min-h-0"
          >
            <div className="px-10 pt-8 pb-4 flex flex-col items-center shrink-0">
              <div className="text-[10px] uppercase tracking-[0.18em] text-stone-600 mb-1">
                in call with
              </div>
              <div className="text-[22px] font-mono-tabular text-stone-100 mb-1">
                {active.phone_number ?? "unknown"}
              </div>
              <div className="text-[42px] font-bold tracking-tight text-amber-500 font-mono-tabular leading-none mb-4">
                {elapsed}
              </div>
              <ActiveCallWaveform active className="w-full max-w-md" />
              <div className="flex gap-2 mt-5">
                <button className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] uppercase tracking-widest text-stone-400 hover:text-amber-500 transition-colors"
                  style={{ border: "1px solid #1E1E1E", background: "#0A0A0A" }}>
                  <ArrowRightLeft className="w-3 h-3" /> Transfer
                </button>
                <button className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] uppercase tracking-widest text-red-400 hover:text-red-300 transition-colors"
                  style={{ border: "1px solid #2a1414", background: "#0A0A0A" }}>
                  <PhoneOff className="w-3 h-3" /> End
                </button>
              </div>
            </div>
            <div className="flex-1 min-h-0 px-10 pb-8">
              <div className="text-[10px] uppercase tracking-[0.18em] text-stone-600 mb-2">
                Transcript
              </div>
              <div className="h-full">
                <LiveTranscript lines={transcripts} />
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="idle"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="flex-1 min-h-0 overflow-y-auto"
          >
            <IdleState stats={stats} chartData={chartData} recentCalls={recentCalls} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
