import { NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase/service";
import { verifyCronBearer } from "@/lib/lead-sources/cron-auth";
import { classifyAndWriteback } from "@/lib/lead-sources/classifier";

export async function POST(req: Request) {
  if (!verifyCronBearer(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const svc = getServiceClient();

  const { data: pending } = await svc
    .from("calls")
    .select("id, call_outcomes(call_id)")
    .not("ended_at", "is", null)
    .gte("ended_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
    .order("ended_at", { ascending: false })
    .limit(50);

  const toClassify = (pending ?? []).filter(
    (c: any) => !c.call_outcomes || c.call_outcomes.length === 0
  );

  const results: any[] = [];
  for (const c of toClassify) {
    const r = await classifyAndWriteback(c.id);
    results.push({ call_id: c.id, ...r });
  }
  return NextResponse.json({ ok: true, processed: results.length, results });
}
