"use client";

import { motion } from "framer-motion";
import { springs } from "@/lib/motion/springs";

export function MagneticFocusRing({ layoutId = "focus-ring" }: { layoutId?: string }) {
  return (
    <motion.div
      layoutId={layoutId}
      transition={springs.snap}
      className="absolute inset-0 pointer-events-none border border-amber-500/60 bg-amber-500/[0.04] z-0"
      style={{ boxShadow: "0 0 0 1px rgba(245,158,11,0.12), 0 0 24px rgba(245,158,11,0.06)" }}
    />
  );
}
