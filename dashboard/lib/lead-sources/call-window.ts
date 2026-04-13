import type { CallWindow } from "./types";

function partsInTz(date: Date, tz: string): { hour: number; minute: number; dow: number } {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    hour12: false,
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
  const parts = fmt.formatToParts(date);
  const byType: Record<string, string> = {};
  for (const p of parts) byType[p.type] = p.value;
  const hour = parseInt(byType.hour, 10);
  const minute = parseInt(byType.minute, 10);
  const dowMap: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };
  const dow = dowMap[byType.weekday] ?? 0;
  return { hour, minute, dow };
}

function hhmmToMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map((n) => parseInt(n, 10));
  return (h || 0) * 60 + (m || 0);
}

export function isWithinCallWindow(window: CallWindow, now = new Date()): boolean {
  try {
    const { hour, minute, dow } = partsInTz(now, window.tz || "UTC");
    const days = window.days && window.days.length ? window.days : [1, 2, 3, 4, 5];
    if (!days.includes(dow)) return false;
    const cur = hour * 60 + minute;
    const start = hhmmToMinutes(window.start || "09:00");
    const end = hhmmToMinutes(window.end || "18:00");
    const floor = 8 * 60;
    const ceil = 21 * 60;
    const effStart = Math.max(start, floor);
    const effEnd = Math.min(end, ceil);
    return cur >= effStart && cur < effEnd;
  } catch {
    return false;
  }
}

export function nextWindowOpen(window: CallWindow, from = new Date()): Date {
  for (let i = 0; i < 14; i++) {
    const probe = new Date(from.getTime() + i * 24 * 60 * 60 * 1000);
    try {
      const { dow } = partsInTz(probe, window.tz || "UTC");
      const days = window.days && window.days.length ? window.days : [1, 2, 3, 4, 5];
      if (days.includes(dow)) {
        const [h, m] = (window.start || "09:00").split(":").map((n) => parseInt(n, 10));
        probe.setUTCHours(h, m, 0, 0);
        if (probe.getTime() > from.getTime()) return probe;
      }
    } catch {}
  }
  return new Date(from.getTime() + 24 * 60 * 60 * 1000);
}
