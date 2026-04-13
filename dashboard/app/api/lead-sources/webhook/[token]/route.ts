import { NextRequest, NextResponse } from "next/server";
import { createHash } from "crypto";
import { getServiceClient } from "@/lib/supabase/service";
import { loadSourceByWebhookToken, buildProviderCtx } from "@/lib/lead-sources/context";
import { ingestLeads } from "@/lib/lead-sources/sync";
import { verifyAppsScriptSignature } from "@/lib/lead-sources/google-sheets";

async function verifySignature(
  provider: string,
  secret: string,
  req: NextRequest,
  rawBody: string
): Promise<boolean> {
  if (provider === "google_sheets") {
    const sig = req.headers.get("x-signature");
    return verifyAppsScriptSignature(secret, rawBody, sig);
  }
  return false;
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const source = await loadSourceByWebhookToken(token);
  if (!source) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const rawBody = await req.text();
  const ok = await verifySignature(source.provider, source.webhook_secret, req, rawBody);
  if (!ok) return NextResponse.json({ error: "Invalid signature" }, { status: 401 });

  const svc = getServiceClient();

  const eventHash = createHash("sha256").update(rawBody).digest("hex");
  const { error: seenErr } = await svc
    .from("lead_source_webhook_seen")
    .insert({ lead_source_id: source.id, event_hash: eventHash });
  if (seenErr && !/duplicate/i.test(seenErr.message)) {
    return NextResponse.json({ error: seenErr.message }, { status: 500 });
  }
  if (seenErr) {
    return NextResponse.json({ ok: true, deduped: true });
  }

  try {
    const { ctx, provider } = await buildProviderCtx(source);
    const rawLeads = await provider.parseWebhookPayload(rawBody, ctx);
    if (rawLeads.length === 0) {
      return NextResponse.json({ ok: true, ingested: 0 });
    }
    const { inserted, skipped } = await ingestLeads(source, rawLeads);

    await svc.from("lead_source_sync_log").insert({
      lead_source_id: source.id,
      started_at: new Date().toISOString(),
      finished_at: new Date().toISOString(),
      trigger: "webhook",
      leads_found: rawLeads.length,
      leads_new: inserted,
      leads_skipped: skipped,
      http_status: 200,
    });

    return NextResponse.json({ ok: true, ingested: inserted, skipped });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Webhook failed" }, { status: 500 });
  }
}
