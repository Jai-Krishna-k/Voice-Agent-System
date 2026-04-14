import type { Transition } from "framer-motion";

export const springs = {
  snap: { type: "spring", stiffness: 520, damping: 38, mass: 0.8 } satisfies Transition,
  soft: { type: "spring", stiffness: 280, damping: 30, mass: 1 } satisfies Transition,
  slow: { type: "spring", stiffness: 140, damping: 22, mass: 1.2 } satisfies Transition,
  linear: { duration: 0.18, ease: [0.4, 0, 0.2, 1] } satisfies Transition,
} as const;
