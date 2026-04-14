"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

export function FlashOnChange({
  value,
  children,
  className = "",
}: {
  value: string | number | null | undefined;
  children: ReactNode;
  className?: string;
}) {
  const prev = useRef(value);
  const [flashing, setFlashing] = useState(false);

  useEffect(() => {
    if (prev.current !== value && prev.current !== undefined) {
      setFlashing(true);
      const t = setTimeout(() => setFlashing(false), 900);
      return () => clearTimeout(t);
    }
    prev.current = value;
  }, [value]);

  return (
    <div className={`${className} ${flashing ? "animate-flash" : ""}`}>
      {children}
    </div>
  );
}
