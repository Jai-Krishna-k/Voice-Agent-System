import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// POST /api/agent-config/activate
// Body: { id }
// Deactivates all of the user's configs, then activates the target one.
export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await request.json();

    if (!id) {
      return NextResponse.json({ error: "Missing id" }, { status: 400 });
    }

    // Verify ownership
    const { data: target } = await supabase
      .from("agent_configs")
      .select("id")
      .eq("id", id)
      .eq("user_id", user.id)
      .single();

    if (!target) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // Deactivate everything this user owns
    const { error: deactivateError } = await supabase
      .from("agent_configs")
      .update({ is_active: false })
      .eq("user_id", user.id);

    if (deactivateError) throw deactivateError;

    // Activate the target
    const { data, error } = await supabase
      .from("agent_configs")
      .update({ is_active: true, updated_at: new Date().toISOString() })
      .eq("id", id)
      .eq("user_id", user.id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ config: data });
  } catch (error: any) {
    console.error("Error activating agent config:", error);
    return NextResponse.json(
      { error: error.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
