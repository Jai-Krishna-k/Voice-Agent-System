"use client";

import { useEffect } from "react";

type Handler = (e: KeyboardEvent) => void;

export function useKeyboardShortcuts(map: Record<string, Handler>, deps: unknown[] = []) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const tag = target?.tagName;
      const isEditable =
        tag === "INPUT" ||
        tag === "TEXTAREA" ||
        tag === "SELECT" ||
        target?.getAttribute("contenteditable") === "true";

      const mod = e.metaKey || e.ctrlKey;
      const key = (mod ? `mod+${e.key.toLowerCase()}` : e.key.toLowerCase());

      // Always allow mod+k and Escape even in inputs
      if (!isEditable || key === "mod+k" || e.key === "Escape") {
        const fn = map[key] || map[e.key];
        if (fn) {
          fn(e);
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}
