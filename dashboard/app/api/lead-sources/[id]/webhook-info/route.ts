import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getServiceClient } from "@/lib/supabase/service";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const svc = getServiceClient();
  const { data, error } = await svc
    .from("lead_sources")
    .select("user_id, webhook_token, webhook_secret")
    .eq("id", id)
    .maybeSingle();
  if (error || !data) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (data.user_id !== user.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const base = (process.env.NEXT_PUBLIC_APP_URL || "").replace(/\/$/, "");
  return NextResponse.json({
    url: `${base}/api/lead-sources/webhook/${data.webhook_token}`,
    secret: data.webhook_secret,
  });
}
