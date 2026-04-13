import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getServiceClient } from "@/lib/supabase/service";
import { APPS_SCRIPT_TEMPLATE } from "@/lib/lead-sources/google-sheets";

export async function GET(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new NextResponse("Unauthorized", { status: 401 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return new NextResponse("Missing id", { status: 400 });

  const svc = getServiceClient();
  const { data } = await svc
    .from("lead_sources")
    .select("user_id, webhook_token, webhook_secret")
    .eq("id", id)
    .maybeSingle();
  if (!data || data.user_id !== user.id) {
    return new NextResponse("Not found", { status: 404 });
  }

  const base = (process.env.NEXT_PUBLIC_APP_URL || "").replace(/\/$/, "");
  const url = `${base}/api/lead-sources/webhook/${data.webhook_token}`;
  const script = APPS_SCRIPT_TEMPLATE.replace("__WEBHOOK_URL__", url).replace(
    "__WEBHOOK_SECRET__",
    data.webhook_secret
  );

  return new NextResponse(script, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Content-Disposition": `attachment; filename="aryantra-webhook.gs"`,
    },
  });
}
