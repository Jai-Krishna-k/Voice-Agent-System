import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { randomToken } from "@/lib/crypto";
import { listProviders, isProviderImplemented } from "@/lib/lead-sources/registry";
import { readCredentials } from "@/lib/lead-sources/credentials";
import type { ProviderId } from "@/lib/lead-sources/types";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabase
    .from("lead_sources")
    .select("id, provider, display_name, status, is_active, polling_enabled, last_synced_at, last_error, consecutive_errors, config, field_mapping, call_window, concurrency_cap, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ sources: data ?? [], available: listProviders() });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const provider = body.provider as ProviderId;
  const displayName = String(body.display_name || body.displayName || "").trim();
  const credentialsRef = String(body.credentials_ref || "").trim();

  if (!provider || !listProviders().includes(provider)) {
    return NextResponse.json({ error: "Invalid provider" }, { status: 400 });
  }
  if (!isProviderImplemented(provider)) {
    return NextResponse.json({ error: `Provider not yet available: ${provider}` }, { status: 400 });
  }
  if (!displayName) {
    return NextResponse.json({ error: "display_name required" }, { status: 400 });
  }
  if (!credentialsRef) {
    return NextResponse.json({ error: "credentials_ref required (run OAuth first)" }, { status: 400 });
  }

  // For HubSpot: pull portal metadata out of the stored credentials
  // so the config always has hub_id / hub_domain for display purposes.
  let config = body.config ?? {};
  if (provider === "hubspot") {
    try {
      const creds = await readCredentials(user.id, credentialsRef);
      if (creds) {
        config = {
          hub_id: creds.hub_id ?? null,
          hub_domain: creds.hub_domain ?? null,
          user_email: creds.user_email ?? null,
          ...config,
        };
      }
    } catch {
      // non-fatal — portal info is cosmetic
    }
  }

  const { data, error } = await supabase
    .from("lead_sources")
    .insert({
      user_id: user.id,
      provider,
      display_name: displayName,
      credentials_ref: credentialsRef,
      config,
      field_mapping: body.field_mapping ?? {},
      webhook_token: randomToken(24),
      webhook_secret: randomToken(32),
      call_window: body.call_window ?? {
        tz: "Asia/Kolkata",
        days: [1, 2, 3, 4, 5],
        start: "09:00",
        end: "21:00",
      },
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ source: data });
}
