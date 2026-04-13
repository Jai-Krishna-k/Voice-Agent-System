import { NextResponse } from "next/server";
import { sipClient } from "@/lib/server-utils";
import { createClient } from "@/lib/supabase/server";

// GET /api/sip-diagnose
// Returns a snapshot of the user's inbound SIP configuration:
//   - LiveKit inbound trunks (all, since they aren't user-scoped)
//   - LiveKit dispatch rules (all)
//   - phone_numbers mapped to agent configs (this user only)
export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // LiveKit inbound trunks
    let inboundTrunks: any[] = [];
    try {
      const raw = await sipClient.listSipInboundTrunk();
      inboundTrunks = (raw || []).map((t: any) => ({
        sipTrunkId: t.sipTrunkId,
        name: t.name,
        numbers: t.numbers || [],
      }));
    } catch (e) {
      console.warn("listSipInboundTrunk failed", e);
    }

    // LiveKit dispatch rules
    let dispatchRules: any[] = [];
    try {
      const raw = await sipClient.listSipDispatchRule();
      dispatchRules = (raw || []).map((r: any) => ({
        sipDispatchRuleId: r.sipDispatchRuleId,
        name: r.name,
        trunkIds: r.trunkIds || [],
      }));
    } catch (e) {
      console.warn("listSipDispatchRule failed", e);
    }

    // Phone-number mappings for this user (with config name via join)
    const { data: phoneRows } = await supabase
      .from("phone_numbers")
      .select("id, phone_number, is_active, agent_config_id, agent_configs(name)")
      .eq("user_id", user.id);

    const phoneNumbers = (phoneRows || []).map((p: any) => ({
      id: p.id,
      phone_number: p.phone_number,
      is_active: p.is_active,
      agent_config_id: p.agent_config_id,
      agent_config_name: p.agent_configs?.name || null,
    }));

    return NextResponse.json({
      inboundTrunks,
      dispatchRules,
      phoneNumbers,
    });
  } catch (error: any) {
    console.error("Error diagnosing SIP:", error);
    return NextResponse.json(
      { error: error.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
