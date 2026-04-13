import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { writeCredentials } from "@/lib/lead-sources/credentials";

/**
 * POST /api/lead-sources/pipedrive/verify-token
 * Body: { token: string }
 *
 * Verifies a Pipedrive API token by calling /users/me,
 * stores credentials encrypted, returns credentials_ref.
 */
export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const token = String(body.token ?? "").trim();
  if (!token) return NextResponse.json({ error: "token is required" }, { status: 400 });

  // Verify token by calling Pipedrive's /users/me endpoint
  const res = await fetch(`https://api.pipedrive.com/v1/users/me?api_token=${token}`);

  if (res.status === 401 || res.status === 403) {
    return NextResponse.json({ error: "Invalid API token — check your token and try again" }, { status: 400 });
  }
  if (!res.ok) {
    return NextResponse.json({ error: "Could not verify token. Check your API token." }, { status: 400 });
  }

  const data = await res.json();
  const me = data.data ?? {};

  const ref = await writeCredentials(user.id, {
    api_token: token,
    company_domain: me.company_domain ?? null,
    company_name: me.company_name ?? null,
    user_name: me.name ?? null,
  });

  return NextResponse.json({
    ok: true,
    credentials_ref: ref,
    company_name: me.company_name ?? me.company_domain ?? "Pipedrive",
  });
}
