import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { writeCredentials } from "@/lib/lead-sources/credentials";

/**
 * POST /api/lead-sources/hubspot/verify-token
 * Body: { token: string }
 *
 * Verifies a HubSpot Private App token by calling the token info endpoint,
 * stores the credentials encrypted, and returns a credentials_ref for the setup page.
 */
export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const token = String(body.token ?? "").trim();
  if (!token) return NextResponse.json({ error: "token is required" }, { status: 400 });

  // Verify the token by hitting the HubSpot token info endpoint
  const infoRes = await fetch(`https://api.hubapi.com/oauth/v1/access-tokens/${token}`);

  if (infoRes.status === 401 || infoRes.status === 403) {
    return NextResponse.json({ error: "Invalid token — check the token and try again" }, { status: 400 });
  }

  // Private app tokens return 200 with token info, or we can verify by calling the account details API
  // Try both approaches — some private app tokens may not work with the oauth endpoint
  let hubDomain: string | null = null;
  let hubId: string | null = null;

  if (infoRes.ok) {
    const info = await infoRes.json();
    hubDomain = info.hub_domain ?? null;
    hubId = String(info.hub_id ?? "");
  } else {
    // Fallback: verify by calling /account-info/v3/details
    const accountRes = await fetch("https://api.hubapi.com/account-info/v3/details", {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!accountRes.ok) {
      return NextResponse.json(
        { error: "Could not verify token. Make sure it has the required scopes." },
        { status: 400 }
      );
    }
    const account = await accountRes.json();
    hubDomain = account.portalId ? `portal-${account.portalId}` : null;
    hubId = String(account.portalId ?? "");
  }

  // Store credentials encrypted in user_settings
  const ref = await writeCredentials(user.id, {
    // Private App token — does not expire, no refresh needed
    access_token: token,
    token_type: "private_app",
    hub_id: hubId,
    hub_domain: hubDomain,
  });

  return NextResponse.json({
    ok: true,
    credentials_ref: ref,
    portal_name: hubDomain ?? (hubId ? `Portal ${hubId}` : "HubSpot"),
  });
}
