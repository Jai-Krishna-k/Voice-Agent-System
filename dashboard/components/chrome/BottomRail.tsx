"use client";

import { EventTicker } from "./EventTicker";
import { BreathingDot } from "@/components/motion/BreathingDot";
import { Odometer } from "@/components/motion/Odometer";
import type { LiveEvent } from "@/hooks/useRealtimeEvents";
import { useMemo } from "react";

function Shortcut({ k, label }: { k: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-[10px] text-stone-600 uppercase tracking-widest">
      <kbd className="font-mono text-[9px] text-stone-400 px-1 py-[1px] border border-[#1a1a1a] bg-[#0A0A0A]">
        {k}
      </kbd>
      {label}
    </span>
  );
}

export function BottomRail({
  events,
  onOpenPalette,
}: {
  events: LiveEvent[];
  onOpenPalette: () => void;
}) {
  const inFlight = useMemo(
    () =>
      events.filter(
        (e) =>
          e.kind === "call" &&
          ["ringing", "answered", "in_progress", "calling", "initiated"].includes(
            e.status ?? "",
          ),
      ).length,
    [events],
  );

  const queued = useMemo(
    () => events.filter((e) => e.kind === "lead" && e.status === "queued").length,
    [events],
  );

  return (
    <footer
      className="h-9 flex items-center px-3 gap-4 shrink-0 relative z-20"
      style={{ background: "#060606", borderTop: "1px solid #141414" }}
    >
      <div className="flex items-center gap-3 pr-4 border-r border-[#141414]">
        <button onClick={onOpenPalette} className="hover:text-amber-500 transition-colors">
          <Shortcut k="⌘K" label="search" />
        </button>
        <Shortcut k="J/K" label="nav" />
        <Shortcut k="C" label="call" />
        <Shortcut k="D" label="dnc" />
        <Shortcut k="R" label="retry" />
      </div>

      <div className="flex items-center gap-4 pr-4 border-r border-[#141414]">
        <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-stone-500">
          <BreathingDot color={inFlight > 0 ? "#F59E0B" : "#44403c"} size={5} />
          <Odometer value={inFlight} className="text-amber-500 font-mono-tabular" /> in flight
        </div>
        <div className="text-[10px] uppercase tracking-widest text-stone-500">
          <Odometer value={queued} className="text-stone-300 font-mono-tabular" /> queued
        </div>
      </div>

      <EventTicker events={events} />
    </footer>
  );
}
