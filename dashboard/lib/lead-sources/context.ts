import { getServiceClient } from "@/lib/supabase/service";
import { readCredentials } from "./credentials";
import { getProvider } from "./registry";
import type { LeadSourceProvider, LeadSourceRow, ProviderCtx } from "./types";

export async function loadSourceById(
  sourceId: string,
  userId?: string
): Promise<LeadSourceRow | null> {
  const svc = getServiceClient();
  const query = svc.from("lead_sources").select("*").eq("id", sourceId);
  const { data, error } = userId
    ? await query.eq("user_id", userId).maybeSingle()
    : await query.maybeSingle();
  if (error) throw error;
  return (data as LeadSourceRow) || null;
}

export async function loadSourceByWebhookToken(
  token: string
): Promise<LeadSourceRow | null> {
  const svc = getServiceClient();
  const { data, error } = await svc
    .from("lead_sources")
    .select("*")
    .eq("webhook_token", token)
    .maybeSingle();
  if (error) throw error;
  return (data as LeadSourceRow) || null;
}

export async function buildProviderCtx(source: LeadSourceRow): Promise<{
  ctx: ProviderCtx;
  provider: LeadSourceProvider;
}> {
  const credentials = (await readCredentials(source.user_id, source.credentials_ref)) ?? {};
  const provider = getProvider(source.provider);
  return { ctx: { source, credentials }, provider };
}
