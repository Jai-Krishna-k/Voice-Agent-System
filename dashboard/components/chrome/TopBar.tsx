"use client";

import { Search } from "lucide-react";
import { BreathingDot } from "@/components/motion/BreathingDot";

export function TopBar({ onOpenPalette }: { onOpenPalette: () => void }) {
  return (
    <header
      className="h-11 flex items-center px-3 relative z-30 shrink-0"
      style={{ background: "#060606", borderBottom: "1px solid #141414" }}
    >
      <div className="flex items-center gap-2.5 pl-1 pr-4 mr-4" style={{ borderRight: "1px solid #141414" }}>
        <span className="text-amber-500 text-base font-bold leading-none select-none">■</span>
        <span className="text-[10px] font-semibold tracking-[0.18em] text-stone-200 uppercase">
          Aryantra
        </span>
        <span className="text-[10px] text-stone-700 tracking-widest uppercase ml-1">Operator</span>
      </div>

      <button
        onClick={onOpenPalette}
        className="group flex items-center gap-2 flex-1 max-w-md h-7 px-2.5 text-left text-[12px] text-stone-500 hover:text-stone-300 transition-colors"
        style={{ background: "#0A0A0A", border: "1px solid #141414" }}
      >
        <Search className="w-3.5 h-3.5 text-stone-600 group-hover:text-amber-500 transition-colors" />
        <span className="flex-1">Search leads, calls, actions…</span>
        <kbd className="text-[9px] text-stone-600 font-mono tracking-wider px-1.5 py-0.5 border border-[#1a1a1a]">
          ⌘K
        </kbd>
      </button>

      <div className="ml-auto flex items-center gap-3">
        <div className="flex items-center gap-1.5 text-[10px] text-stone-500 uppercase tracking-widest">
          <BreathingDot color="#10B981" size={5} />
          Live
        </div>
      </div>
    </header>
  );
}
