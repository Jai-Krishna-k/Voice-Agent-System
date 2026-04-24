import { NextResponse } from "next/server";
import { writeCredentials } from "@/lib/lead-sources/credentials";
import { getProvider } from "@/lib/lead-sources/registry";
import { verifyState } from "@/lib/lead-sources/oauth-state";
import type { ProviderId } from "@/lib/lead-sources/types";

function redirectUri(): string {
  const base = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL;
  if (!base) throw new Error("NEXT_PUBLIC_APP_URL is not set");
  return `${base.replace(/\/$/, "")}/api/lead-sources/oauth/callback`;
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const stateToken = searchParams.get("state");

  if (!code || !stateToken) {
    return NextResponse.json({ error: "Missing code/state" }, { status: 400 });
  }
  const state = verifyState(stateToken);
  if (!state) {
    return NextResponse.json({ error: "Invalid or expired state" }, { status: 400 });
  }
  const provider = state.provider as ProviderId;

  const impl = getProvider(provider);
  if (!impl.oauthCallback) {
    return NextResponse.json({ error: "Provider has no OAuth callback" }, { status: 400 });
  }
  const creds = await impl.oauthCallback(code, redirectUri());
  const ref = await writeCredentials(state.userId, creds);

  const appUrl = (process.env.NEXT_PUBLIC_APP_URL || "").replace(/\/$/, "");
  const target = `${appUrl}/integrations/${provider}/setup?credentials_ref=${encodeURIComponent(ref)}`;
  return NextResponse.redirect(target);
}
