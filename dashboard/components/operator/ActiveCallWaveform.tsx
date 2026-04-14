"use client";

import { motion } from "framer-motion";
import { useEffect, useState } from "react";

const BARS = 56;

export function ActiveCallWaveform({
  active = true,
  className = "",
}: {
  active?: boolean;
  className?: string;
}) {
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => setTick((t) => t + 1), 90);
    return () => clearInterval(id);
  }, [active]);

  const heights = Array.from({ length: BARS }, (_, i) => {
    if (!active) return 4;
    const base = Math.sin((i + tick) * 0.42) * 0.5 + 0.5;
    const noise = Math.sin((i * 1.73 + tick * 1.1) * 0.9) * 0.3 + 0.3;
    const env = Math.sin((i / BARS) * Math.PI);
    return 6 + Math.min(1, base * 0.6 + noise * 0.6) * env * 48;
  });

  return (
    <div
      className={`flex items-center justify-center gap-[3px] h-16 ${className}`}
      aria-hidden
    >
      {heights.map((h, i) => (
        <motion.span
          key={i}
          className="w-[3px] rounded-[1px]"
          animate={{ height: h }}
          transition={{ duration: 0.14, ease: "easeOut" }}
          style={{
            background: active ? "#F59E0B" : "#1f1f1f",
            boxShadow: active && h > 30 ? "0 0 6px rgba(245,158,11,0.35)" : "none",
          }}
        />
      ))}
    </div>
  );
}
