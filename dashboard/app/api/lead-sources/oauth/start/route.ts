import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getProvider } from "@/lib/lead-sources/registry";
import { signState } from "@/lib/lead-sources/oauth-state";
import type { ProviderId } from "@/lib/lead-sources/types";

function redirectUri(provider: string): string {
  const base = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL;
  if (!base) throw new Error("NEXT_PUBLIC_APP_URL is not set");
  return `${base.replace(/\/$/, "")}/api/lead-sources/oauth/callback?provider=${provider}`;
}

export async function GET(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const provider = (searchParams.get("provider") || "google_sheets") as ProviderId;
  const impl = getProvider(provider);
  if (!impl.oauthStart) {
    return NextResponse.json({ error: "Provider does not support OAuth" }, { status: 400 });
  }
  const state = signState({ userId: user.id, provider });
  const url = impl.oauthStart(state, redirectUri(provider));
  return NextResponse.redirect(url);
}
