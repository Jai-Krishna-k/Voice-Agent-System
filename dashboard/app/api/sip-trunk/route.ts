import { NextResponse } from "next/server";
import { sipClient } from "@/lib/server-utils";
import { createClient } from "@/lib/supabase/server";

// POST /api/sip-trunk
// Body: { phoneNumber: "+919876543210" }
// Creates a LiveKit inbound SIP trunk bound to the given DID and persists the
// resulting trunkId to the user's settings under `sip_trunk_id_inbound`.
export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { phoneNumber } = await request.json();
    if (!phoneNumber || typeof phoneNumber !== "string") {
      return NextResponse.json(
        { error: "phoneNumber is required" },
        { status: 400 }
      );
    }

    // Create an inbound trunk scoped to this DID
    const trunk = await sipClient.createSipInboundTrunk(
      "Inbound Trunk",
      [phoneNumber.trim()],
      {
        metadata: JSON.stringify({ created_by: user.id }),
      }
    );

    const trunkId = (trunk as any).sipTrunkId;
    if (!trunkId) {
      return NextResponse.json(
        { error: "LiveKit did not return a trunk id" },
        { status: 500 }
      );
    }

    // Persist to user settings
    const { data: existing } = await supabase
      .from("user_settings")
      .select("id, settings")
      .eq("user_id", user.id)
      .limit(1)
      .single();

    const merged: Record<string, string> = {
      ...(existing?.settings || {}),
      sip_trunk_id_inbound: trunkId,
    };

    if (existing) {
      await supabase
        .from("user_settings")
        .update({
          settings: merged,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existing.id);
    } else {
      await supabase
        .from("user_settings")
        .insert({ user_id: user.id, settings: merged });
    }

    return NextResponse.json({ trunkId, phoneNumber });
  } catch (error: any) {
    console.error("Error creating inbound SIP trunk:", error);
    return NextResponse.json(
      { error: error.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
