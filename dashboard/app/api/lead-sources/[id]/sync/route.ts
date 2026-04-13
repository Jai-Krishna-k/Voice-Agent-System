import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { loadSourceById } from "@/lib/lead-sources/context";
import { runSourceSync } from "@/lib/lead-sources/sync";
import { dispatchPendingLeads } from "@/lib/lead-sources/dispatch-leads";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const source = await loadSourceById(id, user.id);
  if (!source) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Step 1: pull new leads from the source into the DB
  const syncResult = await runSourceSync(source, "manual");
  if (syncResult.error) {
    return NextResponse.json({ error: syncResult.error, ...syncResult }, { status: 500 });
  }

  // Step 2: dispatch any eligible leads immediately
  // Re-fetch so we have updated last_synced_at
  const fresh = await loadSourceById(id, user.id);
  const dispatchResult = fresh
    ? await dispatchPendingLeads(fresh)
    : { dispatched: 0, skipped: 0, errors: [] };

  return NextResponse.json({
    ...syncResult,
    dispatched: dispatchResult.dispatched,
    dispatch_skipped: dispatchResult.skipped,
    dispatch_errors: dispatchResult.errors,
  });
}
