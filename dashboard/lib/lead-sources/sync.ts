import { getServiceClient } from "@/lib/supabase/service";
import { buildProviderCtx } from "./context";
import { mapRawLead } from "./field-mapper";
import type { LeadSourceRow, RawLead } from "./types";

export interface SyncResult {
  found: number;
  inserted: number;
  skipped: number;
  error?: string;
}

export async function ingestLeads(
  source: LeadSourceRow,
  rawLeads: RawLead[]
): Promise<{ inserted: number; skipped: number; insertedIds: string[] }> {
  const svc = getServiceClient();
  let skipped = 0;
  const insertedIds: string[] = [];
  for (const raw of rawLeads) {
    const norm = mapRawLead(raw, source.field_mapping || {});
    if (!norm.phone) {
      skipped++;
      continue;
    }
    // `.select("id")` combined with `ignoreDuplicates: true` (ON CONFLICT
    // DO NOTHING) returns the row only when a new one was actually inserted;
    // a conflict returns no rows. That's how we distinguish fresh ingests
    // from redelivered webhooks / re-synced sheet rows and, critically, how
    // the caller knows which leads to dispatch (instead of sweeping the
    // whole "status=new" backlog and picking up stale duplicates).
    const { data, error } = await svc
      .from("leads")
      .upsert(
        {
          user_id: source.user_id,
          lead_source_id: source.id,
          external_id: norm.externalId,
          phone: norm.phone,
          name: norm.name,
          email: norm.email,
          raw_fields: { ...norm.raw, __custom: norm.custom },
          status: raw.initialStatus ?? "new",
        },
        { onConflict: "lead_source_id,external_id", ignoreDuplicates: true }
      )
      .select("id");
    if (error) {
      skipped++;
      continue;
    }
    if (data && data.length > 0) {
      insertedIds.push(data[0].id);
    } else {
      skipped++;
    }
  }
  // Retroactively mark any existing new/queued leads as do_not_call if the
  // sheet now has a terminal outcome for them — handles leads already in DB.
  const terminalIds = rawLeads
    .filter((r) => r.initialStatus === "do_not_call")
    .map((r) => r.externalId);
  if (terminalIds.length > 0) {
    await svc
      .from("leads")
      .update({ status: "do_not_call" })
      .eq("lead_source_id", source.id)
      .in("external_id", terminalIds)
      .in("status", ["new", "queued"]);
  }

  return { inserted: insertedIds.length, skipped, insertedIds };
}

export async function runSourceSync(
  source: LeadSourceRow,
  trigger: "cron" | "webhook" | "manual"
): Promise<SyncResult> {
  const svc = getServiceClient();
  const start = new Date();
  try {
    const { ctx, provider } = await buildProviderCtx(source);
    const since = source.last_synced_at ? new Date(source.last_synced_at) : null;
    const rawLeads = await provider.listNewLeads(ctx, since);
    const { inserted, skipped } = await ingestLeads(source, rawLeads);

    await svc
      .from("lead_sources")
      .update({
        last_synced_at: new Date().toISOString(),
        last_error: null,
        consecutive_errors: 0,
        status: "ok",
        updated_at: new Date().toISOString(),
      })
      .eq("id", source.id);

    await svc.from("lead_source_sync_log").insert({
      lead_source_id: source.id,
      started_at: start.toISOString(),
      finished_at: new Date().toISOString(),
      trigger,
      leads_found: rawLeads.length,
      leads_new: inserted,
      leads_skipped: skipped,
      http_status: 200,
    });

    return { found: rawLeads.length, inserted, skipped };
  } catch (e: any) {
    const msg = e?.message || String(e);
    await svc
      .from("lead_sources")
      .update({
        last_error: msg.slice(0, 2000),
        consecutive_errors: (source.consecutive_errors || 0) + 1,
        status: /reauth|refresh_token/i.test(msg) ? "needs_reauth" : "error",
        updated_at: new Date().toISOString(),
      })
      .eq("id", source.id);

    await svc.from("lead_source_sync_log").insert({
      lead_source_id: source.id,
      started_at: start.toISOString(),
      finished_at: new Date().toISOString(),
      trigger,
      leads_found: 0,
      leads_new: 0,
      leads_skipped: 0,
      error: msg.slice(0, 2000),
      http_status: 500,
    });

    return { found: 0, inserted: 0, skipped: 0, error: msg };
  }
}
