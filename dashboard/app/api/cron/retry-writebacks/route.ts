import { NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase/service";
import { verifyCronBearer } from "@/lib/lead-sources/cron-auth";
import { buildProviderCtx, loadSourceById } from "@/lib/lead-sources/context";

export async function POST(req: Request) {
  if (!verifyCronBearer(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const svc = getServiceClient();

  const { data: failing } = await svc
    .from("call_outcomes")
    .select("call_id, lead_id, outcome_code, sentiment, captured_fields, summary, follow_up_at, writeback_attempts, classifier_confidence")
    .in("writeback_status", ["pending", "failed"])
    .lt("writeback_attempts", 5)
    .limit(25);

  const results: any[] = [];
  for (const row of failing ?? []) {
    if (!row.lead_id) {
      await svc
        .from("call_outcomes")
        .update({ writeback_status: "skipped" })
        .eq("call_id", row.call_id);
      continue;
    }
    const { data: lead } = await svc
      .from("leads")
      .select("external_id, lead_source_id")
      .eq("id", row.lead_id)
      .maybeSingle();
    if (!lead) continue;
    const source = await loadSourceById(lead.lead_source_id);
    if (!source) continue;
    try {
      const { ctx, provider } = await buildProviderCtx(source);
      const captured =
        (row.classifier_confidence ?? 0) >= 0.7 ? row.captured_fields ?? {} : {};
      await provider.markLeadCalled(ctx, lead.external_id, {
        outcome: row.outcome_code as any,
        summary: row.summary || "",
        sentiment: row.sentiment || "neutral",
        capturedFields: captured,
        followUpAt: row.follow_up_at,
      });
      await svc
        .from("call_outcomes")
        .update({
          writeback_status: "done",
          writeback_attempts: (row.writeback_attempts ?? 0) + 1,
          updated_at: new Date().toISOString(),
        })
        .eq("call_id", row.call_id);
      results.push({ call_id: row.call_id, ok: true });
    } catch (e: any) {
      await svc
        .from("call_outcomes")
        .update({
          writeback_status: "failed",
          writeback_attempts: (row.writeback_attempts ?? 0) + 1,
          writeback_last_error: (e?.message || String(e)).slice(0, 2000),
          updated_at: new Date().toISOString(),
        })
        .eq("call_id", row.call_id);
      results.push({ call_id: row.call_id, ok: false, error: e?.message });
    }
  }
  return NextResponse.json({ ok: true, processed: results.length, results });
}
