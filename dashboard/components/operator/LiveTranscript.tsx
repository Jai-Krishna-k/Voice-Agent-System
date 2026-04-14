"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useRef } from "react";
import { TypewriterText } from "@/components/motion/TypewriterText";
import type { TranscriptLine } from "@/hooks/useActiveCall";

export function LiveTranscript({ lines }: { lines: TranscriptLine[] }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const lastId = lines[lines.length - 1]?.id;

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [lastId]);

  if (lines.length === 0) {
    return (
      <div className="h-full flex items-center justify-center text-[11px] text-stone-700 uppercase tracking-widest">
        waiting for transcript…
      </div>
    );
  }

  return (
    <div ref={scrollRef} className="h-full overflow-y-auto pr-2 space-y-3">
      <AnimatePresence initial={false}>
        {lines.map((l, i) => {
          const isAgent = l.speaker === "agent";
          const isLast = i === lines.length - 1;
          return (
            <motion.div
              key={l.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="text-[13px] leading-relaxed"
            >
              <div
                className={`text-[9px] uppercase tracking-widest mb-0.5 ${
                  isAgent ? "text-amber-500/70" : "text-stone-600"
                }`}
              >
                {isAgent ? "agent" : "caller"}
              </div>
              <div className={isAgent ? "text-stone-200" : "text-stone-400"}>
                {isLast ? (
                  <TypewriterText text={l.text} speed={18} />
                ) : (
                  l.text
                )}
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
