import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { buildProviderCtx, loadSourceById } from "@/lib/lead-sources/context";
import { autoDetectMapping } from "@/lib/lead-sources/field-mapper";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const source = await loadSourceById(id, user.id);
  if (!source) return NextResponse.json({ error: "Not found" }, { status: 404 });

  try {
    const { ctx, provider } = await buildProviderCtx(source);
    const result = await provider.preview(ctx);
    const suggested = autoDetectMapping(result.columns);
    return NextResponse.json({ ...result, suggested });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Preview failed" }, { status: 500 });
  }
}
