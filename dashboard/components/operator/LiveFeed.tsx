"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { Phone, Users, Zap } from "lucide-react";
import type { LiveEvent } from "@/hooks/useRealtimeEvents";

type Filter = "all" | "call" | "lead" | "outcome";

function fmt(ms: number) {
  const d = new Date(ms);
  return `${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}:${d.getSeconds().toString().padStart(2, "0")}`;
}

function statusColor(s?: string) {
  if (!s) return "text-stone-500";
  if (["answered", "completed", "called"].includes(s)) return "text-emerald-500";
  if (["calling", "ringing", "in_progress", "initiated", "queued"].includes(s))
    return "text-amber-500";
  if (["failed", "do_not_call", "voicemail"].includes(s)) return "text-red-400";
  return "text-stone-400";
}

function iconFor(kind: LiveEvent["kind"]) {
  if (kind === "call") return Phone;
  if (kind === "lead") return Users;
  return Zap;
}

export function LiveFeed({ events }: { events: LiveEvent[] }) {
  const [filter, setFilter] = useState<Filter>("all");
  const filtered = filter === "all" ? events : events.filter((e) => e.kind === filter);

  return (
    <div className="flex flex-col h-full" style={{ background: "#070707" }}>
      <div className="h-10 px-3 flex items-center shrink-0"
        style={{ borderBottom: "1px solid #141414" }}>
        <span className="text-[10px] uppercase tracking-[0.18em] text-stone-500 mr-auto">
          Live Feed
        </span>
        <div className="flex gap-2 text-[10px] uppercase tracking-widest">
          {(["all", "call", "lead", "outcome"] as Filter[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={
                filter === f
                  ? "text-amber-500"
                  : "text-stone-700 hover:text-stone-300 transition-colors"
              }
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {filtered.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center gap-2 px-6 text-center">
            <div className="text-[10px] text-stone-700 uppercase tracking-widest">
              no events yet
            </div>
            <div className="text-[10px] text-stone-800">
              events will stream as calls and leads arrive
            </div>
          </div>
        ) : (
          <AnimatePresence initial={false}>
            {filtered.map((e) => {
              const Icon = iconFor(e.kind);
              return (
                <motion.div
                  key={e.id}
                  layout
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="px-3 py-2 flex items-center gap-2 group hover:bg-[#0C0C0C] transition-colors"
                  style={{ borderBottom: "1px solid #0F0F0F" }}
                >
                  <Icon className={`w-3 h-3 shrink-0 ${statusColor(e.status)}`} />
                  <div className="flex-1 min-w-0">
                    <div className="text-[12px] text-stone-300 truncate font-mono-tabular">
                      {e.label}
                    </div>
                    {e.detail && (
                      <div className={`text-[10px] uppercase tracking-wider ${statusColor(e.status)}`}>
                        {e.detail}
                      </div>
                    )}
                  </div>
                  <div className="text-[9px] text-stone-700 font-mono-tabular shrink-0">
                    {fmt(e.at)}
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}
