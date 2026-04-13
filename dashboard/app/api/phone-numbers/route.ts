import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Fetch phone numbers with joined agent config name
    const { data, error } = await supabase
      .from("phone_numbers")
      .select(
        "id, phone_number, agent_config_id, is_active, created_at, agent_configs(name)"
      )
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) throw error;

    const phoneNumbers = (data ?? []).map((row: any) => ({
      id: row.id,
      phone_number: row.phone_number,
      agent_config_id: row.agent_config_id,
      agent_config_name: row.agent_configs?.name || "Unassigned",
      is_active: row.is_active,
      created_at: row.created_at,
    }));

    return NextResponse.json({ phoneNumbers });
  } catch (error: any) {
    console.error("Error fetching phone numbers:", error);
    return NextResponse.json(
      { error: error.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}

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
    const { phone_number, agent_config_id } = body;

    if (!phone_number) {
      return NextResponse.json(
        { error: "Phone number is required" },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("phone_numbers")
      .upsert(
        {
          user_id: user.id,
          phone_number,
          agent_config_id: agent_config_id || null,
          is_active: true,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id,phone_number" }
      )
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ phoneNumber: data });
  } catch (error: any) {
    console.error("Error saving phone number:", error);
    return NextResponse.json(
      { error: error.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}

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
      return NextResponse.json(
        { error: "Missing phone number ID" },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from("phone_numbers")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error deleting phone number:", error);
    return NextResponse.json(
      { error: error.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
