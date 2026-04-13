import { NextResponse } from "next/server";
import { sipClient } from "@/lib/server-utils";
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

    const rules = await sipClient.listSipDispatchRule();

    return NextResponse.json({
      rules: rules.map((r: any) => ({
        id: r.sipDispatchRuleId,
        name: r.name,
        trunkIds: r.trunkIds,
        metadata: r.metadata,
      })),
    });
  } catch (error: any) {
    console.error("Error listing dispatch rules:", error);
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
    const { trunkId } = body;

    if (!trunkId) {
      return NextResponse.json(
        { error: "SIP Trunk ID is required" },
        { status: 400 }
      );
    }

    // Check if a dispatch rule already exists for this trunk
    const existing = await sipClient.listSipDispatchRule({
      trunkIds: [trunkId],
    });

    if (existing && existing.length > 0) {
      return NextResponse.json({
        rule: {
          id: (existing[0] as any).sipDispatchRuleId,
          name: (existing[0] as any).name,
        },
        message: "Dispatch rule already exists for this trunk",
      });
    }

    // Create an individual dispatch rule: each inbound call gets its own room
    const rule = await sipClient.createSipDispatchRule(
      { type: "individual", roomPrefix: "inbound-" },
      {
        name: "Inbound Call Handler",
        trunkIds: [trunkId],
        metadata: JSON.stringify({ created_by: user.id }),
      }
    );

    return NextResponse.json({
      rule: {
        id: (rule as any).sipDispatchRuleId,
        name: (rule as any).name,
      },
      message: "Dispatch rule created successfully",
    });
  } catch (error: any) {
    console.error("Error creating dispatch rule:", error);
    return NextResponse.json(
      { error: error.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
