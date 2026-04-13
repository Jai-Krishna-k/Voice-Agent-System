import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const sourceId = searchParams.get("source");
  const limit = Math.min(parseInt(searchParams.get("limit") || "100", 10) || 100, 500);

  let q = supabase
    .from("leads")
    .select("id, lead_source_id, phone, name, email, status, attempts, outcome_code, next_retry_at, last_called_at, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (status) q = q.eq("status", status);
  if (sourceId) q = q.eq("lead_source_id", sourceId);

  const { data, error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ leads: data ?? [] });
}
