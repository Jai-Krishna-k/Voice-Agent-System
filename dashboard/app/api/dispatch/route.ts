import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { dispatchCall } from "@/lib/dispatch-core";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { phoneNumber, prompt, modelProvider, voice, agentConfigId, lead } = body;

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const result = await dispatchCall({
      userId: user.id,
      phoneNumber,
      prompt,
      modelProvider,
      voice,
      agentConfigId: agentConfigId ?? null,
      lead: lead ?? null,
    });

    if (!result.ok) {
      return NextResponse.json(
        { error: result.error, missing: result.missing },
        { status: result.status ?? 500 }
      );
    }

    return NextResponse.json({
      success: true,
      roomName: result.roomName,
      dispatchId: result.dispatchId,
    });
  } catch (error: any) {
    console.error("Error dispatching call:", error);
    return NextResponse.json(
      { error: error.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
