"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { PhoneOutgoing, Ban, Clock } from "lucide-react";
import { BreathingDot } from "@/components/motion/BreathingDot";

export function LeadCard() {
  return (
    <aside className="w-72 shrink-0 flex flex-col h-full"
      style={{ background: "#070707", borderLeft: "1px solid #141414" }}>
      <div className="h-10 px-4 flex items-center shrink-0"
        style={{ borderBottom: "1px solid #141414" }}>
        <span className="text-[10px] uppercase tracking-[0.18em] text-stone-500">
          Context
        </span>
      </div>

      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ type: "spring", stiffness: 280, damping: 30 }}
        className="flex-1 overflow-y-auto px-4 py-5 flex flex-col gap-5"
      >
        <div>
          <div className="text-[10px] uppercase tracking-widest text-stone-700 mb-1.5">
            Quick dispatch
          </div>
          <Link
            href="/calls/new"
            className="w-full flex items-center justify-center gap-2 h-9 text-[12px] font-semibold uppercase tracking-widest text-black bg-amber-500 hover:bg-amber-400 transition-colors"
          >
            <PhoneOutgoing className="w-3.5 h-3.5" />
            New Dispatch
          </Link>
        </div>

        <div>
          <div className="text-[10px] uppercase tracking-widest text-stone-700 mb-2">
            Campaign Health
          </div>
          <div className="space-y-2 text-[11px]">
            <Row label="Sheets" status="healthy" />
            <Row label="HubSpot" status="idle" />
            <Row label="Pipedrive" status="idle" />
          </div>
        </div>

        <div>
          <div className="text-[10px] uppercase tracking-widest text-stone-700 mb-2">
            Keyboard
          </div>
          <div className="space-y-1.5 text-[11px]">
            <KbdRow k="⌘K" label="search palette" />
            <KbdRow k="G O" label="go operator" />
            <KbdRow k="G L" label="go leads" />
            <KbdRow k="G C" label="go calls" />
            <KbdRow k="J/K" label="navigate list" />
            <KbdRow k="C" label="call focused" />
          </div>
        </div>

        <div className="mt-auto pt-4" style={{ borderTop: "1px solid #141414" }}>
          <div className="text-[10px] uppercase tracking-widest text-stone-700 flex items-center gap-1.5">
            <Clock className="w-3 h-3" /> Next sweep 5m
          </div>
        </div>
      </motion.div>
    </aside>
  );
}

function Row({ label, status }: { label: string; status: "healthy" | "idle" | "error" }) {
  const color = status === "healthy" ? "#10B981" : status === "error" ? "#EF4444" : "#44403c";
  return (
    <div className="flex items-center gap-2 text-stone-400">
      <BreathingDot color={color} size={5} />
      <span className="flex-1">{label}</span>
      <span className="text-[10px] text-stone-700 uppercase tracking-wider">{status}</span>
    </div>
  );
}

function KbdRow({ k, label }: { k: string; label: string }) {
  return (
    <div className="flex items-center justify-between text-stone-500">
      <span>{label}</span>
      <kbd className="font-mono text-[10px] text-stone-400 px-1.5 py-[1px] border border-[#1a1a1a] bg-[#0A0A0A]">
        {k}
      </kbd>
    </div>
  );
}
