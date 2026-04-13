import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { deleteCredentials } from "@/lib/lead-sources/credentials";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabase
    .from("lead_sources")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { webhook_secret: _ws, ...safe } = data as any;
  return NextResponse.json({ source: safe });
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const allowed = [
    "display_name",
    "config",
    "field_mapping",
    "is_active",
    "polling_enabled",
    "poll_interval_secs",
    "call_window",
    "concurrency_cap",
    "status",
  ];
  const update: Record<string, any> = { updated_at: new Date().toISOString() };
  for (const k of allowed) if (k in body) update[k] = body[k];

  const { data, error } = await supabase
    .from("lead_sources")
    .update(update)
    .eq("id", id)
    .eq("user_id", user.id)
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ source: data });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: existing } = await supabase
    .from("lead_sources")
    .select("credentials_ref")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  const { error } = await supabase
    .from("lead_sources")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  if (existing?.credentials_ref) {
    await deleteCredentials(user.id, existing.credentials_ref).catch(() => {});
  }
  return NextResponse.json({ ok: true });
}
