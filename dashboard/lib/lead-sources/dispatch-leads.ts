import { getServiceClient } from "@/lib/supabase/service";
import { dispatchCall } from "@/lib/dispatch-core";
import { isWithinCallWindow } from "./call-window";
import type { LeadSourceRow } from "./types";

export interface DispatchLeadsResult {
  dispatched: number;
  skipped: number;
  errors: { leadId: string; error: string }[];
}

/**
 * Select up to concurrency_cap eligible 'new' leads from this source,
 * check call window, and dispatch each via LiveKit. Used by both the
 * manual sync route and the cron poller so behaviour is identical.
 */
export async function dispatchPendingLeads(
  source: LeadSourceRow,
  limit?: number
): Promise<DispatchLeadsResult> {
  const svc = getServiceClient();
  const now = new Date();
  const result: DispatchLeadsResult = { dispatched: 0, skipped: 0, errors: [] };

  if (!isWithinCallWindow(source.call_window, now)) {
    return result; // outside business hours — don't dispatch
  }

  const cap = limit ?? source.concurrency_cap ?? 3;

  // Fetch eligible leads: status=new, next_retry_at passed or null
  const { data: eligible } = await svc
    .from("leads")
    .select("*")
    .eq("lead_source_id", source.id)
    .eq("status", "new")
    .or(`next_retry_at.is.null,next_retry_at.lte.${now.toISOString()}`)
    .order("created_at", { ascending: true })
    .limit(cap);

  if (!eligible || eligible.length === 0) return result;

  // Fetch the user's active agent config
  const { data: activeAgent } = await svc
    .from("agent_configs")
    .select("id")
    .eq("user_id", source.user_id)
    .eq("is_active", true)
    .maybeSingle();

  for (const lead of eligible) {
    // Re-check call window for each lead in case we crossed the boundary
    if (!isWithinCallWindow(source.call_window)) {
      result.skipped++;
      continue;
    }

    // Optimistic lock: flip to queued only if still new (prevents double-dispatch)
    const { data: claimed } = await svc
      .from("leads")
      .update({
        status: "queued",
        attempts: (lead.attempts ?? 0) + 1,
        last_called_at: now.toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", lead.id)
      .eq("status", "new") // guard — only claim if it hasn't moved
      .select()
      .maybeSingle();

    if (!claimed) {
      result.skipped++;
      continue; // another worker already claimed it
    }

    const dispatchResult = await dispatchCall({
      userId: source.user_id,
      phoneNumber: lead.phone,
      agentConfigId: activeAgent?.id ?? null,
      lead: {
        id: lead.id,
        name: lead.name,
        email: lead.email,
        phone: lead.phone,
        custom: lead.raw_fields?.__custom ?? {},
        raw: lead.raw_fields ?? {},
      },
    });

    if (!dispatchResult.ok) {
      // Roll back status so the lead can be retried
      await svc
        .from("leads")
        .update({
          status: "new",
          attempts: Math.max(0, (lead.attempts ?? 0)),
          next_retry_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", lead.id);

      result.errors.push({ leadId: lead.id, error: dispatchResult.error ?? "unknown" });
    } else {
      result.dispatched++;
    }
  }

  return result;
}

/**
 * Dispatch a single lead immediately regardless of call window.
 * Used by the "Call now" button on the leads page.
 */
export async function dispatchSingleLead(
  leadId: string,
  userId: string
): Promise<{ ok: boolean; error?: string; roomName?: string }> {
  const svc = getServiceClient();

  const { data: lead } = await svc
    .from("leads")
    .select("*")
    .eq("id", leadId)
    .eq("user_id", userId)
    .maybeSingle();

  if (!lead) return { ok: false, error: "Lead not found" };
  if (!lead.phone) return { ok: false, error: "Lead has no phone number" };

  const { data: activeAgent } = await svc
    .from("agent_configs")
    .select("id")
    .eq("user_id", userId)
    .eq("is_active", true)
    .maybeSingle();

  // Mark as queued before dispatching
  await svc
    .from("leads")
    .update({
      status: "queued",
      attempts: (lead.attempts ?? 0) + 1,
      last_called_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", leadId);

  const dispatchResult = await dispatchCall({
    userId,
    phoneNumber: lead.phone,
    agentConfigId: activeAgent?.id ?? null,
    lead: {
      id: lead.id,
      name: lead.name,
      email: lead.email,
      phone: lead.phone,
      custom: lead.raw_fields?.__custom ?? {},
      raw: lead.raw_fields ?? {},
    },
  });

  if (!dispatchResult.ok) {
    // Roll back
    await svc
      .from("leads")
      .update({
        status: "new",
        next_retry_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", leadId);
    return { ok: false, error: dispatchResult.error };
  }

  return { ok: true, roomName: dispatchResult.roomName };
}
