"use client";

import { useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { TopBar } from "./TopBar";
import { UtilityRail } from "./UtilityRail";
import { BottomRail } from "./BottomRail";
import { CommandPalette } from "./CommandPalette";
import { GrainOverlay } from "@/components/motion/GrainOverlay";
import { PageTransition } from "@/components/motion/PageTransition";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import { useRealtimeEvents } from "@/hooks/useRealtimeEvents";

const GO_ROUTES: Record<string, string> = {
  o: "/dashboard",
  l: "/leads",
  c: "/calls",
  n: "/calls/new",
  a: "/agent",
  i: "/integrations",
  k: "/knowledge-base",
  s: "/settings",
};

export function AppShell({ children }: { children: ReactNode }) {
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [goMode, setGoMode] = useState(false);
  const router = useRouter();
  const events = useRealtimeEvents();

  useKeyboardShortcuts(
    {
      "mod+k": (e) => {
        e.preventDefault();
        setPaletteOpen((o) => !o);
      },
      escape: () => {
        setPaletteOpen(false);
        setGoMode(false);
      },
      g: () => {
        setGoMode(true);
        setTimeout(() => setGoMode(false), 1200);
      },
      ...Object.fromEntries(
        Object.entries(GO_ROUTES).map(([k, href]) => [
          k,
          (e: KeyboardEvent) => {
            if (goMode) {
              e.preventDefault();
              setGoMode(false);
              router.push(href);
            }
          },
        ]),
      ),
    },
    [goMode, router],
  );

  return (
    <>
      <GrainOverlay />
      <div className="h-screen flex flex-col relative">
        <TopBar onOpenPalette={() => setPaletteOpen(true)} />
        <div className="flex-1 flex min-h-0">
          <UtilityRail />
          <main className="flex-1 min-w-0 overflow-y-auto relative">
            <PageTransition>{children}</PageTransition>
          </main>
        </div>
        <BottomRail events={events} onOpenPalette={() => setPaletteOpen(true)} />
      </div>

      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />

      {goMode && (
        <div className="fixed bottom-12 left-1/2 -translate-x-1/2 z-40 px-3 py-1.5 text-[11px] uppercase tracking-widest text-amber-500 font-mono"
          style={{ background: "#0A0A0A", border: "1px solid #1E1E1E" }}>
          go → O L C N A I K S
        </div>
      )}
    </>
  );
}
