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
): Promise<{ inserted: number; skipped: number }> {
  const svc = getServiceClient();
  let inserted = 0;
  let skipped = 0;
  for (const raw of rawLeads) {
    const norm = mapRawLead(raw, source.field_mapping || {});
    if (!norm.phone) {
      skipped++;
      continue;
    }
    const { error } = await svc.from("leads").upsert(
      {
        user_id: source.user_id,
        lead_source_id: source.id,
        external_id: norm.externalId,
        phone: norm.phone,
        name: norm.name,
        email: norm.email,
        raw_fields: { ...norm.raw, __custom: norm.custom },
        status: "new",
      },
      { onConflict: "lead_source_id,external_id", ignoreDuplicates: true }
    );
    if (error) {
      skipped++;
      continue;
    }
    inserted++;
  }
  return { inserted, skipped };
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
