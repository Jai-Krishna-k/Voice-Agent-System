import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { dispatchSingleLead } from "@/lib/lead-sources/dispatch-leads";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const action = body.action as string | undefined;

  // "dispatch" — call immediately right now
  if (action === "dispatch") {
    const result = await dispatchSingleLead(id, user.id);
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }
    return NextResponse.json({ ok: true, roomName: result.roomName });
  }

  // DB-only status updates
  const update: Record<string, any> = { updated_at: new Date().toISOString() };
  if (action === "retry") {
    update.status = "new";
    update.next_retry_at = new Date().toISOString();
  } else if (action === "do_not_call") {
    update.status = "do_not_call";
    update.next_retry_at = null;
  } else if (action === "reset") {
    update.status = "new";
    update.attempts = 0;
    update.next_retry_at = new Date().toISOString();
  } else {
    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("leads")
    .update(update)
    .eq("id", id)
    .eq("user_id", user.id)
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ lead: data });
}
