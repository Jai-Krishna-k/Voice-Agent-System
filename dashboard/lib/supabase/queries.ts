import { createClient } from "./server";

export async function getCalls(limit = 50) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("calls")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data ?? [];
}

export async function getCallById(id: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("calls")
    .select("*")
    .eq("id", id)
    .single();

  if (error) return null;
  return data;
}

export async function getTranscriptsByCallId(callId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("transcripts")
    .select("*")
    .eq("call_id", callId)
    .order("timestamp_ms", { ascending: true });

  if (error) return [];
  return data ?? [];
}

export async function getCallStats() {
  const supabase = await createClient();

  const { count: totalCalls } = await supabase
    .from("calls")
    .select("*", { count: "exact", head: true });

  const { count: answeredCalls } = await supabase
    .from("calls")
    .select("*", { count: "exact", head: true })
    .in("status", ["answered", "completed"]);

  const { data: durationData } = await supabase
    .from("calls")
    .select("duration_secs")
    .not("duration_secs", "is", null);

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const { count: todayCalls } = await supabase
    .from("calls")
    .select("*", { count: "exact", head: true })
    .gte("created_at", today.toISOString());

  const avgDuration =
    durationData && durationData.length > 0
      ? Math.round(
          durationData.reduce((sum, r) => sum + (r.duration_secs || 0), 0) /
            durationData.length
        )
      : 0;

  const successRate =
    totalCalls && totalCalls > 0
      ? Math.round(((answeredCalls || 0) / totalCalls) * 100)
      : 0;

  return {
    totalCalls: totalCalls || 0,
    answeredCalls: answeredCalls || 0,
    avgDuration,
    successRate,
    todayCalls: todayCalls || 0,
  };
}

export async function getCallsPerDay(days = 14) {
  const supabase = await createClient();
  const since = new Date();
  since.setDate(since.getDate() - days);

  const { data } = await supabase
    .from("calls")
    .select("created_at")
    .gte("created_at", since.toISOString())
    .order("created_at", { ascending: true });

  const counts: Record<string, number> = {};
  for (let i = 0; i < days; i++) {
    const d = new Date();
    d.setDate(d.getDate() - (days - 1 - i));
    counts[d.toISOString().slice(0, 10)] = 0;
  }

  (data ?? []).forEach((row) => {
    const day = new Date(row.created_at).toISOString().slice(0, 10);
    if (counts[day] !== undefined) counts[day]++;
  });

  return Object.entries(counts).map(([date, count]) => ({
    date: new Date(date).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
    }),
    calls: count,
  }));
}

export async function getRecentCalls(limit = 5) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("calls")
    .select("id, phone_number, status, duration_secs, created_at, voice_id")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) return [];
  return data ?? [];
}
