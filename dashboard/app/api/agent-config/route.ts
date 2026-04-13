import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// GET /api/agent-config
// Returns all configs for the authenticated user, newest first.
export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data, error } = await supabase
      .from("agent_configs")
      .select("*")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false });

    if (error) throw error;

    return NextResponse.json({ configs: data || [] });
  } catch (error: any) {
    console.error("Error fetching agent configs:", error);
    return NextResponse.json(
      { error: error.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}

// POST /api/agent-config
// Creates a new config. If the user has no configs yet, marks this one active.
export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { system_prompt, greeting, voice_id, model_provider, name } = body;

    // Check if any configs exist — first one becomes active by default
    const { count } = await supabase
      .from("agent_configs")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id);

    const { data, error } = await supabase
      .from("agent_configs")
      .insert({
        user_id: user.id,
        system_prompt,
        greeting,
        voice_id,
        model_provider,
        name: name || "New Agent",
        is_active: (count ?? 0) === 0,
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ config: data });
  } catch (error: any) {
    console.error("Error creating agent config:", error);
    return NextResponse.json(
      { error: error.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}

// PUT /api/agent-config
// Updates an existing config by id. Body: { id, ...fields }.
export async function PUT(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { id, system_prompt, greeting, voice_id, model_provider, name } =
      body;

    if (!id) {
      return NextResponse.json({ error: "Missing id" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("agent_configs")
      .update({
        system_prompt,
        greeting,
        voice_id,
        model_provider,
        name,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .eq("user_id", user.id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ config: data });
  } catch (error: any) {
    console.error("Error updating agent config:", error);
    return NextResponse.json(
      { error: error.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}

// DELETE /api/agent-config?id=<uuid>
// Deletes a config. If the deleted one was active, promotes the most recently
// updated remaining config to active.
export async function DELETE(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Missing id" }, { status: 400 });
    }

    // Grab the row first so we know whether it was active
    const { data: existing } = await supabase
      .from("agent_configs")
      .select("id, is_active")
      .eq("id", id)
      .eq("user_id", user.id)
      .single();

    if (!existing) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const { error: delError } = await supabase
      .from("agent_configs")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);

    if (delError) throw delError;

    // If we just deleted the active one, promote the most recent survivor
    if (existing.is_active) {
      const { data: survivor } = await supabase
        .from("agent_configs")
        .select("id")
        .eq("user_id", user.id)
        .order("updated_at", { ascending: false })
        .limit(1)
        .single();

      if (survivor) {
        await supabase
          .from("agent_configs")
          .update({ is_active: true })
          .eq("id", survivor.id);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error deleting agent config:", error);
    return NextResponse.json(
      { error: error.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
