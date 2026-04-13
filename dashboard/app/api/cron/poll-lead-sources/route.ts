import { NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase/service";
import { verifyCronBearer } from "@/lib/lead-sources/cron-auth";
import { runSourceSync } from "@/lib/lead-sources/sync";
import { dispatchPendingLeads } from "@/lib/lead-sources/dispatch-leads";
import type { LeadSourceRow } from "@/lib/lead-sources/types";

export async function POST(req: Request) {
  if (!verifyCronBearer(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const svc = getServiceClient();

  const { data: sources } = await svc
    .from("lead_sources")
    .select("*")
    .eq("is_active", true)
    .eq("polling_enabled", true)
    .in("status", ["ok", "error"]);

  const report: any[] = [];
  const now = new Date();

  for (const src of (sources ?? []) as LeadSourceRow[]) {
    // Check if this source is due for a poll
    const dueAt = src.last_synced_at
      ? new Date(src.last_synced_at).getTime() + src.poll_interval_secs * 1000
      : 0;
    if (dueAt > now.getTime()) continue;
    if (src.consecutive_errors >= 4) continue;

    const syncResult = await runSourceSync(src, "cron");
    const dispatchResult = await dispatchPendingLeads(src);

    report.push({
      source_id: src.id,
      ...syncResult,
      dispatched: dispatchResult.dispatched,
      dispatch_errors: dispatchResult.errors,
    });
  }

  return NextResponse.json({ ok: true, processed: report.length, report });
}
