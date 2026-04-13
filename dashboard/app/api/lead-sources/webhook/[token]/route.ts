import { NextRequest, NextResponse } from "next/server";
import { createHash } from "crypto";
import { getServiceClient } from "@/lib/supabase/service";
import { loadSourceByWebhookToken, buildProviderCtx } from "@/lib/lead-sources/context";
import { ingestLeads } from "@/lib/lead-sources/sync";
import { verifyAppsScriptSignature } from "@/lib/lead-sources/google-sheets";
import { hmacSha256Hex, timingSafeEqualHex } from "@/lib/crypto";

async function verifySignature(
  provider: string,
  secret: string,
  req: NextRequest,
  rawBody: string,
  credentials?: Record<string, any>
): Promise<boolean> {
  if (provider === "google_sheets") {
    const sig = req.headers.get("x-signature");
    return verifyAppsScriptSignature(secret, rawBody, sig);
  }

  if (provider === "hubspot") {
    // HubSpot Private App webhooks are signed with the app's client_secret.
    // If the user stored it in credentials, verify HMAC-SHA256.
    // Otherwise, the opaque webhook_token in the URL provides sufficient security.
    const clientSecret = credentials?.client_secret;
    if (!clientSecret) return true; // rely on opaque URL token
    const sig = req.headers.get("x-hubspot-signature-v3");
    const ts = req.headers.get("x-hubspot-request-timestamp");
    if (!sig || !ts) return false;
    if (Date.now() - parseInt(ts, 10) > 5 * 60 * 1000) return false;
    const payload = `${req.method.toUpperCase()}${req.url}${rawBody}${ts}`;
    const expected = hmacSha256Hex(clientSecret, payload);
    return timingSafeEqualHex(sig, expected);
  }

  if (provider === "pipedrive") {
    // Pipedrive signs with the signing token the user sets in webhook settings.
    // We tell users to paste our webhook_secret there.
    const sig = req.headers.get("x-pipedrive-signature");
    if (!sig) return true; // Pipedrive may not sign if no token configured
    const expected = hmacSha256Hex(secret, rawBody);
    return timingSafeEqualHex(sig, expected);
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

  // Build provider ctx once — reused for signature verification and payload parsing
  const { ctx, provider: providerImpl } = await buildProviderCtx(source);
  const ok = await verifySignature(source.provider, source.webhook_secret, req, rawBody, ctx.credentials);
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
    const rawLeads = await providerImpl.parseWebhookPayload(rawBody, ctx);
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
