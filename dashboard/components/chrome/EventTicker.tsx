"use client";

import type { LiveEvent } from "@/hooks/useRealtimeEvents";

function fmt(ms: number) {
  const d = new Date(ms);
  return `${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}:${d.getSeconds().toString().padStart(2, "0")}`;
}

export function EventTicker({ events }: { events: LiveEvent[] }) {
  const items = events.slice(0, 20);
  if (items.length === 0) {
    return (
      <div className="text-[10px] text-stone-700 uppercase tracking-widest px-3">
        awaiting events…
      </div>
    );
  }
  const line = items.map((e) => (
    <span key={e.id} className="inline-flex items-center gap-1.5 px-3">
      <span className="text-stone-700 font-mono">{fmt(e.at)}</span>
      <span className="text-amber-500/80 uppercase tracking-widest text-[9px]">{e.kind}</span>
      <span className="text-stone-400">{e.label}</span>
      {e.detail && <span className="text-stone-600">· {e.detail}</span>}
      <span className="text-stone-800">»</span>
    </span>
  ));

  return (
    <div className="ticker-container relative flex-1 min-w-0 overflow-hidden h-full flex items-center">
      <div className="absolute inset-y-0 left-0 w-6 z-10 pointer-events-none"
        style={{ background: "linear-gradient(to right, #060606, transparent)" }} />
      <div className="absolute inset-y-0 right-0 w-6 z-10 pointer-events-none"
        style={{ background: "linear-gradient(to left, #060606, transparent)" }} />
      <div className="flex whitespace-nowrap animate-ticker text-[11px]">
        <div className="flex">{line}</div>
        <div className="flex" aria-hidden>{line}</div>
      </div>
    </div>
  );
}
