"use client";

import { useEffect, useId, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export type ActiveCall = {
  id: string;
  phone_number: string | null;
  status: string | null;
  created_at: string | null;
  voice_id: string | null;
};

export type TranscriptLine = {
  id: string;
  speaker: "agent" | "user" | string;
  text: string;
  timestamp_ms: number | null;
};

const ACTIVE_STATUSES = new Set([
  "initiated",
  "ringing",
  "answered",
  "in_progress",
  "calling",
]);

export function useActiveCall() {
  const [active, setActive] = useState<ActiveCall | null>(null);
  const [transcripts, setTranscripts] = useState<TranscriptLine[]>([]);
  const instanceId = useId();

  useEffect(() => {
    const supabase = createClient();
    let mounted = true;

    const fetchActive = async () => {
      const { data } = await supabase
        .from("calls")
        .select("id, phone_number, status, created_at, voice_id")
        .in("status", Array.from(ACTIVE_STATUSES))
        .order("created_at", { ascending: false })
        .limit(1);
      if (!mounted) return;
      const row = (data?.[0] as ActiveCall | undefined) ?? null;
      setActive(row);
      if (row) {
        const { data: t } = await supabase
          .from("transcripts")
          .select("id, speaker, text, timestamp_ms")
          .eq("call_id", row.id)
          .order("timestamp_ms", { ascending: true });
        if (mounted) setTranscripts((t ?? []) as TranscriptLine[]);
      } else {
        setTranscripts([]);
      }
    };

    fetchActive();

    const ch = supabase
      .channel(`active-call-${instanceId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "calls" },
        () => fetchActive(),
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "transcripts" },
        (payload) => {
          const row = payload.new as TranscriptLine & { call_id?: string };
          if (active && row.call_id === active.id) {
            setTranscripts((prev) => [...prev, row]);
          } else {
            fetchActive();
          }
        },
      )
      .subscribe();

    return () => {
      mounted = false;
      supabase.removeChannel(ch);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [instanceId]);

  return { active, transcripts };
}
