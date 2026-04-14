"use client";

import { useEffect, useId, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export type LiveEvent = {
  id: string;
  kind: "call" | "lead" | "outcome";
  at: number;
  label: string;
  detail?: string;
  status?: string;
  refId?: string;
};

type CallRow = {
  id: string;
  phone_number?: string | null;
  status?: string | null;
  created_at?: string | null;
  ended_at?: string | null;
};

type LeadRow = {
  id: string;
  phone?: string | null;
  name?: string | null;
  status?: string | null;
  outcome_code?: string | null;
  created_at?: string | null;
};

export function useRealtimeEvents({
  initialCalls = [],
  initialLeads = [],
  max = 60,
}: {
  initialCalls?: CallRow[];
  initialLeads?: LeadRow[];
  max?: number;
} = {}) {
  const [events, setEvents] = useState<LiveEvent[]>(() => {
    const seeded: LiveEvent[] = [];
    for (const c of initialCalls) {
      seeded.push({
        id: `call-${c.id}`,
        kind: "call",
        at: c.created_at ? new Date(c.created_at).getTime() : Date.now(),
        label: c.phone_number ?? "unknown",
        detail: c.status ?? undefined,
        status: c.status ?? undefined,
        refId: c.id,
      });
    }
    for (const l of initialLeads) {
      seeded.push({
        id: `lead-${l.id}`,
        kind: "lead",
        at: l.created_at ? new Date(l.created_at).getTime() : Date.now(),
        label: l.name ?? l.phone ?? "lead",
        detail: l.status ?? undefined,
        status: l.status ?? undefined,
        refId: l.id,
      });
    }
    return seeded.sort((a, b) => b.at - a.at).slice(0, max);
  });

  const instanceId = useId();

  useEffect(() => {
    const supabase = createClient();

    const push = (ev: LiveEvent) => {
      setEvents((prev) => {
        const filtered = prev.filter((p) => p.id !== ev.id);
        return [ev, ...filtered].slice(0, max);
      });
    };

    const ch = supabase
      .channel(`operator-events-${instanceId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "calls" },
        (payload) => {
          const row = (payload.new ?? payload.old) as CallRow;
          if (!row?.id) return;
          push({
            id: `call-${row.id}-${payload.eventType}`,
            kind: "call",
            at: Date.now(),
            label: row.phone_number ?? "unknown",
            detail: row.status ?? undefined,
            status: row.status ?? undefined,
            refId: row.id,
          });
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "leads" },
        (payload) => {
          const row = (payload.new ?? payload.old) as LeadRow;
          if (!row?.id) return;
          push({
            id: `lead-${row.id}-${payload.eventType}`,
            kind: "lead",
            at: Date.now(),
            label: row.name ?? row.phone ?? "lead",
            detail: row.status ?? undefined,
            status: row.status ?? undefined,
            refId: row.id,
          });
        },
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "call_outcomes" },
        (payload) => {
          const row = payload.new as { call_id?: string; outcome_code?: string };
          if (!row?.call_id) return;
          push({
            id: `outcome-${row.call_id}`,
            kind: "outcome",
            at: Date.now(),
            label: row.outcome_code ?? "classified",
            detail: row.outcome_code ?? undefined,
            refId: row.call_id,
          });
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(ch);
    };
  }, [max, instanceId]);

  return events;
}
