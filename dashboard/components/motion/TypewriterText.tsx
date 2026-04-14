"use client";

import { useEffect, useState } from "react";

export function TypewriterText({
  text,
  speed = 22,
  caret = true,
  className = "",
  onDone,
}: {
  text: string;
  speed?: number;
  caret?: boolean;
  className?: string;
  onDone?: () => void;
}) {
  const [typed, setTyped] = useState("");

  useEffect(() => {
    setTyped("");
    if (!text) return;
    let i = 0;
    const id = setInterval(() => {
      i += 1;
      setTyped(text.slice(0, i));
      if (i >= text.length) {
        clearInterval(id);
        onDone?.();
      }
    }, speed);
    return () => clearInterval(id);
  }, [text, speed, onDone]);

  return (
    <span className={className}>
      {typed}
      {caret && typed.length < text.length && (
        <span className="inline-block w-[1px] h-[1em] bg-amber-500 align-middle ml-[1px] animate-caret" />
      )}
    </span>
  );
}
