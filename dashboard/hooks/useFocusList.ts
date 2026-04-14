"use client";

import { useCallback, useEffect, useState } from "react";

export function useFocusList<T extends { id: string }>(items: T[], enabled = true) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (index >= items.length) setIndex(Math.max(0, items.length - 1));
  }, [items.length, index]);

  const move = useCallback(
    (delta: number) => {
      if (!enabled || items.length === 0) return;
      setIndex((i) => {
        const next = i + delta;
        if (next < 0) return 0;
        if (next >= items.length) return items.length - 1;
        return next;
      });
    },
    [enabled, items.length],
  );

  const focused = items[index] ?? null;

  return { index, setIndex, move, focused };
}
